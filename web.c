#include "web.h"

// using C as a scripting language for the web.
void __IMPL_window_console_log(char* val){
    __window_console_log(val);
}
void __IMPL_window_console_error(char* val){
    __window_console_error(val);
}