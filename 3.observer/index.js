const type = (target, type) => {
    if(typeof type == "string"){
        if(typeof target != type) throw `invalid type ${target} : ${type}`
    } else if(!(target instanceof type)) throw `invalid type ${target} : ${type}`
    return target
}

const ViewModelListener = class {
    viewmodelUpdated(updated){throw "override!"}
}

const ViewModel = class {
  
    static get(data){ return new ViewModel(data);}
    
    styles = {}; attributes = {}; properties = {}; events = {};
    #isUpdated = new Set;
    #listeners = new Set;

    addListener(v, _=type(v, ViewModelListener)){
        this.#listeners.add(v);
    }
    removeListener(v, _=type(v,ViewModelListener)){
        this.#listeners.delete(v)
    }
    notify(){
        this.#listeners.forEach(v=>v.viewmodelUpdated(this.#isUpdated));
    }

    constructor(checker, data, _=type(data,"object")){
        super();
        Object.entries(data).forEach(([k,obj])=>{
            if("style,attributes,properties".includes(k)){
                this[k] = Object.defineProperties(obj,
                    Object.entries(obj).reduce((r,[k,v])=>{
                        r[k] = {
                            enumerable:true,
                            get:_=>v,
                            set:newV=>{
                                v = newV;
                                vm.#isUpdated.add(
                                    new ViewModelValue(cat,k,v)
                                );
                            }
                        }
                        return r;
                    },{})
                    )
            }else {
                Object.defineProperty(this, k, {
                    enumerable:true,
                    get:_=>v,
                    set:newV=>{
                        v = newV;
                        this.#isUpdated.add(new ViewModelValue("",k,v))
                    }
                })
            }
        })
    }

} 

const viewModelValue = class {
    cat; k; v;
    constructor(cat, k, v){
        this.cat = cat;
        this.k = k;
        this.v = v;
        Object.freeze(this)
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
    #processors = {};
    add(v, _=type(v, BinderItem)){
        this.#items.add(v)
    }
    addProcessor(v, _0=type(v, Processor)){
        this.#processors[v.cat] = v;
    }
    render(viewmodel, _=type(viewmodel, ViewModel)){
        const processors = Object.entries(this.#processors);
        this.#items.forEach(item => {
           const vm = type(viewmodel[item.viewmodel], ViewModel)
           const el = item.el;
           processors.forEach(([pk, processor]) => {
               Object.entries(vm[pk]).forEach(([k,v]) => {
                   processor.process(vm,el,k,v);
               })
           })

        })
    }
}

const Processor = class {
    cat;
    constructor(cat){
        this.cat = cat;
        Object.freeze(this);
    }
    process(vm, el, k, v, _0 = type(vm, ViewModel), _1 = type(el,HTMLElement), _2 = type(k,"string")){
        this._process(vm, el, k, v)
    }
    _process(vm, el, k, v){throw "override!"}
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
binder.addProcessor(new (class extends Processor{
    _process(vm, el, k, v){el.style[k] = v;}
})("styles"));
binder.addProcessor(new (class extends Processor{
    _process(vm, el, k, v){el.setAttribute(k,v)}
})("attributes"));
binder.addProcessor(new (class extends Processor{
    _process(vm, el, k, v){el[k] = v}
})("properties"));
binder.addProcessor(new (class extends Processor{
    _process(vm, el, k, v){el["on" + k] = e => v.call(el, e, vm)}
})("events"));

binder.render(viewmodel)

const f =_=>{
    viewmodel.changeContents();
    binder.render(viewmodel);
    if(!viewmodel.isStop) requestAnimationFrame(f);
};
requestAnimationFrame(f)

