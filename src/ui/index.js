import { farsiNumber, notify, jitterPreventedVersion, copyToClipboard, getTextContent, setTokenizedText } from './lib/common';
import BindHandler from './lib/bindhandler';
import DropDown from './lib/dropdown';
import Button from './lib/button';
import TransSrc from './lib/trans-src';
import Slider from './lib/slider';
import TextAd from './lib/textads';
import ToolButton from './lib/toolbutton';
import Translation from './lib/translation';

// Global application values
BindHandler.addItem('srcLang', BindHandler.availableSrcLangs[0]);
BindHandler.addItem('tgtLang', BindHandler.availableTgtLangs[0]);
BindHandler.addItem('srcText', '');

BindHandler.addItem('proposingNewTranslationMode', false);

// Component setup

const SELECTOR_TO_COMPONENT_MAP = {
    'div#content div.header div.dropdown': DropDown,
    'div#content div.header div.button': Button,
    'div#content div.src div.content[contenteditable="true"]': TransSrc,
    'div#content div.ads div.slider': Slider,
    'div#content div.ads div.text': TextAd,
    'a.toolbar-button': ToolButton
};

for(var selector in SELECTOR_TO_COMPONENT_MAP) {
    [].forEach.call(
        document.querySelectorAll(selector),
        e => SELECTOR_TO_COMPONENT_MAP[selector].applyTo(e)
    );
}

// Application logic
class TargomanWebUiApp {
    constructor() {
        this.automaticTranslationTimeout = null;

        this.handleSourceTextChange = this.handleSourceTextChange.bind(this);
        this.handleSourceLangChange = this.handleSourceLangChange.bind(this);
        this.handleTargetLangChange = this.handleTargetLangChange.bind(this);
        this.handleHoverOverPhrases = this.handleHoverOverPhrases.bind(this);
        this.translate = this.translate.bind(this);

        this.srcContentDiv = document.querySelector('div#content div.src div.content[contenteditable="true"]');
        this.tgtContentDiv = document.querySelector('div#content div.tgt div.content');
        this.usageReportDiv = document.querySelector('div#content div.src div.usage-report');
        this.busyDiv = document.querySelector('.translator-busy.busy');

        this.srcContentDiv.handler.maxLength = 5000;

        this.setUsedCharacters(0);

        this.setCallbacks();
        this.registerActions();
        this.registerChangeHandlers();
    }

    clearSource() {
        BindHandler.setItemValue('srcText', '');
    }

    copyTranslationResult() {
        copyToClipboard(getTextContent(this.tgtContentDiv));
    }

    voteUpTranslation() {

    }

    voteDownTranslation() {

    }

    proposeNewTranslation() {

    }

    acceptNewTranslation() {

    }

    cancelNewTranslation() {

    }

    handleHoverOverPhrases(e) {
        let clearPhraseHighlight = jitterPreventedVersion(() => [].forEach.call(
            document.querySelectorAll('div#content div.content span.phrase-token'),
            e => e.classList.remove('hi')
        ));

        let highlightPhrase = jitterPreventedVersion((parIndex, phraseIndex) => [].forEach.call(
            document.querySelectorAll(`div#content div.content span[data-par-index="${parIndex}"][data-phrase-index="${phraseIndex}"]`),
            e => e.classList.add('hi')
        ));

        if(e.type.toLowerCase() === 'mouseenter') {
            if(e.target.nodeName === 'SPAN' && e.target.classList.contains('phrase-token'))
                highlightPhrase(e.target.dataset.parIndex, e.target.dataset.phraseIndex);
            else
                clearPhraseHighlight();
        } else {
            clearPhraseHighlight();
        }
    }

    setCallbacks() {
        document.addEventListener('mouseenter', this.handleHoverOverPhrases, true);
        document.addEventListener('mouseleave', this.handleHoverOverPhrases, true);
    }

    setUsedCharacters(value) {
        this.usageReportDiv.textContent = `${farsiNumber(value)}/${farsiNumber(this.srcContentDiv.handler.maxLength)}`;
        this.usageReportDiv.style.color = value >= 0.7 * this.srcContentDiv.handler.maxLength ? 'red' : '';
    }

    registerActions() {
        BindHandler.registerAction('translate', this.translate.bind(this));
        BindHandler.registerAction('clearSource', this.clearSource.bind(this));
        BindHandler.registerAction('copyTranslationResult', this.copyTranslationResult.bind(this));
        BindHandler.registerAction('voteUpTranslation', this.voteUpTranslation.bind(this));
        BindHandler.registerAction('voteDownTranslation', this.voteDownTranslation.bind(this));
        BindHandler.registerAction('proposeNewTranslation', this.proposeNewTranslation.bind(this));
        BindHandler.registerAction('acceptNewTranslation', this.acceptNewTranslation.bind(this));
        BindHandler.registerAction('cancelNewTranslation', this.cancelNewTranslation.bind(this));
    }

    handleSourceLangChange(value) {
        this.srcContentDiv.style.direction = value.direction;
        let realSourceLang = value.detected || value;
        if(BindHandler.tgtLang === realSourceLang) {
            for(var lang of BindHandler.availableTgtLangs)
                if(lang !== realSourceLang) {
                    BindHandler.setItemValue('tgtLang', lang);
                    break;
                }
        }
    }

    handleTargetLangChange(value) {
        this.tgtContentDiv.style.direction = value.direction;
        if(BindHandler.srcLang === value) {
            for(var lang of BindHandler.availableTgtLangs)
                if(!lang.detected && lang !== value) {
                    BindHandler.setItemValue('srcLang', lang);
                    break;
                }
        }
    }

    registerChangeHandlers() {
        BindHandler.registerChangeHandler('srcText', this.handleSourceTextChange);
        BindHandler.registerChangeHandler('srcLang', this.handleSourceLangChange);
        BindHandler.registerChangeHandler('tgtLang', this.handleTargetLangChange);
    }

    handleSourceTextChange(value) {
        if(BindHandler.srcLang.updateDetectedLanguage)
            BindHandler.srcLang.updateDetectedLanguage(value);
        this.setUsedCharacters(BindHandler.srcText.length);
        clearTimeout(this.automaticTranslationTimeout);
        this.automaticTranslationTimeout = setTimeout(() => {
            BindHandler.act('translate')
        }, 500);
    }

    informBusyState(busy) {
        this.busyDiv.style.display = busy ? 'block' : '';
    }

    updateSourceContentWithTokenizedText(translationResult) {
        if(!translationResult) {
            this.srcContentDiv.handler.updateContentWithTokenizedText(null);
            return;
        }
        this.srcContentDiv.handler.updateContentWithTokenizedText(
            translationResult.map(parData => {
                let source = parData[0], sourceIndex = 0;
                let result = [];
                let parts = parData[2].filter(e => e[3]).slice(0).sort((a, b) => a[0][0] - b[0][0]);
                for(var e of parts) {
                    let start = e[0][0], end = e[0][1], phraseIndex = e[2];
                    if(start > sourceIndex)
                        result.push([source.substring(sourceIndex, start)]);
                    result.push([
                        source.substring(start, end),
                        phraseIndex
                    ]);
                    sourceIndex = end;
                }
                return result;
            })
        );
    }

    updateTargetContentWithTokenizedText(translationResult) {
        if(!translationResult) {
            setTokenizedText(this.tgtContentDiv, null);
            return;
        }
        let tokenizationResult = translationResult.map(parData => {
            let target = parData[1], targetIndex = 0;
            let result = [];
            let parts = parData[2].slice(0).sort((a, b) => a[1][0] - b[1][0]);
            for(var e of parts) {
                let start = e[1][0], end = e[1][1], phraseIndex = e[2];
                if(start > targetIndex)
                    result.push([target.substring(targetIndex, start)]);
                result.push([
                    target.substring(start, end),
                    phraseIndex
                ]);
                targetIndex = end;
            }
            return result;
        });
        setTokenizedText(this.tgtContentDiv, tokenizationResult);
    }

    translate() {
        this.informBusyState(true);
        let allPromises = [];
        if(!BindHandler.srcText){
            this.updateTargetContentWithTokenizedText(null);
            this.updateSourceContentWithTokenizedText(null);
            this.informBusyState(false);
            return;
        }
        allPromises.push(Translation.translate(BindHandler.srcText, `${BindHandler.srcLang.code}2${BindHandler.tgtLang.code}`).then(r => {
            if(r === false)
                return;
            this.updateTargetContentWithTokenizedText(r.tr);
            this.updateSourceContentWithTokenizedText(r.tr);
        }));
        if(BindHandler.srcText.split(/\s+/).length <= 3)
            allPromises.push(Translation.abadisLookup(BindHandler.srcText).then(r => {
                if(r === false)
                    return;
            }));
        Promise.all(allPromises).finally(() => this.informBusyState(false));
    };
}

new TargomanWebUiApp();