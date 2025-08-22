package main

import "./web"

main::proc() {
    web.console_log("Hello from wasm")
    btn, found := web.alloc_element_by_id("btn")
    if !found {
        web.console_log("button not found")
        return 
    }
    web.console_log_int(transmute(int)btn)
    web.alloc_add_on_click(btn, "clicked", nil)
    // _ = web.alloc_add_on_click(btn, "clicked", nil)
    web.console_log(web.inner_text(btn))
}
@(export)
clicked::proc(event: web.JSValue) {
    target := web.alloc_read_value(event, "target")
    defer web.free_js(target)

    inner_text := web.alloc_read_value(target, "innerText")
    defer web.free_js(inner_text)

    web.console_log(web.value_to_string(inner_text))
}