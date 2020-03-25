const type = (target, type) => {
    if(typeof type == "string"){
        if(typeof target != type) throw `invalid type ${target} : ${type}`
    } else if(!(target instanceof type)) throw `invalid type ${target} : ${type}`
    return target
}

const ViewModel = class {
    static #private = Symbol();
    static get(data){ return new ViewModel(this.#private, data);}

    styles = {}; attributes = {}; properties = {}; events = {};

    constructor(checker, data){
        if(checker != ViewModel.#private) throw "use ViewModel get()!"
        Object.entries(data).forEach(([k,v]) => {
            switch(k){
                case "styles":this.styles = v; break;
                case "attributes":this.attributes = v; break;
                case "properties":this.properties = v; break;
                case "events":this.events = v; break;
                default: this[k] = v;
            }
        })
        Object.seal(this)
    }
} 

const BinderItem = class {
    el;
    viewmodel;
    constructor(el, viewmodel, _0=type(el, HTMLElement), _1=type(viewmodel,"string")){
        this.el = el;
        this.viewmodel = viewmodel;
        Object.freeze(this)
    }
}

const Binder = class {
    #items = new Set;
    
    add(v, _=type(v, BinderItem)){
        this.#items.add(v)
    }
    render(viewmodel, _=type(viewmodel, ViewModel)){
        this.#items.forEach(item => {
            const el = item.el;
            const vm = type(viewmodel[item.viewmodel], ViewModel)
            Object.entries(vm.styles).forEach(([k,v])=>el.style[k] = v)
            Object.entries(vm.attributes).forEach(([k,v])=>el.setAttribute(k,v))
            Object.entries(vm.properties).forEach(([k,v])=>el[k] = v)
            Object.entries(vm.events).forEach(([k,v])=>el["on" + k] = e => v.call(el, e, viewmodel))
        })
    }
}

const Scanner = class {
    scan(el, _=type(el,HTMLElement)){
        const binder = new Binder;
        this.checkItem(binder,el)
        const stack = [el.firstElementChild];
        let target;
        while(target = stack.pop()){
            this.checkItem(binder, target)
            if(target.firstElementChild) stack.push(target.firstElementChild)
            if(target.nextElementSibling) stack.push(target.nextElementSibling)
        }
        return binder;
    }
    checkItem(binder, el){
        const vm = el.getAttribute("data-viewmodel")
        if(vm) binder.add(new BinderItem(el, vm))
    }
}

const viewmodel = ViewModel.get({
    isStop:false,
    changeContents(){
        this.wrapper.styles.background = `rgb(${parseInt(Math.random()*150) + 100},${parseInt(Math.random()*150) + 100},${parseInt(Math.random()*150) + 100})`
        this.contents.properties.innerHTML = Math.random().toString(16).replace(".","");
    },
    wrapper:ViewModel.get({
        styles:{
            width:"50%",
            background:"#ffa",
            cursor:"pointer"
        },
        events:{
            click(e, vm){
                vm.isStop = true;
            }
        }
    }),
    title:ViewModel.get({
        properties:{
            innerHTML:'Title'
        }
    }),
    contents:ViewModel.get({
        properties:{
            innerHTML:"Contents"
        }
    })
})

const scanner = new Scanner;
const binder = scanner.scan(document.querySelector("#target"))
binder.render(viewmodel)

const f =_=>{
    viewmodel.changeContents();
    binder.render(viewmodel);
    if(!viewmodel.isStop) requestAnimationFrame(f);
};
requestAnimationFrame(f)

