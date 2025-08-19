// function readString(ptr) {
//     const buffer = new Uint8Array(memory.buffer);
//     let str = "";
//     while (buffer[ptr] !== 0) {
//         str += String.fromCharCode(buffer[ptr++]);
//     }
//     return str;
// }

// let wasm;
// let memory;
// function wasmLoad(fileName) {
//     memory = new WebAssembly.Memory({ initial: 100, maximum: 1000 });

//     const table = new WebAssembly.Table({ initial: 2, element: "anyfunc", maximum: 10 });
//     var imports = {
//         env: {
//             __window_console_log_int: function (arg) { console.log(arg); },
//             __window_console_log: function (arg) { console.log(readString(arg)); },
//             memory: memory,
//             __indirect_function_table: table,
//         }
//     };

//     var request = new XMLHttpRequest();
//     request.open("GET", fileName);
//     request.responseType = "arraybuffer";
//     request.send();

//     request.onload = function () {
//         const WINDOW_CONSOLE_LOG_IDX = 1;
//         const PTR_SIZE = 4; // bytes
//         const WINDOW_STRUCT_SIZE = PTR_SIZE;
//         const CONSOLE_STRUCT_SIZE = PTR_SIZE;

//         var wasmSource = request.response;
//         var wasmModule = new WebAssembly.Module(wasmSource);
//         var wasmInstance = new WebAssembly.Instance(wasmModule, imports);
//         wasm = wasmInstance.exports;

//         console.log(wasmInstance);
//         const buffer = new Uint32Array(memory.buffer);

//         const number_offset = 0;
//         buffer[number_offset] = 0;
//         const window_offset = 1;
//         const console_offset = window_offset + 1;
//         buffer[window_offset] = console_offset * PTR_SIZE;
//         buffer[console_offset] = WINDOW_CONSOLE_LOG_IDX;

//         // Call wasm
//         table.set(WINDOW_CONSOLE_LOG_IDX, wasmInstance.exports.__IMPL_window_console_log)
//         wasm.hello(window_offset * PTR_SIZE);
//     }
// } 
// wasmLoad("main.wasm");
