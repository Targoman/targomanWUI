import { eval_literal } from './common';
import BindHandler from './bindhandler';

class ToolButton {
    applyTo(e) {
        let action = e.dataset.action;
        let params = e.dataset.params ? eval_literal(`[${e.dataset.params}]`) : null;
        let visibleIf = e.dataset.visibleIf;
        let visibleIfNot = e.dataset.visibleIfNot;

        visibleIf && BindHandler.registerChangeHandler(visibleIf, value => {
            e.style.display = (value && !BindHandler[visibleIfNot]) ? '' : 'none';
        });

        visibleIfNot && BindHandler.registerChangeHandler(visibleIfNot, value => {
            e.style.display = (!value && BindHandler[visibleIf]) ? '' : 'none';
        });

        if((!visibleIf || BindHandler[visibleIf]) && (!visibleIfNot || !BindHandler[visibleIfNot]))
            e.style.display = '';
        else
            e.style.display = 'none';

        if(!action)
            throw Error('Toolbutton must have action.');
        
        if(params)
            e.addEventListener('click', e => BindHandler.act(action, ...params));
        else
            e.addEventListener('click', e => BindHandler.act(action));
    }
}

let Instance = new ToolButton();

export default Instance;