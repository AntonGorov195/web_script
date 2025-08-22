package web

JSValue :: distinct int
JSFunc :: JSValue
JSArray :: JSValue
HTMLElement :: JSValue

foreign import "web_odin"
@(default_calling_convention="contextless")
@(private)
foreign web_odin {
	// Temporary code
	_console_log :: proc(text: string) ---
	_console_log_int :: proc(num: int) ---
	_alloc_element_by_id :: proc(id: string) -> HTMLElement ---
	_add_click_lister :: proc(elem: HTMLElement, f: JSValue) ---
	// Reading
	_value_string_len_bytes::proc(val: JSValue) -> int --- // -1 if this isn't a string
	_read_value_string::proc(val: JSValue, buf: [^]byte) --- // write ths string into the buffer
	_read_int::proc(val: JSValue) -> int ---
	// Allocating 
	_alloc_read_value::proc(val: JSValue, key: string) -> JSValue ---
	_alloc_empty_array::proc() -> JSValue ---
	_alloc_empty_obj::proc() -> JSValue ---
	_alloc_int::proc(val: int) -> JSValue ---
	_alloc_string::proc(val: string) -> JSValue ---
	_alloc_export_func::proc(name: string) -> JSValue ---
	_alloc_combo_all_func::proc(func: JSValue) -> JSValue ---
	_free_js::proc(val: JSValue) ---
	// Other
	_push_array::proc(arr: JSValue, val: JSValue) ---
	_get_window :: proc() -> JSValue ---
}
// TODO: Make this accept any
console_log::proc "contextless" (text: string) {
	_console_log(text)
}
console_log_int::proc "contextless" (num: int) {
	_console_log_int(num)
}
alloc_element_by_id::proc "contextless" (id: string) -> (elem: HTMLElement, found: bool) {
	elem = _alloc_element_by_id(id)
	return elem, elem != 0
}
inner_text::proc(elem: HTMLElement, allocator := context.allocator) -> string {
	jstext := _alloc_read_value(elem, "innerText")
	defer free_js(jstext)
	length := _value_string_len_bytes(jstext)
	buf := make([]byte, length, allocator=allocator)
	_read_value_string(jstext, raw_data(buf))
	return string(buf)
}
value_to_string::proc(val: JSValue, allocator := context.allocator) -> string{
	length := _value_string_len_bytes(val)
	buf := make([]byte, length, allocator=allocator)
	_read_value_string(val, raw_data(buf))
	return string(buf)
}
free_js::proc(val: JSValue) {
	_free_js(val)
}
alloc_add_on_click::proc(elem: HTMLElement, func: string, userData: rawptr) {
	f := _alloc_read_value(elem, "addEventListener")
	defer free_js(f)

	
	// // Get event listener func
	// f := _alloc_read_value(elem, "addEventListener")
	// defer free_js(f)
	// // prepare args
	// arr := _alloc_empty_array()
	// defer free_js(arr)
	// event_name := _alloc_string("click")
	// defer free_js(event_name)
	// _push_array(arr, event_name)
	// func_val := _alloc_export_func(func)
	// defer free_js(func_val)
	// // _push_array(arr, func_name_value)
	// _add_click_lister(elem, func_val)
	// userData_val := _alloc_int(transmute(int)userData)
	// defer free_js(userData_val)
	// _push_array(arr, userData_val)
	// call func
	// remove_handle := _alloc_call_func(f, arr)
	// return remove_handle
}
alloc_read_value::proc(val: JSValue, key:string) -> JSValue {
	return _alloc_read_value(val, key)
}