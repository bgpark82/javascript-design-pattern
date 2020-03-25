const View = class {
    getElement(){throw "override!"}
    initAni(){throw "override!"}
    startAni(){throw "override!"}
}

const Render = class {
    #view
    #base
    constructor(baseElement){
        this.#base = baseElement;
    }
    set view(v){
        if(v instanceof View) this.#view = v;
        else throw `invalid view : ${v}`
    }
    render(data){
        const base = this.#base, view = this.#view;
        if(!base || !view) throw "no base or view"

        base.appendChild(view.getElement(data))
        view.initAni();
        view.startAni();        
    }
}


const renderer = new Render(document.body);
renderer.view = new class extends View {
    #el
    getElement(data){
        this.#el = document.createElement("div")
        this.#el.innerHTML = `<h2>${data.title}</h2><p>${data.description}</p>`
        this.#el.style.cssText = `width:100%; background:${data.background}`
        return this.#el;
    }
    initAni(){
        const style = this.#el.style;
        style.marginLeft = "100%"
        style.transition = "all 0.3s"
    }
    startAni(){
        requestAnimationFrame(_=> this.#el.style.marginLeft = 0);
    }
}
renderer.render({title:"title test",description:"content....",background:"gold"})

