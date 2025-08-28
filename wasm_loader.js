
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
 *      F32: (ptr: WasmPtr) => number,
 *      F64: (ptr: WasmPtr) => number,
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
 *      F32: (val: number, dst: WasmPtr) => void,
 *      F64: (val: number, dst: WasmPtr) => void,
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
        const alloc = wasm.jsmem.alloc;
        const free = wasm.jsmem.free;
        const jsval = wasm.jsmem.vals;
        alloc(null);
        const GLOBAL_THIS_ID = alloc(globalThis);
        const WASM_DATA_ID = alloc(wasm);
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
            F32: function (ptr) { return wasm.view().getFloat32(ptr, true) },
            F64: function (ptr) { return wasm.view().getFloat64(ptr, true) },
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
            Int: function (val, ptr) { wasm.intSize === 4 ? this.Int32(val, ptr) : this.Int64(val, ptr) },
            UInt: function (val, ptr) { wasm.intSize === 4 ? this.UInt32(val, ptr) : this.UInt64(val, ptr) },
            F32: function (val, ptr) { return wasm.view().setFloat32(ptr, val, true) },
            F64: function (val, ptr) { return wasm.view().setFloat64(ptr, val, true) },
        }
        wasm.imports = {
            js: {
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
            js_odin: {
                /** @type {(func_id: ValueId) => ValueId} */
                a_wrap_func: function (func_id) {
                    const func = jsval[func_id];
                    const wrap = (...args) => {
                        /** @type {ValueId[]} */
                        const args_id = [];
                        for (let i = 0; i < args.length; i++) {
                            args_id.push(alloc(args[i]));
                        }
                        const out = func(...args_id);
                        for (let i = 0; i < args_id.length; i++) {
                            free(args_id[i]);
                        }
                        return out;
                    }
                    return alloc(wrap);
                },
                /** @type {(func_id: ValueId) => ValueId} */
                a_unwrap_func: function () {
                    const func = jsval[func_id];
                    const unwrap = (...args_id) => {
                        /** @type {ValueId[]} */
                        const args = [];
                        for (let i = 0; i < args_id.length; i++) {
                            args.push(jsval[args_id[i]])
                        }
                        return func(...args);
                    }
                    return alloc(unwrap);
                },
                /** @type {(func: number, userData: WasmPtr) => ValueId} */
                a_export_func: function (func, userData) {
                    const exported = wasm.exports.__indirect_function_table.get(func);
                    return alloc((...args) => {
                        const id = alloc(args)
                        exported(id, userData)
                        free(id)
                    })
                },
                /** @type {(func_id: ValueId, args_ptr: WasmPtr, args_len: number) => ValueId} */
                a_invoke: function (func_id, args_ptr, args_len) {
                    const func = jsval[func_id]
                    const args = [];
                    for (let i = 0; i < args_len; i++) {
                        const arg_ptr = args_ptr + i * wasm.intSize;
                        const arg_id = wasm.reader.UInt(arg_ptr);
                        const arg = jsval[arg_id];
                        args.push(arg);
                    }
                    // return alloc(func.call(func._bound, ...args));
                    // func.bind(func._bound);
                    return alloc(func(...args));
                },
                /** @type {(func_id: ValueId, args_ptr: WasmPtr, args_len: number) => ValueId} */
                a_invoke_await: async function (func_id, args_ptr, args_len) {
                    const func = jsval[func_id]
                    const args = [];
                    for (let i = 0; i < args_len; i++) {
                        const arg_ptr = args_ptr + i * wasm.intSize;
                        const arg_id = wasm.reader.UInt(arg_ptr);
                        const arg = jsval[arg_id];
                        args.push(arg);
                    }
                    // return alloc(func.call(func._bound, ...args));
                    // func.bind(func._bound);
                    return alloc(await func(...args));
                },
                /** @type {(ptr: WasmPtr, len: number) => ValueId} */
                a_string: function (ptr, len) { return alloc(wasm.reader.String(ptr, len)) },
                /** @type {(ptr: WasmPtr) => ValueId} */
                a_int: function (ptr) { return alloc(wasm.reader.Int(ptr)) },
                /** @type {(ptr: WasmPtr) => ValueId} */
                a_f64: function (ptr) { return alloc(wasm.reader.F64(ptr)) },
                /** @type {() => ValueId} */
                a_obj: function () { return alloc({}) },
                /** @type {() => ValueId} */
                a_arr: function () { return alloc([]) },
                /** @type {(id: ValueId, dst: WasmPtr) => void} */
                read_string: function (id, dst) {
                    const val = jsval[id];
                    wasm.writer.String(val, dst)
                },
                /** @type {(id: ValueId, dst: WasmPtr) => void} */
                read_int: function (id, dst) {
                    const val = jsval[id];
                    wasm.writer.Int(val, dst)
                },
                /** @type {(id: ValueId, dst: WasmPtr) => void} */
                read_f64: function (id, dst) {
                    const val = jsval[id];
                    wasm.writer.F64(val, dst)
                },
                /** @type {(id: ValueId) => number} */
                get_string_len: function (id) {
                    const val = jsval[id];
                    const textEncoder = new TextEncoder();
                    return textEncoder.encode(val).length;
                },
                /** @type {() => ValueId} */
                get_global_this: function() {
                    return GLOBAL_THIS_ID;
                },
                /** @type {(id: ValueId, key_ptr: WasmPtr, key_len: number) => ValueId} */
                a_get: function (id, key_ptr, key_len) {
                    const val = jsval[id];
                    const key = wasm.reader.String(key_ptr, key_len);
                    let out = val[key];
                    if(typeof out === 'function') {
                        out = val[key].bind(val);
                    }
                    return alloc(out);
                },
                /** @type {(id: ValueId, key_ptr: WasmPtr, key_len: number, input_id: ValueId) => ValueId} */
                set: function (id, key_ptr, key_len, input_id) {
                    const val = jsval[id];
                    const key = wasm.reader.String(key_ptr, key_len);
                    val[key] = jsval[input_id];
                },
                /** @type {(id: ValueId, i: number) => ValueId} */
                a_arr_get: function (id, i) {
                    const val = jsval[id];
                    return alloc(val[i]);
                },
                /** @type {(id: ValueId, i: number, input_id: ValueId) => void} */
                arr_set: function (id, i, input_id) {
                    const val = jsval[id];
                    val[i] = jsval[input_id];
                },
                /** @type {(id: ValueId) => void} */
                free: function (id) {
                    free(id);
                }
            },
            web_odin: {
                /** @type {() => ValueId} */
                get_wasm: function () { return WASM_DATA_ID; },
                log_str: function (ptr, len) { console.log(wasm.reader.String(ptr, len)) },
                log_int: function (num) { console.log(num) },
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