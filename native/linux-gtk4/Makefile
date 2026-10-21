CC ?= gcc
CFLAGS += -std=c11 -Wall -Wextra -Werror -O2
GLIB_CFLAGS := $(shell pkg-config --cflags glib-2.0)
GLIB_LIBS := $(shell pkg-config --libs glib-2.0)
GTK_CFLAGS := $(shell pkg-config --cflags gtk4)
GTK_LIBS := $(shell pkg-config --libs gtk4)
.PHONY: all test smoke clean
all: build/goreecloud-memos-native-linux
build:
	mkdir -p build
build/goreecloud-memos-native-linux: app.c model.c model.h | build
	$(CC) $(CFLAGS) $(GTK_CFLAGS) -o $@ app.c model.c $(GTK_LIBS)
build/test-model: tests/test-model.c model.c model.h | build
	$(CC) $(CFLAGS) $(GLIB_CFLAGS) -o $@ tests/test-model.c model.c $(GLIB_LIBS)
test: build/test-model
	./build/test-model
smoke: all
	@timeout 5 xvfb-run -a ./build/goreecloud-memos-native-linux >/dev/null 2>build/smoke-stderr.log; result=$$?; if [ $$result -eq 124 ]; then echo 'Native GTK4 window stayed alive for 5 seconds'; else cat build/smoke-stderr.log; exit $$result; fi
clean:
	rm -rf build
