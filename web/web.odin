package web

import "core:fmt"
import "base:runtime"

HTMLElement :: JSValue

foreign import "web_odin"

@(default_calling_convention="contextless")
foreign web_odin {
    get_window :: proc() -> JSValue ---
    get_wasm :: proc() -> JSValue ---
    log_int :: proc(val: int) ---
}
a_val::proc{
    a_val_string,    
    a_val_f64,
    a_val_int,
}
a_val_string::proc "c"(val: string) -> JSValue {
    return a_string(val)
}
a_val_f64::proc "c"(val: f64) -> JSValue {
    val := val
    return a_f64(&val)
}
a_val_int::proc "c"(val: int) -> JSValue {
    val := val
    return a_int(&val)
}
as_int :: proc "c"(val: JSValue) -> int {
    out := 0
    read_int(val, &out)
    return out
}
as_f64 :: proc "c"(val: JSValue) -> f64 {
    out := 0.
    read_f64(val, &out)
    return out
}
as_string :: proc(val: JSValue, allocator := context.allocator) -> string {
    length := get_string_len(val)
    buf := make([]byte, length, allocator = allocator)
    read_bytes(val, buf)
    return string(buf)
}

logf::proc(f: string, args: ..any) {
    str := fmt.tprintf(f, ..args)

    global := get_global_this()
    console := a_get(global, "console")
    defer free(console)
    log := a_get(console, "log")
    defer free(log)
    arg := a_string(str)
    defer free(arg)
    log_out := a_invoke(log, { arg })
    defer free(log_out)
}

a_create_element::proc(tag: string) -> JSValue {
    global := get_global_this()
    document := a_get(global, "document")
    defer free(document)
    
    createFunc := a_get(document, "createElement")
    defer free(createFunc)

    tag := a_string(tag)
    defer free(tag)

    return a_invoke(createFunc, { tag })
}
a_get_element_by_id::proc(id: string) -> JSValue {
    global := get_global_this()
    document := a_get(global, "document")
    defer free(document)

    getFunc := a_get(document, "getElementById")
    defer free(getFunc)

    id := a_string(id)
    defer free(id)

    return a_invoke(getFunc, { id })
}
get_input_value_f64::proc(elem: JSValue) -> f64 {
    jsval := a_get(elem, "value")
    defer free(jsval)

    value: f64
    read_f64(jsval, &value)
    return value
}
add_event_listener::proc(elem: JSValue, event_name: string, func: proc(event: JSValue, userData: rawptr)) {
    addEvent := a_get(elem, "addEventListener")
    defer free(addEvent)

    event_name := a_string(event_name)
    defer free(event_name)


}
@(export)
_add_event_handler::proc"c"(args_arr: JSValue) {
    context = runtime.default_context()

}