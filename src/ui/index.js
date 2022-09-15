import {
    farsiNumber,
    notify,
    jitterPreventedVersion,
    copyToClipboard,
    getTextContent,
    setTokenizedText,
    soon,
    getCursorLineAndPos,
    urlQueries2Json
} from "./lib/common";
import { CommunityAPI } from "./lib/api";
import BindHandler from "./lib/bindhandler";
import DropDown from "./lib/dropdown";
import Button from "./lib/button";
import TransSrc from "./lib/trans-src";
import Slider from "./lib/slider";
import TextAd from "./lib/textads";
import ToolButton from "./lib/toolbutton";
import Translation from "./lib/translation";

let ENGINE_CLASS_TITLE = {
    informal: "محاوره"
};

// Global application values
BindHandler.addItem("srcLang", BindHandler.availableSrcLangs[0]);
BindHandler.addItem("srcType", BindHandler.availableSrcTypes[0]);
BindHandler.addItem("tgtLang", BindHandler.availableTgtLangs[0]);
BindHandler.addItem("srcText", "");

BindHandler.addItem("proposingNewTranslationMode", false);

// Component setup
const SELECTOR_TO_COMPONENT_MAP = {
    "div#content div.header div.dropdown": DropDown, //TODO
    "div#content div.header div.button": Button,
    'div#content div.src div.content[contenteditable="true"]': TransSrc,
    "div#content div.ads div.slider": Slider,
    "div#content div.ads div.text": TextAd,
    "a.toolbar-button": ToolButton
};

for (var selector in SELECTOR_TO_COMPONENT_MAP) {
    [].forEach.call(document.querySelectorAll(selector), e =>
        SELECTOR_TO_COMPONENT_MAP[selector].applyTo(e)
    );
}

// Application logic
class TargomanWebUiApp {
    constructor() {
        this.automaticTranslationTimeout = null;

        this.handleSourceTextChange = this.handleSourceTextChange.bind(this);
        this.handleSourceLangChange = this.handleSourceLangChange.bind(this);
        this.handleSourceTypeChange = this.handleSourceTypeChange.bind(this);
        this.handleTargetLangChange = this.handleTargetLangChange.bind(this);
        this.handleHoverOverPhrases = this.handleHoverOverPhrases.bind(this);
        this.translate = this.translate.bind(this);

        this.srcContentDiv = document.querySelector(
            'div#content div.src div.content[contenteditable="true"]'
        );
        this.tgtContentDiv = document.querySelector(
            "div#content div.tgt div.content"
        );

        this.srcDropdownDiv = document.querySelector(
            'div.dropdown[data-bind-to="srcLang"]'
        );
        this.srcTypeDropdownDiv = document.querySelector(
            'div.dropdown[data-bind-to="srcType"]'
        );
        this.tgtDropdownDiv = document.querySelector(
            'div.dropdown[data-bind-to="tgtLang"]'
        );

        this.metadataDiv = document.querySelector("div#content div.metadata");
        this.engineInfoDiv = document.querySelector(".engine-info.time");

        this.dicResults = document.querySelector("div#content div.dic-result");
        this.dicResultsMeaning = this.dicResults.querySelector("p.mean");
        this.dicResultsRelWords = this.dicResults.querySelector(".relword ul");
        this.dicResultsVC = this.dicResults.querySelector(".vocabcoding a");
        this.dicResultsSynonyms = this.dicResults.querySelector(".synonym table");
        this.dicResultsAntonyms = this.dicResults.querySelector(".antonym table");
        this.dicResultsRelExps = this.dicResults.querySelector(".relexp ul");
        this.dicResultsExamples = this.dicResults.querySelector(".examples ul");
        this.dicResultsShowMore = this.dicResults.querySelector("div.show-more");
        this.dicPronounce = this.dicResults.querySelector("div.pron")

        this.usageReportDiv = document.querySelector(
            "div#content div.src div.usage-report"
        );
        this.busyDiv = document.querySelector(".translator-busy.busy");

        this.srcContentDiv.handler.maxLength = 5000;

        this.setUsedCharacters(0);

        this.setCallbacks();
        this.registerActions();
        this.registerChangeHandlers();

        document.body.classList.remove("nojs");
        if (
            document.cookie.replace(
                /(?:(?:^|.*;\s*)hideMobileOverlay\s*\=\s*([^;]*).*$)|^.*$/,
                "$1"
            ) !== "true"
        )
            document
                .querySelector("div#mobile_overlay")
                .classList.add("visible");

        document
            .querySelector("div#mobile_overlay a.hide-on-click")
            .addEventListener("click", e => {
                document
                    .querySelector("div#mobile_overlay")
                    .classList.remove("visible");
                let now = new Date();
                now.setTime(now.getTime() + 1000 * 60 * 60 * 24 * 3);
                document.cookie = `hideMobileOverlay=true;expires=${now.toGMTString()}`;
            });
        if (urlQueries2Json().txt)
            setTimeout(() => {
                BindHandler.setItemValue('srcText', urlQueries2Json().txt);
            }, 500)
        if (window.location.hash.length > 1) {
            if (window.location.hash.startsWith('#!/g/'))
                BindHandler.setItemValue('srcText', decodeURIComponent(
                    window.location.hash.substr('#!/g/en/'.length)
                ))
            else
                BindHandler.setItemValue('srcText', decodeURIComponent(
                    window.location.hash.substr(1)
                ))
        }


        window.onhashchange =
            () => BindHandler.setItemValue('srcText', decodeURIComponent(window.location.hash.substr(1)))
    }

    clearSource() {
        BindHandler.setItemValue("srcText", "");
        soon(() => this.makeSourceAndTargetSameHeight());
    }

    copyTranslationResult() {
        if (getTextContent(this.tgtContentDiv).trim() === "")
            notify("هشدار", "متنی برای نسخه‌برداری وجود ندارد!", "warn");
        else copyToClipboard(getTextContent(this.tgtContentDiv));
    }

    voteTranslation(up) {
        CommunityAPI.addAnonymousVote(
            "ssid",
            BindHandler.srcText,
            getTextContent(this.tgtContentDiv).trim(),
            up ? "G" : "B"
        )
            .then(r => {
                notify("سپاس", "نظر شما با موفقیت به ثبت رسید.", "success");
            })
            .catch(e => {
                notify("خطا", "با پوزش، ثبت نظر شما با خطا مواجه شد.", "error");
            });
    }

    voteUpTranslation() {
        this.voteTranslation(true);
    }

    voteDownTranslation() {
        this.voteTranslation(false);
    }

    proposeNewTranslation() {
        this.tgtContentDiv.contentBeforeProposition = this.tgtContentDiv.innerHTML;
        BindHandler.setItemValue("proposingNewTranslationMode", true);
    }

    acceptNewTranslation() {
        CommunityAPI.saveSuggestion(
            "ssid",
            this.translationDirection,
            BindHandler.srcText,
            getTextContent(this.tgtContentDiv).trim()
        )
            .then(r => {
                notify("سپاس", "پیشنهاد شما با موفقیت ثبت شد.", "success");
                BindHandler.setItemValue("proposingNewTranslationMode", false);
            })
            .catch(e => {
                notify(
                    "خطا",
                    "متاسفانه ثبت پیشنهاد شما با خطا مواجه شد.",
                    "error"
                );
            });
    }

    cancelNewTranslation() {
        this.tgtContentDiv.innerHTML = this.tgtContentDiv.contentBeforeProposition;
        BindHandler.setItemValue("proposingNewTranslationMode", false);
    }

    handleHoverOverPhrases(e) {
        let clearPhraseHighlight = jitterPreventedVersion(() =>
            [].forEach.call(
                document.querySelectorAll(
                    "div#content div.content span.phrase-token"
                ),
                e => e.classList.remove("hi")
            )
        );

        let highlightPhrase = jitterPreventedVersion((parIndex, phraseIndex) =>
            [].forEach.call(
                document.querySelectorAll(
                    `div#content div.content span[data-par-index="${parIndex}"][data-phrase-index="${phraseIndex}"]`
                ),
                e => e.classList.add("hi")
            )
        );

        if (e.type.toLowerCase() === "mouseenter") {
            if (
                e.target.nodeName === "SPAN" &&
                e.target.classList.contains("phrase-token")
            )
                highlightPhrase(
                    e.target.dataset.parIndex,
                    e.target.dataset.phraseIndex
                );
            else clearPhraseHighlight();
        } else {
            clearPhraseHighlight();
        }
    }

    setCallbacks() {
        document.addEventListener(
            "mouseenter",
            this.handleHoverOverPhrases,
            true
        );
        document.addEventListener(
            "mouseleave",
            this.handleHoverOverPhrases,
            true
        );
        [].forEach.call(
            document.querySelectorAll(".engine-desc,.engine-info"),
            e => {
                e.addEventListener("transitionend", e => {
                    if (e.target.style.opacity == 0)
                        e.target.style.display = "";
                });
            }
        );
        document.addEventListener(
            "click",
            e => {
                if (
                    e.target === this.metadataDiv.querySelector("span.engine")
                ) {
                    let desc = document.querySelector(
                        `.engine-desc.${e.target.dataset.class}`
                    );
                    if (desc) {
                        desc.style.display = "block";
                        soon(() => {
                            desc.style.opacity = 1;
                        });
                    }
                    return;
                }

                if (
                    e.target ===
                    this.metadataDiv.querySelector("span.translation-time")
                ) {
                    let desc = document.querySelector(".engine-info.time");
                    if (desc) {
                        desc.style.display = "block";
                        soon(() => {
                            desc.style.opacity = 1;
                        });
                    }
                    return;
                }

                soon(() => {
                    [].forEach.call(
                        document.querySelectorAll(".engine-desc,.engine-info"),
                        e => {
                            e.style.opacity = 0;
                        }
                    );
                });
            },
            true
        );
        [].forEach.call(
            document.querySelectorAll("div.show-more > div.arrow"),
            e => {
                e.addEventListener("click", e => {
                    let parent = e.target.parentElement.parentElement,
                        elem = e.target;
                    if (elem.classList.contains("down")) {
                        parent.classList.add("full");
                        elem.classList.remove("down");
                    } else {
                        parent.classList.remove("full");
                        elem.classList.add("down");
                    }
                });
            }
        );
        this.srcContentDiv.addEventListener("input", () =>
            soon(this.makeSourceAndTargetSameHeight.bind(this))
        );
    }

    setUsedCharacters(value) {
        this.usageReportDiv.textContent = `${farsiNumber(value)}/${farsiNumber(
            this.srcContentDiv.handler.maxLength
        )}`;
        this.usageReportDiv.style.color =
            value >= 0.7 * this.srcContentDiv.handler.maxLength ? "red" : "";
    }

    registerActions() {
        BindHandler.registerAction("translate", this.translate.bind(this));
        BindHandler.registerAction("clearSource", this.clearSource.bind(this));
        BindHandler.registerAction(
            "copyTranslationResult",
            this.copyTranslationResult.bind(this)
        );
        BindHandler.registerAction(
            "voteUpTranslation",
            this.voteUpTranslation.bind(this)
        );
        BindHandler.registerAction(
            "voteDownTranslation",
            this.voteDownTranslation.bind(this)
        );
        BindHandler.registerAction(
            "proposeNewTranslation",
            this.proposeNewTranslation.bind(this)
        );
        BindHandler.registerAction(
            "acceptNewTranslation",
            this.acceptNewTranslation.bind(this)
        );
        BindHandler.registerAction(
            "cancelNewTranslation",
            this.cancelNewTranslation.bind(this)
        );
    }

    handleSourceLangChange(value) {
        this.srcContentDiv.style.direction = value.direction;
        if (!value.translatesTo(BindHandler.tgtLang)) {
            for (var lang of BindHandler.availableTgtLangs)
                if (value.translatesTo(lang)) {
                    BindHandler.setItemValue("tgtLang", lang);
                    break;
                }
        }
        this.tgtDropdownDiv.handler.enableItems(lang =>
            value.translatesTo(lang)
        );

        let allowedClasses = value.allowedClasses(value);
        if (allowedClasses && !Array.isArray(allowedClasses))
            allowedClasses = allowedClasses(value)
        this.srcTypeDropdownDiv.handler.enableItems(type => allowedClasses && allowedClasses.includes(type.code))
        this.translate();
    }

    handleSourceTypeChange(value) {
        /*        this.srcContentDiv.style.direction = value.direction;
                if (!value.translatesTo(BindHandler.tgtLang)) {
                    for (var lang of BindHandler.availableTgtLangs)
                        if (value.translatesTo(lang)) {
                            BindHandler.setItemValue("tgtLang", lang);
                            break;
                        }
                }
                this.tgtDropdownDiv.handler.enableItems(lang =>
                    value.translatesTo(lang)
                );*/
        this.translate();
    }

    handleTargetLangChange(value) {
        this.tgtContentDiv.style.direction = value.direction;
        if (!value.translatesFrom(BindHandler.srcLang)) {
            for (var lang of BindHandler.availableTgtLangs)
                if (!lang.detected && value.translatesFrom(lang)) {
                    BindHandler.setItemValue("srcLang", lang);
                    break;
                }
        }
        this.srcDropdownDiv.handler.enableItems(lang =>
            value.translatesFrom(lang)
        );
        this.translate();
    }

    makeSourceAndTargetSameHeight() {
        function makeInvisibleClone(node) {
            let clone = node.cloneNode(true);
            clone.style.position = "fixed";
            clone.style.left = "-9999px";
            clone.style.width = `${node.getBoundingClientRect().width}px`;
            clone.style.height = 0;
            node.parentElement.appendChild(clone);
            return clone;
        }
        clearTimeout(this.makeSourceAndTargetSameHeightTimeout);
        this.makeSourceAndTargetSameHeightTimeout = setTimeout(() => {
            let nodes = [this.srcContentDiv, this.tgtContentDiv];
            let clones = nodes.map(e => makeInvisibleClone(e));
            soon(() => {
                let height = `${Math.max.apply(
                    null,
                    clones.map(e => e.scrollHeight)
                )}px`;
                for (let node of nodes) node.style.height = height;
                for (let clone of clones)
                    clone.parentElement.removeChild(clone);
                clones = null;
            });
        }, 100);
    }

    registerChangeHandlers() {
        BindHandler.registerChangeHandler(
            "srcText",
            this.handleSourceTextChange
        );
        BindHandler.registerChangeHandler(
            "srcLang",
            this.handleSourceLangChange
        );
        BindHandler.registerChangeHandler(
            "srcType",
            this.handleSourceTypeChange
        );
        BindHandler.registerChangeHandler(
            "tgtLang",
            this.handleTargetLangChange
        );
        BindHandler.registerChangeHandler(
            "proposingNewTranslationMode",
            value => {
                if (value) {
                    this.tgtContentDiv.setAttribute("contenteditable", true);
                    this.tgtContentDiv.focus();
                } else this.tgtContentDiv.removeAttribute("contenteditable");
            }
        );
    }

    handleSourceTextChange(value) {
        if (BindHandler.srcLang.updateDetectedLanguage)
            BindHandler.srcLang.updateDetectedLanguage(value);
        this.setUsedCharacters(BindHandler.srcText.length);
        clearTimeout(this.automaticTranslationTimeout);
        this.automaticTranslationTimeout = setTimeout(() => {
            BindHandler.act("translate");
        }, 1000);
        this.minifyBoxes(false);
        if (BindHandler.srcText === '') {
            document.querySelector(
                "div#content div.ads div.graphical"
            ).style.display = "";
        }
        document.title = "ترگمان - ترجمه آنلاین و رایگان فارسی به انگلیسی و انگلیسی به فارسی";
        history.pushState({},
            "ترگمان - ترجمه آنلاین و رایگان فارسی به انگلیسی و ترجمه انگلیسی به فارسی",
            `/`);
    }
    informBusyState(busy) {
        this.busyDiv.style.display = busy ? "block" : "";
    }

    updateSourceContentWithTokenizedText(translationResult) {
        if (!translationResult) {
            this.srcContentDiv.handler.updateContentWithTokenizedText(null);
            return;
        }
        this.srcContentDiv.handler.updateContentWithTokenizedText(
            translationResult.map(parData => {
                if (!parData) return null;
                let source = parData[0],
                    sourceIndex = 0;
                let result = [];
                let parts = parData[2]
                    .filter(e => e[3])
                    .slice(0)
                    .sort((a, b) => a[0][0] - b[0][0]);
                for (var e of parts) {
                    let start = e[0][0],
                        end = e[0][1],
                        phraseIndex = e[2];
                    if (start > sourceIndex)
                        result.push([source.substring(sourceIndex, start)]);
                    result.push([source.substring(start, end), phraseIndex]);
                    sourceIndex = end;
                }
                if (sourceIndex < source.length)
                    result.push([source.substring(sourceIndex)]);
                return result;
            })
        );
    }

    updateTargetContentWithTokenizedText(translationResult) {
        if (!translationResult) {
            setTokenizedText(this.tgtContentDiv, null);
            return;
        }
        let tokenizationResult = translationResult.map(parData => {
            if (parData === null) return null;
            let target = parData[1],
                targetIndex = 0;
            let result = [];
            let parts = parData[2].slice(0).sort((a, b) => a[1][0] - b[1][0]);
            for (var e of parts) {
                let start = e[1][0],
                    end = e[1][1],
                    phraseIndex = e[2];
                if (start > targetIndex)
                    result.push([target.substring(targetIndex, start)]);
                result.push([target.substring(start, end), phraseIndex]);
                targetIndex = end;
            }
            return result;
        });
        setTokenizedText(this.tgtContentDiv, tokenizationResult);
        this.makeSourceAndTargetSameHeight();
    }

    updateDicResults(text, dicResult) {
        const lang = Translation.detectLanguage(text);
        let mainDirection = lang.direction,
            revDirection = mainDirection === "ltr" ? "rtl" : "ltr";
        const createEl = (type, klass, content = '') => {
            const el = document.createElement(type);
            if (klass) el.classList.add(klass)
            el.innerHTML = content;
            return el;
        }
        const createLi = (klass, content) => createEl('li', klass, content)
        const createTd = (klass, content) => createEl('td', klass, content)

        const wordLink = (word) => `<a href="${window.location.href}#${word}">${word}</a>`
        const wordsLink = (words) => words.map(wordLink)
        const fillTableItems = (e, items, dir) => {
            [].forEach.call(e.querySelectorAll("tr:not(:first-child)"), e =>
                e.parentElement.removeChild(e)
            );
            let i = 1;
            for (const word in items) {
                for (var pos in items[word]) {
                    ++i
                    const tr = document.createElement("TR");
                    tr.classList.add(i % 2 ? 'even' : 'odd');
                    tr.appendChild(createTd(dir === 'rtl' ? 'ltr' : 'rtl', wordLink(word)))
                    tr.appendChild(createTd('', pos))
                    tr.appendChild(createTd(dir, wordsLink(items[word][pos]).join(dir === 'rtl' ? '، ' : ', ')))
                    e.appendChild(tr)
                }
            }
        }
        const fillPartItems = (e, items, dir, filler) => {
            e.parentElement.style.display = items ? "" : "none"
            if (items) filler(e, items, dir);
        };
        [].forEach.call(
            this.dicResults.querySelectorAll(".src"),
            e => (e.textContent = dicResult.word)
        );

        const url = `/d/${dicResult.lang}/${dicResult.word}/`
        history.pushState({ 'page_id': dicResult.dicWord }, "ترگمان - معنی " + dicResult.word, url);
        const title = `${dicResult.word} به ${dicResult.lang == 'en' ? 'فارسی' : 'انگلیسی'}`
        document.title = `ترگمان - معنی ${title} | ترجمه ${title}`;


        dicResult.dir = dicResult.lang == 'en' ? 'ltr' : 'rtl'
        const meanings = []
        if (dicResult.mean) {
            this.dicResultsMeaning.innerHTML = wordsLink(dicResult.mean).join(dicResult.dir === 'ltr' ? '، ' : ', ');
            this.dicResultsMeaning.classList.remove(mainDirection);
            this.dicResultsMeaning.classList.add(revDirection);
            this.dicResultsMeaning.parentElement.style.display = "block"
        } else {
            this.dicResultsMeaning.parentElement.style.display = "none"
        }

        if (dicResult.phonetics) {
            this.dicPronounce.querySelector('.uk span').innerHTML = dicResult.phonetics.uk
            this.dicPronounce.querySelector('.us span').innerHTML = dicResult.phonetics.us
            this.dicPronounce.style.display = ""
        } else this.dicPronounce.style.display = "none"

        fillPartItems(this.dicResultsSynonyms, dicResult.syn, dicResult.dir, fillTableItems);
        fillPartItems(this.dicResultsAntonyms, dicResult.ant, dicResult.dir, fillTableItems);
        fillPartItems(this.dicResultsExamples, dicResult.examples, dicResult.dir, (e, items) => {
            e.innerHTML = "";
            for (var i = 0; i < dicResult.examples.length; i++) {
                e.appendChild(createLi('source', wordLink(dicResult.examples[i][0])))
                e.appendChild(createLi('translation', wordLink(dicResult.examples[i][1])))
                e.appendChild(createLi('separator'))
            }
        });
        fillPartItems(this.dicResultsVC, dicResult.vc, dicResult.dir, (e, image) => {
            e.querySelector('img').src = 'https://targoman.ir/vc/' + image
        });
        fillPartItems(this.dicResultsRelWords, dicResult.relWord, dicResult.dir, (e, items) => {
            e.innerHTML = "";
            for (var word in dicResult.relWord) {
                e.appendChild(createLi('source', wordLink(word)))
                const ul = document.createElement('ul')
                ul.appendChild(createLi('translation', wordsLink(dicResult.relWord[word]).join(dicResult.dir === 'rtl' ? ', ' : '، ')))
                e.appendChild(ul)
                e.appendChild(createLi('separator'))
            }
        });
        fillPartItems(this.dicResultsRelExps, dicResult.relExp, dicResult.dir, (e, items) => {
            e.innerHTML = "";
            for (var word in dicResult.relExp) {
                e.appendChild(createLi('source', wordLink(word)))
                const ul = document.createElement('ul')
                for (let i = 0; i < dicResult.relExp[word].length; ++i)
                    ul.appendChild(createLi('translation', wordLink(dicResult.relExp[word][i])))
                e.appendChild(ul)
                e.appendChild(createLi('separator'))
            }
        });
        this.dicResults.style.display = "block";
        soon(() => {
            this.dicResultsShowMore.style.display =
                this.dicResults.offsetHeight < this.dicResults.scrollHeight
                    ? ""
                    : "none";
        });
    }

    get translationDirection() {
        return `${BindHandler.srcLang.code}2${BindHandler.tgtLang.code}`;
    }

    get translationClass() {
        return `${BindHandler.srcType.code}`;
    }

    updateEngineInfo(class_, time, timePerWord) {
        let span;
        //TODO
        span = this.metadataDiv.querySelector("span.engine");
        span.textContent =
            class_ in ENGINE_CLASS_TITLE ? ENGINE_CLASS_TITLE[class_] : "رسمی";
        span.dataset.class = class_;
        let totalTimeStr = farsiNumber(time);
        let timePerWordStr = farsiNumber(timePerWord);
        let timePer500WordsStr = farsiNumber(timePerWord * 500);
        this.metadataDiv.querySelector(
            "span.translation-time"
        ).textContent = totalTimeStr;
        this.engineInfoDiv.querySelector(
            "span.total-time"
        ).textContent = totalTimeStr;
        this.engineInfoDiv.querySelector(
            "span.time-per-word"
        ).textContent = timePerWordStr;
        this.engineInfoDiv.querySelector(
            "span.time-per-500words"
        ).textContent = timePer500WordsStr;
        this.metadataDiv.style.display = "block";
    }

    minifyBoxes(state) {
        [].forEach.call(document.querySelectorAll("div.content"), el => {
            if (state)
                el.classList.add('one-line')
            else
                el.classList.remove('one-line')
        })
    }

    translate() {
        this.informBusyState(true);
        this.dicResults.style.display = "";
        this.metadataDiv.style.display = "";
        let allPromises = [];
        let sourceText = BindHandler.srcText;
        if (!sourceText) {
            this.updateTargetContentWithTokenizedText(null);
            this.updateSourceContentWithTokenizedText(null);
            this.informBusyState(false);
            return;
        }
        allPromises.push(
            Translation.translate(sourceText, this.translationDirection, this.translationClass)
                .then(r => {
                    if (r === false || BindHandler.srcText != sourceText)
                        return;
                    this.updateTargetContentWithTokenizedText(r.tr);
                    this.updateSourceContentWithTokenizedText(r.tr);
                    this.updateEngineInfo(
                        r.class,
                        r.time,
                        r.time / sourceText.split(/\S/).length
                    );
                })
                .catch(e => {
                    notify("خطا", e.message, "error");
                })
        );
        if (BindHandler.srcText.split(/\s+/).length <= 3)
            allPromises.push(
                Translation.dicLookup(BindHandler.srcText).then(r => {
                    if (r === false || BindHandler.srcText != sourceText)
                        return;
                    this.updateDicResults(BindHandler.srcText, r);
                    document.querySelector(
                        "div#content div.ads div.graphical"
                    ).style.display = "none";
                    this.minifyBoxes(true)
                })
            );
        Promise.all(allPromises).finally(() => this.informBusyState(false));
    }
}

new TargomanWebUiApp();
