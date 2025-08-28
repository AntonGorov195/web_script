package main

import "base:runtime"
import "../web"

input: web.JSValue

main::proc() {
    context = runtime.default_context()
    defer free_all(context.temp_allocator)
    input = web.a_get_element_by_id("todo-input-wasm")
    value := web.get_input_value_f64(input)
    web.logf("this is wasm todo list %v", value)
}
make_todo::proc() -> web.JSValue {
    list_item := web.a_create_element("li")
    defer web.free(list_item)
    
    remove_btn := web.a_create_element("button")
    defer web.free(remove_btn)

    return 0
}