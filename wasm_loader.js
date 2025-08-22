/** @type {{ default_imports:any, table: WebAssembly.Table, mem: WebAssembly.Memory, window_offset:number, view: DataView }} */
let wasmData = null;
async function DoWasm(path, entry) {
    const INT_SIZE = 4;
    let exports = {}
    if (entry === undefined) {
        entry = "entry";
    }
    function readBytes(ptr, len) {
        return new Uint8Array(wasmData.mem.buffer, ptr, Number(len));
    }
    function readString(ptr, len) {
        const bytes = readBytes(ptr, Number(len));
        return new TextDecoder().decode(bytes);
    }
    function readInt(ptr) {
        return wasmData.view.getInt32(ptr);
    }
    function writeString(value, destAddr) {
        const src = new TextEncoder().encode(value);
        const dst = new Uint8Array(wasmData.mem.buffer, destAddr, src.length);
        dst.set(src);
        return src.length;
    }
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
    async function initWasmData() {
        wasmData = {};
        wasmData.mem = new WebAssembly.Memory({ initial: 100, maximum: 1000 });
        view = new DataView(wasmData.mem.buffer);
        // await fetch("web.wasm").then(async (res) => {
        //     wasmData = {};
        //     wasmData.mem = new WebAssembly.Memory({ initial: 100, maximum: 1000 });
        // }).catch((err) => {
        //     console.error(err);
        // })
    }

    if (wasmData === null) {
        // Initialize std
        await initWasmData();
    }
    const WINDOW_INDEX = 1;
    /** @type { Array<any> } */
    const jsobjs = [];
    jsobjs.push(null);
    jsobjs.push(window);
    /** @type { Array<number> } */
    const jsobjs_free_list = [];
    function alloc(obj) {
        if (jsobjs_free_list.length === 0) {
            jsobjs.push(obj);
            return jsobjs.length - 1;
        }
        const index = jsobjs_free_list.pop();
        jsobjs[index] = obj;
        return index;
    }
    function free_js(obj_i) {
        if (obj_i === 0) {
            return;
        }
        jsobjs[obj_i] = null;
        jsobjs_free_list.push(obj_i);
    }
    var imports = {
        env: {
            memory: wasmData.mem,
        }, web_odin: {
            _console_log: function (ptr, len) { console.log(readString(ptr, len)) },
            _console_log_int: function (num) { console.log(num) },
            _alloc_element_by_id: function (ptr, len) {
                const id = readString(ptr, len);
                const elem = document.getElementById(id);
                return alloc(elem)
            },
            _get_window: function () {
                return WINDOW_INDEX;
            },
            _alloc_read_value: function (obj_i, ptr, len) {
                const key = readString(ptr, len);
                const obj = jsobjs[obj_i];
                return alloc(obj[key])
            },
            _value_string_len_bytes: function (obj_i) {
                /** @type {string} */
                const obj = jsobjs[obj_i];
                if (typeof obj !== "string") {
                    return -1;
                }
                const textEncoder = new TextEncoder();
                return textEncoder.encode(obj).length;
            },
            _read_value_string: function (obj_i, ptr) {
                const obj = jsobjs[obj_i];
                if (typeof obj !== "string") {
                    return -1;
                }
                writeString(obj, ptr);
            },
            _free_js: free_js,
            _alloc_empty_array: function () { return alloc([]) },
            _alloc_string: function (ptr, len) {
                return alloc(readString(ptr, len))
            },
            _alloc_int: function (val) { return alloc(val) },
            _push_array: function (arr_i, obj_i) { jsobjs[arr_i].push(jsobjs[obj_i]) },
            // Allocate exported function
            _alloc_export_func: function (ptr, len) { return alloc(exports[readString(ptr, len)]) },
            // Call function with an array of jsvalues
            _alloc_call_func: function (f_i, args_arr_i) {
                const f = jsobjs[f_i];
                const out = f(...jsobjs[args_arr_i]);
                if (out === undefined) {
                    return 0;
                }
                return alloc(out);
            },
            // 
            _alloc_invoke_func: function (f_i, args_ptr, ) {
                const f = jsobjs[f_i];
                const out = f(...jsobjs[args_arr_i]);
                if (out === undefined) {
                    return 0;
                }
                return alloc(out);
            },
            _add_click_lister: function (obj_i, f_i) {
                // get the clicked
                const f = jsobjs[f_i];
                // make a new function and bind clicked to it.
                const handler = (e) => {
                    // allocate the args
                    const e_val = alloc(e);
                    // get context
                    const odin_ctx = exports.default_context_ptr();
                    f(e_val, odin_ctx);
                    // free args.
                    free_js(e_val);
                };
                // Then add it as an event.
                jsobjs[obj_i].addEventListener("click", handler);
            },
            // allocates a new function which calls the inner function.
            _alloc_func: function(f_i, jsvalargs_) {
                // /** @type {(...args: number) => (...)} */
                // const f = jsobjs[f_i];
                return alloc((...args) => {
                    const args_vals = [];
                    for(const arg in args){
                        args_vals.push(alloc(arg));
                    }
                    f_i(...args_vals, ...jsvalargs);
                    for(const arg in args_vals){
                        free_js(arg);
                    }
                })
            }
            // Bind the args to the function.
            // Even after the args are free, the function will still own them.
            // _alloc_bind_func: function(f_i, args_ptr, args_count) {
            //     const f = jsobjs[f_i];
            //     const args = [];
            //     for(let i = 0; i < args_count; i++){
            //         args.push(readInt(args_ptr + INT_SIZE * i))
            //     }
            //     return alloc(() => {
            //         f(...args)
            //     });
            // }
        },
        odin_env: {
            write: (fd, ptr, len) => {
                const str = readString(ptr, len);
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
        }
    };

    fetch("c_web_scripting.wasm").then(async (res) => {
        var wasmModule = new WebAssembly.Module(await res.arrayBuffer());
        var wasmInstance = new WebAssembly.Instance(wasmModule, imports);
        wasmData.mem = wasmInstance.exports.memory;
        exports = wasmInstance.exports;
        wasmInstance.exports._start();
    }).catch((err) => {
        console.error(err)
    })
}

{ // Init wasm loaders
    // Right now I will have each script be isolated from one another
    // Later I will find how to get multiple scripts working together
}