#!/bin/bash
# set -e
odin build . -target:js_wasm32

# rm -rf main.wasm.tmp*
# wasm-objdump -x main.wasm