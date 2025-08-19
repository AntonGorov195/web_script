/** @type {{ default_imports:any, table: WebAssembly.Table, mem: WebAssembly.Memory, window_offset:number }} */
let wasmData = null;
async function DoWasm(path, entry) {
    if (entry === undefined) {
        entry = "entry";
    }
    function readString(ptr) {
        const buffer = new Uint8Array(wasmData.mem.buffer);
        let str = "";
        while (buffer[ptr] !== 0) {
            str += String.fromCharCode(buffer[ptr++]);
        }
        return str;
    }

    async function initWasmData() {
        await fetch("web.wasm").then(async (res) => {
            wasmData = {};
            wasmData.mem = new WebAssembly.Memory({ initial: 100, maximum: 1000 });
            wasmData.table = new WebAssembly.Table({ initial: 3, element: "anyfunc", maximum: 10 });
            wasmData.default_imports = {
                __window_console_log_int: function (arg) { console.log(arg); },
                __window_console_log: function (arg) { console.log(readString(arg)); },
                __window_console_error: function (arg) { console.error(readString(arg)); },
            }
            var imports = {
                env: {
                    ...wasmData.default_imports,
                    memory: wasmData.mem,
                    __indirect_function_table: wasmData.table,
                }
            };
            const WINDOW_CONSOLE_LOG_IDX = 1;
            const WINDOW_CONSOLE_ERROR_IDX = 2;
            const PTR_SIZE = 4; // bytes
            const WINDOW_STRUCT_SIZE = PTR_SIZE;
            const CONSOLE_STRUCT_SIZE = 2 * PTR_SIZE;


            var wasmModule = new WebAssembly.Module(await res.arrayBuffer());
            var wasmInstance = new WebAssembly.Instance(wasmModule, imports);
            wasm = wasmInstance.exports;
            const buffer = new Uint32Array(wasmData.mem.buffer);
            let offset = 0;
            offset += PTR_SIZE;
            const window_offset = offset;
            offset += WINDOW_STRUCT_SIZE;
            const console_offset = offset;
            offset += CONSOLE_STRUCT_SIZE;
            buffer[window_offset / PTR_SIZE] = console_offset;
            buffer[console_offset / PTR_SIZE] = WINDOW_CONSOLE_LOG_IDX;
            buffer[console_offset / PTR_SIZE + 1] = WINDOW_CONSOLE_ERROR_IDX;
            wasmData.window_offset = window_offset
            wasmData.table.set(WINDOW_CONSOLE_LOG_IDX, wasmInstance.exports.__IMPL_window_console_log);
            wasmData.table.set(WINDOW_CONSOLE_ERROR_IDX, wasmInstance.exports.__IMPL_window_console_error);
        }).catch((err) => {
            console.error(err);
        })
    }

    console.log("Execute " + path + " with entry point: " + entry);
    if (wasmData === null) {
        // Initialize std
        await initWasmData();
        console.log("std initialized");
    }
    var imports = {
        env: {
            ...wasmData.default_imports,
            memory: wasmData.mem,
            __indirect_function_table: wasmData.table,
        }
    };

    fetch("main.wasm").then(async (res) => {
        var wasmModule = new WebAssembly.Module(await res.arrayBuffer());
        var wasmInstance = new WebAssembly.Instance(wasmModule, imports);
        wasmInstance.exports[entry](wasmData.window_offset);
    }).catch((err) => {
        console.error(err)
    })
}

{ // Init wasm loaders
    // Right now I will have each script be isolated from one another.
    // Later I will find how to get multiple scripts working together
}