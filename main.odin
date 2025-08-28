package main

import "base:runtime"
import "./web"

main::proc() {
    web.logf("hello")
    btn := web.a_get_element_by_id("btn")
    _ = web.add_event_listener(btn, "click", clicked2)

}
@(export)
clicked::proc"contextless"(args_arr: web.JSValue, user_data: rawptr = nil)-> web.JSValue {
    context = runtime.default_context()
    user_data := transmute(int)user_data
    
    jslen := web.a_get(args_arr, "length")
    defer web.free(jslen)

    args_len: int
    web.read_int(jslen, &args_len)
    web.logf("Number of args is %v, user data is %v", args_len, user_data)

    // canel := (cast(^web.JSValue)user_data)
    return 0
}
@(export)
clicked2 :: proc(event: web.JSValue, _: ^web.EventHandlerData) {
    web.logf("the button was clicked with the new add event function")
}