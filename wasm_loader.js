
/**
 * @typedef { number } ValueId
 * @typedef { number } WasmPtr
 * @typedef {{ 
 *      imports: any, 
 *      exports: any, 
 *      mod: WebAssembly.Module,
 *      instance: WebAssembly.Instance,
 *      mem: WebAssembly.Memory, 
 *      jsmem: JSMem, 
 *      intSize: number, 
 *      view: () => DataView, 
 *      reader: WasmReader, 
 *      writer: WasmWriter 
 * }} WasmData
 * @typedef {{
 *      Bytes: (ptr: WasmPtr, len: number) => Uint8Array,
 *      String: (ptr: WasmPtr, len: number) => string,
 *      Int8: (ptr: WasmPtr) => number,
 *      UInt8: (ptr: WasmPtr) => number,
 *      Int16: (ptr: WasmPtr) => number,
 *      UInt16: (ptr: WasmPtr) => number,
 *      Int32: (ptr: WasmPtr) => number,
 *      UInt32: (ptr: WasmPtr) => number,
 *      Int64: (ptr: WasmPtr) => number,
 *      UInt64: (ptr: WasmPtr) => number,
 *      Int: (ptr: WasmPtr) => number,
 *      UInt: (ptr: WasmPtr) => number,
 * }} WasmReader
 * @typedef {{ 
 *      String: (val: string, dst: WasmPtr) => number, 
 *      Int8: (val: number, dst: WasmPtr) => void,
 *      UInt8: (val: number, dst: WasmPtr) => void,
 *      Int16: (val: number, dst: WasmPtr) => void,
 *      UInt16: (val: number, dst: WasmPtr) => void,
 *      Int32: (val: number, dst: WasmPtr) => void,
 *      UInt32: (val: number, dst: WasmPtr) => void,
 *      Int64: (val: number, dst: WasmPtr) => void,
 *      UInt64: (val: number, dst: WasmPtr) => void,
 *      Int: (val: number, dst: WasmPtr) => void,
 *      UInt: (val: number, dst: WasmPtr) => void,
 * }} WasmWriter
 * @typedef {{ 
 *      vals: any[], 
 *      freeList: number[], 
 *      alloc: (obj: any) => ValueId, 
 *      free: (id: ValueId) => void,
 * }} JSMem
 * 
 */

/**
 * 
 * @param {string} src path to the wasm file 
 * @param {any} extraImports extra wasm imports 
 * 
 * @returns {Promise<WasmData>}
 */
async function ExecWasm(src, extraImports) {
    // Console stuff
    const writeBuffers = {};
    writeBuffers[false] = { buf: "", print: console.log }; // log
    writeBuffers[true] = { buf: "", print: console.error }; // error
    const writeToConsole = (line, isError) => {
        if (!line) {
            return;
        }
        for (const char of line) {
            const b = writeBuffers[isError];
            if (char === "\n") {
                b.print(b.buf);
            } else {
                b.buf += char;
            }
        }
    };
    function stripNewline(str) {
        return str.replace(/\n/, ' ')
    }

    /** @type { WasmData } */
    const wasm = {};
    { // Init
        wasm.intSize = 4;
        wasm.mem = new WebAssembly.Memory({ initial: 100, maximum: 1000 });
        wasm.jsmem = {
            vals: [],
            freeList: [],
            alloc: function (val) {
                if (val === undefined) {
                    return 0;
                }
                if (wasm.jsmem.freeList.length === 0) {
                    wasm.jsmem.vals.push(val);
                    return wasm.jsmem.vals.length - 1;
                }
                const id = wasm.jsmem.freeList.pop();
                wasm.jsmem.vals[id] = val;
                return id;
            },
            free: function (id) {
                if (id === 0) {
                    return;
                }
                wasm.jsmem.vals[id] = null;
                wasm.jsmem.freeList.push(id);
            },
        };
        wasm.jsmem.alloc(null);
        const WINDOW_ID = wasm.jsmem.alloc(window);
        wasm.view = function () { return new DataView(wasm.mem.buffer) };
        wasm.reader = {
            Bytes: (ptr, len) => {
                return new Uint8Array(wasm.mem.buffer, ptr, len);
            },
            String: (ptr, len) => {
                const bytes = wasm.reader.Bytes(ptr, len);
                return new TextDecoder().decode(bytes);
            },
            Int8: function (ptr) { return wasm.view().getInt8(ptr) },
            UInt8: function (ptr) { return wasm.view().getUint8(ptr) },
            Int16: function (ptr) { return wasm.view().getInt16(ptr, true) },
            UInt16: function (ptr) { return wasm.view().getUint16(ptr, true) },
            Int32: function (ptr) { return wasm.view().getInt32(ptr, true) },
            UInt32: function (ptr) { return wasm.view().getUint32(ptr, true) },
            Int64: function (ptr) { return wasm.view().getInt64(ptr, true) },
            UInt64: function (ptr) { return wasm.view().getUint64(ptr, true) },
            Int: function (ptr) { return wasm.intSize === 4 ? this.Int32(ptr) : this.Int64(ptr) },
            UInt: function (ptr) { return wasm.intSize === 4 ? this.UInt32(ptr) : this.UInt64(ptr) },
        }
        wasm.writer = {
            // Return length will differ on ascii
            String: function (val, buf) {
                const src = new TextEncoder().encode(val);
                const dst = new Uint8Array(wasm.mem.buffer, buf, src.length);
                dst.set(src);
                return src.length;
            },
            // writeUint8(val, ptr) { wasm.view().setUint8(ptr, val); },
            Int8: function (val, ptr) { wasm.view().setInt8(ptr, val) },
            UInt8: function (val, ptr) { wasm.view().setUint8(ptr, val) },
            Int16: function (val, ptr) { wasm.view().setInt16(ptr, val, true) },
            UInt16: function (val, ptr) { wasm.view().setUint16(ptr, val, true) },
            Int32: function (val, ptr) { wasm.view().setInt32(ptr, val, true) },
            UInt32: function (val, ptr) { wasm.view().setUint32(ptr, val, true) },
            Int64: function (val, ptr) { wasm.view().setInt64(ptr, val, true) },
            UInt64: function (val, ptr) { wasm.view().setUint64(ptr, val, true) },
            Int: function (val, ptr) { wasm.intSize === 4 ? this.Int32(ptr, val) : this.Int64(ptr, val) },
            UInt: function (val, ptr) { wasm.intSize === 4 ? this.UInt32(ptr, val) : this.UInt64(ptr, val) },
        }
        wasm.imports = {
            env: {
                memory: wasm.mem,
            },
            odin_env: {
                write: (fd, ptr, len) => {
                    const str = wasm.reader.String(ptr, len);
                    if (fd == 1) {
                        writeToConsole(str, false);
                        return;
                    } else if (fd == 2) {
                        writeToConsole(str, true);
                        return;
                    } else {
                        throw new Error("Invalid fd to 'write'" + stripNewline(str));
                    }
                },
            },
            web_odin: {
                /** @type {(ptr: WasmPtr, len: number) => void} */
                _console_log: function (ptr, len) { console.log(wasm.reader.String(ptr, len)) },
                /** @type {(val: number) => void} */
                _console_log_int: function (num) { console.log(num) },

                /** @type {(id_ptr: WasmPtr, id_len: number) => ValueId} */
                _alloc_element_by_id: function (id_ptr, id_len) {
                    const id = wasm.reader.String(id_ptr, id_len)
                    const elem = document.getElementById(id);
                    return wasm.jsmem.alloc(elem)
                },
                /** @type {(btn_id:ValueId, func_id: ValueId) => void} */
                _add_click_lister: function (btn_id, func_id) {
                    /** @type {(event: MouseEvent, ctx: WasmPtr) => void} */
                    // TODO: type checking
                    const func = wasm.jsmem.vals[func_id];
                    const handler = (e) => {
                        const e_id = wasm.jsmem.alloc(e);
                        func(e_id, wasm.exports.default_context_ptr())
                        wasm.jsmem.free(e_id);
                    }
                    wasm.jsmem.vals[btn_id].addEventListener("click", handler)
                },
                /** @type {(id: ValueId) => number} */
                _value_string_len_bytes: function (id) {
                    /** @type {string} */
                    const str = wasm.jsmem.vals[id];
                    if (typeof str !== "string") {
                        return -1;
                    }
                    const textEncoder = new TextEncoder();
                    return textEncoder.encode(str).length;
                },
                /** @type {(id: ValueId, buf: WasmPtr) => number} */
                _read_value_string: function (id, buf) {
                    const str = wasm.jsmem.vals[id];
                    if (typeof str !== "string") {
                        return -1;
                    }
                    wasm.writer.String(str, buf);
                },
                /** @type {(id: ValueId) => number} */
                _read_int: function (id) {
                    console.error("Not implemented _read_int");
                },
                /** @type {(id: ValueId, ptr: WasmPtr, len: number) => ValueId} */
                _alloc_read_value: function (id, ptr, len) {
                    const key = wasm.reader.String(ptr, len);
                    const value = wasm.jsmem.vals[id]
                    return wasm.jsmem.alloc(value[key])
                },
                /** @type {(val: number)=>ValueId} */
                _alloc_empty_array: function () { return wasm.jsmem.alloc([]) },
                /** @type {(val: number)=>ValueId} */
                _alloc_empty_obj: function () { return wasm.jsmem.alloc({}) },
                /** @type {(val: number)=>ValueId} */
                _alloc_int: function (val) { return wasm.jsmem.alloc(val) },
                /** @type {(id_ptr: WasmPtr, id_len: number)=>ValueId} */
                _alloc_string: function (ptr, len) { return wasm.jsmem.alloc(wasm.reader.String(ptr, len)) },
                /** @type {(name_ptr: WasmPtr, name_len: number)=>ValueId} */
                _alloc_export_func: function (name_ptr, name_len) {
                    const name = wasm.reader.String(name_ptr, name_len);
                    return wasm.jsmem.alloc(wasm.exports[name]);
                },
                /** @type {(id: ValueId) => void} */
                _free_js: function (id) { wasm.jsmem.free(id) },
                /** @type {() => ValueId} */
                _get_window: function () {
                    return WINDOW_ID;
                },
                /** @type {(arr_id: ValueId, item_id: ValueId)} */
                _push_array: function (arr_id, item_id) {
                    wasm.jsmem.vals[arr_id].push(wasm.jsmem.vals[item_id]);
                },
                /**
                 * Takes a function and allocates a new one.
                 * The new function converts all args into JSValues and calls the input function.
                 * The args are allocated temporarily.
                 * @type {(func_id: ValueId) => ValueId} 
                 */
                _alloc_wrapper_func: function (func_id) {
                    const func = wasm.jsmem.vals[func_id];
                    const wrapper = (...args) => {
                        const args_as_id = [];
                        for (let i = 0; i < args.length; i++) {
                            const arg_id = wasm.jsmem.alloc(args[i]);
                            args_as_id.push(arg_id);
                        }
                        func(...args_as_id)
                        for (let i = 0; i < args.length; i++) {
                            wasm.jsmem.free(args_as_id[i]);
                        }
                    }
                    return wasm.jsmem.alloc(wrapper);
                },
                /**
                 * args points to an array of JSValues.
                 * Unwrap them and call the function with them. 
                 * @type {(func_id: ValueId, args_ptr: WasmPtr, args_len: number) => ValueId} 
                 * */
                _alloc_unwrapper_func: function (func_id, args_ptr, args_len) {
                    const func = wasm.jsmem.vals[func_id];
                    const args = [];
                    for (let i = 0; i < args_len; i++) {
                        const id = wasm.reader.UInt(args_ptr + i * wasm.intSize);
                        args.push(wasm.jsmem.vals[id]);
                    }
                    return wasm.jsmem.alloc(func(...args));
                },
            },
            ...extraImports,
        };
        wasm.exports = {} // none yet 
    }

    return fetch(src).then(async (res) => {
        wasm.mod = new WebAssembly.Module(await res.arrayBuffer());
        wasm.instance = new WebAssembly.Instance(wasm.mod, { ...wasm.imports });
        wasm.mem = wasm.instance.exports.memory;
        wasm.exports = wasm.instance.exports;
        wasm.exports._start();
        return wasm
    })
}