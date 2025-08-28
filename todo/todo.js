document.addEventListener("DOMContentLoaded", () => {
    /** @type {(text: string) => HTMLElement} */
    function makeTodo(text){
        const li = document.createElement("li");
        li.append(text);
        const rmBtn = document.createElement("button");
        rmBtn.addEventListener("click", () => {
            li.remove();
        });
        rmBtn.append("Remove");
        li.append(rmBtn);
        return li;
    }
    /** @type {HTMLInputElement} */
    const input = document.getElementById("todo-input-js");
    /** @type {HTMLButtonElement} */
    const addBtn = document.getElementById("todo-add-btn-js");
    /** @type {HTMLOListElement} */
    const list = document.getElementById("todo-list-js");
    addBtn.addEventListener("click", () => {
        console.log(input.value);
        const todo = makeTodo(input.value);
        list.append(todo);
    })
});