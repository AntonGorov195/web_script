package web

JSValue :: distinct int
ExportFunc :: proc "c"(args_arr: JSValue, user_data: rawptr) -> JSValue

foreign import "js_odin"

@(default_calling_convention="contextless")
foreign js_odin {
    a_wrap_func :: proc(func: JSValue) -> JSValue --- // read explanation below
    a_unwrap_func :: proc(func: JSValue) -> JSValue--- // read explanation below
    a_export_func :: proc(func: ExportFunc, user_data: rawptr) -> JSValue --- // read explanation  below
    a_invoke :: proc(func: JSValue, args: []JSValue) -> JSValue ---

    a_string :: proc(val: string) -> JSValue ---
    a_int :: proc(val: ^int) -> JSValue ---
    a_f64 :: proc(val: ^f64) -> JSValue ---
    a_obj :: proc() -> JSValue --- // empty object
    a_arr :: proc() -> JSValue --- // empty array
    
    read_int :: proc(val: JSValue, out: ^int) ---
    read_f64 :: proc(val: JSValue, out: ^f64) ---
    read_bytes :: proc(val: JSValue, buf: []byte) ---
    
    get_string_len :: proc(val: JSValue) -> int --- // in bytes
    get_global_this :: proc() -> JSValue ---

    a_get :: proc(obj:JSValue, key: string) -> JSValue ---
    set :: proc(obj:JSValue, key: string, value: JSValue) ---
    
    a_arr_get :: proc(arr:JSValue, index: int) -> JSValue ---
    arr_set :: proc(arr:JSValue, index: int, val: JSValue) ---

    free::proc(val: JSValue) ---
}

/*
    a_export_func - allocates the exported function from the function tables.
    a_wrap_func - allocate a new variadic function. 
        it converts temporarily all arguments to jsvalues and calls the inner function with them.
        Useful for js callbacks such as addEventListener.
        If we want to invoke an exported function we need a new function with parameter event.
        Then it wraps the event to a jsvalue calls the wasm function and then frees it.
        f :: (...jsval) -> jsval
        g :: (...rawjsval) -> rawjsval
        wrap(f) -> g 
    a_unwrap_func - the reverse of a_wrap_func.
        f :: (...jsval) -> jsval
        g :: (...rawjsval) -> rawjsval
        unwrap(g) -> f 
*/
