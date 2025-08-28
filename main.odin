package main

import "base:runtime"
import "./web"

main::proc() {
    web.logf("hello")
    btn := web.a_get_element_by_id("btn")
    _ = web.add_event_listener(btn, "click", clicked)

}
@(export)
clicked :: proc(event: web.JSValue, data: ^web.EventHandlerData) {
    web.logf("The button was clicked with the new add event function %v.", event)
    target := web.a_get(event, "target")
    defer web.free(target)
    web.remove_event_listener("click", target, data)
}