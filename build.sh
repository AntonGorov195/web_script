#!/bin/bash
set -e

clang \
	--target=wasm32 \
	-nostdlib \
	-O3 \
	-o /tmp/web.o \
	-c \
	web.c

wasm-ld \
	--no-entry \
	--export-all \
	--lto-O3 \
	--allow-undefined \
	--import-memory \
	--import-table \
	/tmp/web.o \
	-o web.wasm

clang \
	--target=wasm32 \
	-nostdlib \
	-O3 \
	-o /tmp/main.o \
	-c \
	main.c

wasm-ld \
	--no-entry \
	--export-all \
	--lto-O3 \
	--allow-undefined \
	--import-memory \
	--import-table \
	/tmp/main.o \
	-o main.wasm

rm -rf main.wasm.tmp*
#wasm-objdump -x main.wasm