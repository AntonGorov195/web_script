#ifndef _WEB_H_
#define _WEB_H_

typedef void(*LogFunc)(char*);
typedef void(*ErrorFunc)(char*);
typedef struct Console {
    LogFunc log;
    ErrorFunc error;
} Console;
typedef struct Window {
    Console* console;
} Window; 
extern void __window_console_log_int(int);
extern void __window_console_log(char*);
extern void __window_console_error(char*);

#endif // _WEB_H_