const type = (target, type) => {
    if(typeof type == "string"){
        if(typeof target != type) throw `invalid type ${target} : ${type}`
    } else if(!(target instanceof type)) throw `invalid type ${target} : ${type}`
    return target
}

const ViewModelListener = class {
    viewmodelUpdated(updated){throw "override!"}
}

const ViewModel = class extends ViewModelListener{
    parent = null;
    subKey = "";
    static #subjects = new Set;
    static #inited = false;
    static notify(vm) {
        this.#subjects.add(vm);
        if(this.#inited) return;
        this.#inited = true;
        const f = _ => {
            this.#subjects.forEach(vm => {
                if(vm.#isUpdated.size){
                    vm.notify();
                    vm.#isUpdated.clear();
                }
            })
            requestAnimationFrame(f);
        }
        requestAnimationFrame(f);
    }


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
                        this.#isUpdated.add(new ViewModelValue(this.subKey,"",k,v))
                    }
                });
                // composition : 자식 viewmodle의 변화를 수신
                if(v instanceof ViewModel){
                    v.parent = this;
                    v.subKey = k;
                    v.addListener(this);
                }
            }
        })
        ViewModel.notify(this);
        Object.seal(this)
    }

    viewmodelUpdated(updated){
        updated.forEach(v =>this.#isUpdated.add(v));
    }
} 

const viewModelValue = class {
    subKey; cat; k; v;
    constructor(subKey,cat, k, v){
        this.subKey = subKey;
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

const Binder = class extends ViewModelListener{
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
    // 자식의 변화를 관찰
    watch(viewmodel, _=type(viewmodel,ViewModel)){
        viewmodel.addListener(this);
        this.render(viewmodel);
    }
    unwatch(viewmodel, _=type(viewmodel, ViewModel)){
        viewmodel.removeListener(this)
    }
    viewmodelUpdated(updated){
        const items = {};
        this.#items.forEach(item => {
            items[item.viewmodel] 
            = [
                type(viewmodel[item.viewmodel], ViewModel),
                item.el
            ]
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

