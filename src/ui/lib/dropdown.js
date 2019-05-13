import { soon } from './common';
import BindHandler from './bindhandler';

class DropDownHandler {
    constructor(e, bindTo, optionsCollection) {
        e.handler = this;
        this.element = e;
        this.optionsDiv = e.querySelector('div.options');
        if(!this.optionsDiv)
            throw Error('A dropdown must have its associated `div.options` in it.');
        this.selectionSpan = e.querySelector('span.selection');
        if(!this.optionsDiv)
            throw Error('A dropdown must have its associated `span.selection` in it.');
        this.element.addEventListener('click', e => this.handleClick(e));
        this.element.addEventListener('mouseleave', e => this.handleMouseLeave());
        this.optionsDiv.addEventListener('transitionend', e => { if(e.target.style.opacity < 0.2) e.target.style.display = ''; });
        let ul = document.createElement('UL');
        let foundSelectedOption = false;
        let markSelectedItem = li => {
            this.updateSelectionSpan(option);
            li.classList.add('selected');
        };
        for(var option of BindHandler[optionsCollection]) {
            let li = document.createElement('LI');
            li.textContent = option.text || option.toString();
            li.option = option;
            if(option === BindHandler[bindTo]) {
                foundSelectedOption = true;
                markSelectedItem(li);
            }
            li.addEventListener('click', e => this.handleItemSelection(e));
            ul.appendChild(li);
        }
        if(!foundSelectedOption) {
            markSelectedItem(ul.querySelector('LI'));
            BindHandler.setItemValue(bindTo, this.selectionSpan.option);
        }
        this.optionsDiv.appendChild(ul);
        this.handleBoundValueChange = this.handleBoundValueChange.bind(this);
        this.triggerChangeHandlers = value => BindHandler.setItemValue(bindTo, value, this.handleBoundValueChange);
        BindHandler.registerChangeHandler(bindTo, this.handleBoundValueChange);
    }

    updateSelectionSpan(option) {
        let extraText = option.extraText ? `(${option.extraText})` : '';
        this.selectionSpan.textContent = (option.text || option.toString()) + extraText;
        this.selectionSpan.option = option;
    }

    handleBoundValueChange(value) {
        this.updateSelectionSpan(value);
        for(var node of this.optionsDiv.querySelectorAll('LI'))
            if(node.option === value)
                node.classList.add('selected');
            else
                node.classList.remove('selected');
    }

    handleClick(e) {
        if(e.target === this.optionsDiv || this.optionsDiv.contains(e.target))
            return;
        let boundingClientRect = this.element.getBoundingClientRect();
        let optionsDiv = this.optionsDiv;
        optionsDiv.style.display = 'block';
        optionsDiv.style.top = `${boundingClientRect.bottom - 1}px`;
        optionsDiv.style.right = `${window.innerWidth - boundingClientRect.right}px`;
        soon(() => {
            optionsDiv.style.opacity = 1.0;
        });
    }

    handleMouseLeave() {
        this.optionsDiv.style.opacity = 0;
    }

    handleItemSelection(e) {
        if(this.selectionSpan.option === e.target.option)
            return;
        if(e.target.classList.contains('disabled'))
            return;
        let item = e.target;
        this.updateSelectionSpan(item.option);
        for(var node of item.parentElement.querySelectorAll(item.nodeName))
            node.classList.remove('selected');
        item.classList.add('selected');
        this.triggerChangeHandlers(item.option);
        this.handleMouseLeave();
    }

    enableItems(filter) {
        for(var node of this.optionsDiv.querySelectorAll('LI'))
            if(filter(node.option))
                node.classList.remove('disabled');
            else
                node.classList.add('disabled');
    }
}

class DropDown {
    applyTo(e) {
        if(!e.dataset.bindTo)
            throw Error('Dropdown must be binded to a data item.');
        if(!e.dataset.optionsCollection)
            throw Error('Dropdown must have options collection.');
        return new DropDownHandler(
            e,
            e.dataset.bindTo,
            e.dataset.optionsCollection
        );
    }
}

let Instance = new DropDown();

export default Instance;