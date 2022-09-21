import BindHandler from "./bindhandler";
import { TargomanAPI } from "./api";
import CLD from "./cld";

class LangManual {
  constructor(specs) {
    for (let key in specs) this[key] = specs[key];
  }
  get text() {
    return this.title + (this.trial ? "(آزمایشی)" : "");
  }

  translatesTo(lang) {
    let code = lang.code || lang;
    if (this.code === code) return false;
    if (this.tgt === true) return true;
    return this.tgt.indexOf(code) !== -1;
  }

  allowedClasses(lang) {
    let code = lang.code || lang;
    return LANGUAGE_SPECS.filter((e) => e.code == code)[0].classes;
  }

  translatesFrom(lang) {
    let code = lang.code || lang;
    if (this.code === code) return false;
    if (this.src === true) return true;
    return this.src.indexOf(code) !== -1;
  }
}

const LANGUAGE_SPECS = [
  { title: "فارسی", code: "fa", direction: "rtl", classes: ["formal", "informal"], src: true, tgt: true, codePointRegex: /[\u0600-\u06fe\u0750-\u077e\u08a0-\u08fe\ufb50-\ufdfe\ufe70-\ufefe]/g },
  {
    title: "انگلیسی",
    code: "en",
    direction: "ltr",
    classes: ["formal", "informal"],
    src: true,
    tgt: true,
    codePointRegex: /[A-Za-z\u0080-\u00fe\u0100-\u017e\u0180-\u024e\u1e00-\u1efe\u2c60-\u2c7e\ua720-\ua7fe]/g,
  },
  //{ title: 'روسی', code: 'ru', direction: 'ltr', src: true, tgt: true, codePointRegex: /[\u0430-\u044f\u0410-\u042f\u0401\u0451]/g },
  { title: "آلمانی", code: "de", direction: "ltr", src: ["en", "fa"], tgt: ["en", "fa"] },
  { title: "فرانسه", code: "fr", direction: "ltr", src: ["en", "fa"], tgt: ["en", "fa"] },
  { title: "اسپانیایی", code: "es", direction: "ltr", src: ["en", "fa"], tgt: ["en", "fa"] },
  { title: "ایتالیای", code: "it", direction: "ltr", src: ["en", "fa"], tgt: ["en", "fa"] },
  { title: "پرتغالی", code: "pt", direction: "ltr", src: ["en", "fa"], tgt: ["en", "fa"] },
  { title: "بلژیکی", code: "bg", direction: "ltr", src: ["en", "fa"], tgt: ["en", "fa"] },
  { title: "چک", code: "cs", direction: "ltr", src: ["en", "fa"], tgt: ["en", "fa"] },
  { title: "استونیایی", code: "et", direction: "ltr", src: ["en", "fa"], tgt: ["en", "fa"] },
  { title: "لهستانی", code: "pl", direction: "ltr", src: ["en", "fa"], tgt: ["en", "fa"] },
  { title: "نروژی", code: "nb", direction: "ltr", src: ["en", "fa"] },
  //{ title: 'ترکی', code: 'tr', direction: 'ltr', trial: true, src: ['en', 'fa'], tgt: ['en', 'fa'] },
  //{ title: 'ژاپنی', code: 'ja', direction: 'ltr', trial: true, src: ['en', 'fa'], tgt: ['en', 'fa'] },
  //{ title: 'عربی فصیح', code: 'ar', direction: 'rtl', trial: true, src: ['en', 'fa'], tgt: ['en', 'fa'] }
].map((e) => new LangManual(e));

const TYPE_SPECS = [
  { title: "رسمی", code: "formal" },
  { title: "محاوره", code: "informal" },
].map((e) => new LangManual(e));

class LangAuto {
  constructor(triggerChangesItem) {
    this.cld = new CLD();
    this.triggerChangesItem = triggerChangesItem;
    this.text = "تشخیص خودکار زبان";
    this.empty = true;
    this.detected = LANGUAGE_SPECS[0];
    this.code2lang = {};
    this.src = this.tgt = true;
    for (let lang of LANGUAGE_SPECS) this.code2lang[lang.code] = lang;
  }

  updateDetectedLanguage(value) {
    let cldCode = this.cld.getISO639(value);
    let winner;
    if (cldCode in this.code2lang === false) {
      let countTextCodePoints = (codePointRegex) => {
        if (!codePointRegex) return 0;
        let match = value.match(codePointRegex);
        if (!match) return 0;
        return match.length;
      };
      const SOURCE_LANGUAGES = LANGUAGE_SPECS.filter((e) => e.src);
      winner = SOURCE_LANGUAGES[0];
      let winnerTextCodePoints = countTextCodePoints(SOURCE_LANGUAGES[0].codePointRegex);
      for (var index = 1; index < SOURCE_LANGUAGES.length; ++index) {
        let textCodePoints = countTextCodePoints(SOURCE_LANGUAGES[index].codePointRegex);
        if (textCodePoints > winnerTextCodePoints) {
          winner = SOURCE_LANGUAGES[index];
          winnerTextCodePoints = textCodePoints;
        }
      }
    } else winner = this.code2lang[cldCode];
    let prevEmpty = this.empty,
      prevDetected = this.detected;
    this.empty = /^\s*$/.test(value);
    this.detected = winner;
    if (this.triggerChangesItem && (prevEmpty !== this.empty || prevDetected !== this.detected)) BindHandler.triggerChangeHandlers(this.triggerChangesItem);
  }

  get code() {
    return this.detected.code;
  }
  get direction() {
    return this.detected.direction;
  }
  get extraText() {
    return this.empty ? "" : this.detected.text;
  }
  get availableClasses() {
    return this.detected.classes || null;
  }

  translatesTo(code) {
    return this.detected.translatesTo(code);
  }

  allowedClasses(type) {
    return this.detected.allowedClasses;
  }

  translatesFrom(code) {
    return this.detected.translatesFrom(code);
  }
}

class TypeAuto {
  constructor(triggerChangesItem) {
    this.cld = new CLD();
    this.triggerChangesItem = triggerChangesItem;
    this.text = "تشخیص خودکار نوع متن";
    this.empty = true;
    this.detected = TYPE_SPECS[0];
    this.code2type = {};
    this.src = this.tgt = true;
    for (let type of TYPE_SPECS) this.code2type[type.code] = type;
  }

  get code() {
    return this.detected.code;
  }
}

BindHandler.addItem("availableSrcLangs", [new LangAuto("srcLang")].concat(LANGUAGE_SPECS.filter((e) => e.src)));
BindHandler.addItem("availableSrcTypes", [new TypeAuto("srcType")].concat(TYPE_SPECS /*.filter(e => e.tgt)*/));
BindHandler.addItem(
  "availableTgtLangs",
  LANGUAGE_SPECS.filter((e) => e.tgt)
);

function getCharacterCorrespondence(_str1, _str2) {
  const DELETION = 0;
  const INSERTION = 1;
  const SUBSTITUTION = 2;

  const L1 = _str1.length;
  const L2 = _str2.length;
  const S = L1 + 1;

  let D = new Uint32Array((L1 + 1) * (L2 + 1));
  let Dij = new Uint32Array(3);

  for (var i = 1; i <= L1; ++i) D[i] = 4 * i;
  for (var i = 1; i <= L2; ++i) D[i * S] = 4 * i;
  for (var i = 1; i <= L1; ++i) {
    for (var j = 1; j <= L2; ++j) {
      Dij[DELETION] = D[j * S + (i - 1)] + 1;
      Dij[INSERTION] = D[(j - 1) * S + i] + 1;
      Dij[SUBSTITUTION] = D[(j - 1) * S + (i - 1)];
      if (_str1[i - 1] !== _str2[j - 1]) Dij[SUBSTITUTION] += 1;
      D[j * S + i] = Math.min.apply(null, Dij);
    }
  }

  let correspondence = [];
  for (var i = 0; i < L2; ++i) correspondence.push([]);

  i = L1;
  j = L2;
  let end = L1;
  while (i > 0 && j > 0) {
    Dij[DELETION] = D[j * S + (i - 1)] + 1;
    Dij[INSERTION] = D[(j - 1) * S + i] + 1;
    Dij[SUBSTITUTION] = D[(j - 1) * S + (i - 1)];
    if (_str1[i - 1] != _str2[j - 1]) Dij[SUBSTITUTION] += 1;

    let winner;
    if ((_str1[i - 1] === " ") !== (_str2[j - 1] === " ")) {
      if (_str1[i - 1] === " ") winner = DELETION;
      else winner = INSERTION;
    } else {
      winner = DELETION;
      if (Dij[winner] > Dij[INSERTION]) winner = INSERTION;
      if (Dij[winner] > Dij[SUBSTITUTION]) winner = SUBSTITUTION;
    }

    switch (winner) {
      case DELETION:
        --i;
        break;
      case INSERTION:
        correspondence[j - 1] = [];
        --j;
        break;
      case SUBSTITUTION:
        correspondence[j - 1] = [i - 1, end];
        end = i - 1;
        --i;
        --j;
        break;
    }
  }
  while (j > 0) {
    correspondence[j - 1] = [];
    --j;
  }

  return correspondence;
}

class Translation {
  constructor() {
    this.langAuto = new LangAuto();
    this.lastTUID = null;
    this.translationCallId = 0;
    this.dictionaryCallId = null;
  }

  detectLanguage(text) {
    this.langAuto.updateDetectedLanguage(text);
    return this.langAuto.detected;
  }

  prepareSimpleTranslationResultObject(text, translation, cls, trTime) {
    let result = [];
    let targetSentences = translation.split("\n").filter((e) => e.trim());
    let sourceLines = text.split("\n");
    let paragraphIndex = 0;
    for (var s of sourceLines) {
      if (/^\s*$/.test(s)) {
        result.push(null);
        continue;
      }
      let t = targetSentences[paragraphIndex];
      let c = [[[0, s.length], [0, t.length], 0, true]];
      result.push([s, t, c]);
      ++paragraphIndex;
    }
    return { tr: result, class: cls, time: trTime };
  }

  prepareTranslationResultObject(text, tr, cls, trTime) {
    let result = [];
    let lines = text.split("\n");
    let paragraphIndex = 0;
    for (var line of lines) {
      if (/^\s*$/.test(line)) {
        result.push(null);
        continue;
      }
      let translation = tr.base[paragraphIndex][1];
      let sourcePhrases = tr.base[paragraphIndex][0].split(" ");
      let targetPhrases = tr.phrases[paragraphIndex].map((e) => e[0]);
      let sourceCorrespondence = getCharacterCorrespondence(line, tr.base[paragraphIndex][0]);
      let targetCorrespondence = getCharacterCorrespondence(translation, targetPhrases.join(" "));

      let augmentPhrasesWithTheirStartPositions = (phrases) => {
        let result = phrases.map((e) => [e, 0]);
        for (let i = 1; i < result.length; ++i) result[i][1] = result[i - 1][1] + result[i - 1][0].length + 1;
        return result;
      };

      let getCorrespondenceBounds = (phrase, correspondence) => {
        let phraseCorr = correspondence.slice(phrase[1], phrase[1] + phrase[0].length).filter((e) => e.length > 0);
        if (phraseCorr.length > 0)
          return [
            Math.min.apply(
              null,
              phraseCorr.map((e) => e[0])
            ),
            Math.max.apply(
              null,
              phraseCorr.map((e) => e[1])
            ),
          ];
        return [];
      };

      sourcePhrases = augmentPhrasesWithTheirStartPositions(sourcePhrases)
        .map((e) => getCorrespondenceBounds(e, sourceCorrespondence))
        .filter((e) => e.length > 0);
      targetPhrases = augmentPhrasesWithTheirStartPositions(targetPhrases)
        .map((e) => getCorrespondenceBounds(e, targetCorrespondence))
        .filter((e) => e.length > 0);

      let crossCorrespondence = tr.alignments[paragraphIndex]
        .map((e, i) => {
          if (sourcePhrases[e[1] - 1] && targetPhrases[i]) return [sourcePhrases[e[1] - 1], targetPhrases[i], e[1] - 1];
          return false;
        })
        .filter(Boolean);
      for (let i = 0; i < crossCorrespondence.length; ++i) {
        let sourceIndex = crossCorrespondence[i][2];
        let found = false;
        for (let j = 0; j < i; ++j)
          if (crossCorrespondence[j][2] === sourceIndex) {
            found = true;
            break;
          }
        crossCorrespondence[i].push(found === false);
      }

      result.push([line, translation, crossCorrespondence]);
      ++paragraphIndex;
    }

    return { tr: result, class: cls, time: trTime };
  }

  prepareDictionaryResultObject() {
    // Implement if ever needed
    return null;
  }

  translate(text, direction, class_) {
    let callId = ++this.translationCallId;
    return TargomanAPI.translate("ssid", text, direction, "", "NMT", true, true, true, this.lastTUID, class_).then((data) => {
      if (callId !== this.translationCallId) return false;
      data = data.result;
      if (data.tuid) this.lastTUID = data.tuid;
      if (data.tr) {
        if (!data.tr.simple && !data.tr.base.length) return null;
        return data.tr.simple ? this.prepareSimpleTranslationResultObject(text, data.tr.simple) : this.prepareTranslationResultObject(text, data.tr, data.class, data.TrTime);
      } else if (data.dic) {
        return this.prepareDictionaryResultObject(data.dic);
      } else throw Error("API call error.");
    });
  }

  prepareAbadisResultObject(data) {
    data.phonetic = data.phonetic ? data.phonetic.split(";") : [];
    data.syn = data.syn
      ? data.syn
          .split("^^")
          .filter(Boolean)
          .map((e) => {
            let parts = e.split("::");
            if (parts.length == 3)
              return {
                part: parts[0],
                mean: parts[1],
                syns: parts[2].trim(),
              };
            return false;
          })
          .filter(Boolean)
      : null;
    data.relexp = data.relexp
      ? data.relexp
          .split("^^")
          .filter(Boolean)
          .map((e) => {
            let parts = e.split("::");
            if (parts.length == 2)
              return {
                exp: parts[0],
                mean: parts[1],
              };
            return false;
          })
          .filter(Boolean)
      : null;
    data.relword = data.relword
      ? data.relword
          .split("^^")
          .filter(Boolean)
          .map((e) => {
            let parts = e.split("::");
            if (parts.length == 2)
              return {
                word: parts[0],
                mean: parts[1],
              };
            return false;
          })
          .filter(Boolean)
      : null;
    return data;
  }

  dicLookup(text) {
    let callId = ++this.dictionaryCallId;
    return TargomanAPI.lookupDic("ssid", text).then((data) => {
      if (callId !== this.dictionaryCallId) return false;
      if (!data.result) return false;
      data = data.result;
      /*   try {
               data = JSON.parse(
                   data.result.replace(
                       /&#\d+;/g,
                       d => String.fromCharCode(
                           parseInt(
                               d.substring(2, d.length - 1)
                           )
                       )
                   )
               );
               } catch(e) {
                   // TODO: Show error?
               }*/
      if (!data.mean) return false;
      return data; //this.prepareAbadisResultObject(data);
    });
  }
}

let Instance = new Translation();

export default Instance;
