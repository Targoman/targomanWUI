import { soon } from './common';

const UPDATE_SLIDER_ITEM_INTERVAL=10000;

class SliderHandler {
    constructor(e) {
        this.e = e;
        let items = e.querySelectorAll('div.item');
        this.wrapper = document.createElement('DIV');
        this.wrapper.style.width = `${items.length*100}%`;
        this.wrapper.style.height = `${window.innerWidth < 560 ? 0.38 * window.innerWidth : 0.19 * window.innerWidth}px`;
        this.wrapper.style.position = 'relative';
        this.wrapper.style.transition = 'right 1s';
        this.wrapper.style.right = '0px';
        this.wrapper.addEventListener('transitionend', this.normalizeMarkUp.bind(this));
        for(var item of items)
            item.style.width = `${100 / items.length-0.05}%`;
        let range = document.createRange();
        range.selectNodeContents(e);
        range.surroundContents(this.wrapper);
        this.removeNoiseTextNodes();
        setInterval(() => this.rotateShownItem(), UPDATE_SLIDER_ITEM_INTERVAL);
    }

    removeNoiseTextNodes() {
        for(var node of this.wrapper.childNodes)
            if(node.nodeType === Node.TEXT_NODE)
                this.wrapper.removeChild(node);
    }

    rotateShownItem() {
        this.wrapper.style.right = `${-this.wrapper.firstElementChild.clientWidth}px`;
    }

    normalizeMarkUp() {
        this.wrapper.insertBefore(this.wrapper.firstElementChild, null);
        this.removeNoiseTextNodes();
        this.wrapper.style.right = '';
        soon(() => {
            this.wrapper.style.right = '0px';
        });
    }
}

class Slider {
    applyTo(e) {
        return new SliderHandler(e);
    }
}

let Instance = new Slider();

export default Instance;