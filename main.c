#include"web.h"

// Usage code should look like:
void entry(Window* window) {
    window->console->log("Hello, world! This uses indirect function table!");
    window->console->error("This is an error message from wasm");
}