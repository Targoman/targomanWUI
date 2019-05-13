import BindHandler from './bindhandler';

class Button {
    applyTo(e) {
        if(!e.dataset.action)
            throw Error('Button needs to specify an action.');
        e.handler = null;
        e.addEventListener('click', e => BindHandler.act(e.target.dataset.action));
        if(e.dataset.enabledIf)
            BindHandler.registerChangeHandler(e.dataset.enabledIf, (value, oldValue) => value ? e.classList.remove('disabled') : e.classList.add('disabled'));
        return null;
    }
}

let Instance = new Button();

export default Instance;