import { getTextContent, setTextContent, setTokenizedText, getCursorLineAndPos, setCursorLineAndPos } from './common';
import BindHandler from './bindhandler';

class TransSrcHandler {
    constructor(e, bindTo) {
        e.handler = this;
        this.e = e;
        this.bindTo = bindTo;
        this.maxLength = -1;

        this.updateBoundValue = this.updateBoundValue.bind(this);
        this.handleBoundValueChange = this.handleBoundValueChange.bind(this);

        e.addEventListener('input', this.updateBoundValue);
        e.addEventListener(
            'keypress',
            e => {
                 if(this.maxLength >= 0 && e.target.textContent.length > this.maxLength)
                    e.preventDefault();
            }
        );
        BindHandler.registerChangeHandler(bindTo, this.handleBoundValueChange);
    }

    updateBoundValue() {
        BindHandler.setItemValue(this.bindTo, getTextContent(this.e), this.handleBoundValueChange);
    }

    handleBoundValueChange(value, oldValue) {
        if(value === oldValue)
            return;
        let { cursorLine, cursorPos } = getCursorLineAndPos(this.e);
        setTextContent(this.e, value);
        setCursorLineAndPos(this.e, { cursorLine, cursorPos});
    }

    updateContentWithTokenizedText(tokenizationResult) {
        if(!tokenizationResult) {
            this.e.innerHTML = '';
            return;
        }
        let { cursorLine, cursorPos } = getCursorLineAndPos(this.e);
        setTokenizedText(this.e, tokenizationResult);
        setCursorLineAndPos(this.e, { cursorLine, cursorPos});
    }
}

class TransSrc {
    applyTo(e) {
        if(!e.dataset.bindTo)
            throw Error('RichEdits must be bound to some item.');
        return new TransSrcHandler(e, e.dataset.bindTo);
    }
}

let Instance = new TransSrc();

export default Instance;