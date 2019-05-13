class BindHandler {

    constructor() {
        this.items = {};
        this.actions = {};
    }

    addItem(name, value) {
        if(name in this.items)
            throw Error(`Item by name '${name}', is already registered.`);
        this.items[name] = { value: value !== undefined ? value : null, changeHandlers: [] };
        Object.defineProperty(this, name, {
            configurable: false,
            enumerable: false,
            get: () => this.items[name].value,
        });
    }

    registerChangeHandler(name, handler) {
        if(name in this.items === false)
            throw Error(`No item by name, '${name}' is registered.`);
        if(this.items[name].changeHandlers.indexOf(handler) !== -1)
            return;
        this.items[name].changeHandlers.push(handler);
    }

    setItemValue(name, value, invoker) {
        if(name in this.items === false)
            throw Error(`No item by name, '${name}' is registered.`);
        if(this.items[name].value === value)
            return;
        let oldValue = this.items[name].value;
        this.items[name].value = value;
        for(var handler of this.items[name].changeHandlers)
            if(handler !== invoker)
                handler(value, oldValue);
    }

    triggerChangeHandlers(name, invoker) {
        if(name in this.items === false)
            throw Error(`No item by name, '${name}' is registered.`);
        let oldValue = this.items[name].value;
        for(var handler of this.items[name].changeHandlers)
            if(handler !== invoker)
                handler(oldValue, oldValue);
    }

    registerAction(name, action) {
        if(name in this.actions)
            throw Error(`Action by name '${name}', is already registered.`);
        this.actions[name] = action;
    }

    act(name, ...args) {
        if(name in this.actions === false)
            throw Error(`No action by name '${name}' is registered.`);
        return this.actions[name](...args);
    }
};

let Instance = new BindHandler();

export default Instance;