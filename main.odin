package main

import "base:runtime"
import "./web"

main::proc() {
    web.logf("hello")
    add_event(clicked)
}
@(export)
clicked::proc"c"(args_arr: web.JSValue, user_data: rawptr = nil)-> web.JSValue {
    context = runtime.default_context()
    user_data := transmute(int)user_data
    
    jslen := web.a_get(args_arr, "length")
    defer web.free(jslen)

    args_len: int
    web.read_int(jslen, &args_len)
    web.logf("Number of args is %v, user data is %v", args_len, user_data)
    return 0
}
add_event :: proc(click_callback: web.ExportFunc, user_data: rawptr = nil) {
    global := web.get_global_this()
    doc := web.a_get(global, "document")
    defer web.free(doc)

    get_elem_func := web.a_get(doc, "getElementById")
    defer web.free(get_elem_func)

    id := web.a_string("btn")
    defer web.free(id)

    elem := web.a_invoke(get_elem_func, { id })
    defer web.free(elem)

    add_event := web.a_get(elem, "addEventListener")
    defer web.free(add_event)

    click_event := web.a_string("click")
    defer web.free(click_event)

    click_export_func := web.a_export_func(click_callback, user_data)
    defer web.free(click_export_func)

    click_func := web.a_wrap_func(click_export_func)
    defer web.free(click_func)

    web.free(web.a_invoke(add_event, {click_event, click_func}))
}