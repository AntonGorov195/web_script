#!/bin/bash
# set -e
odin build . -out:main.wasm -target:js_wasm32 -extra-linker-flags:"--export-table"

# rm -rf main.wasm.tmp*
# wasm-objdump -x main.wasm