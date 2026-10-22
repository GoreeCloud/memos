CC ?= gcc
CFLAGS += -std=c11 -Wall -Wextra -Werror -O2
GLIB_CFLAGS := $(shell pkg-config --cflags glib-2.0)
GLIB_LIBS := $(shell pkg-config --libs glib-2.0)
GIO_CFLAGS := $(shell pkg-config --cflags gio-2.0)
GIO_LIBS := $(shell pkg-config --libs gio-2.0)
JSON_CFLAGS := $(shell pkg-config --cflags json-glib-1.0)
JSON_LIBS := $(shell pkg-config --libs json-glib-1.0)
CURL_CFLAGS := $(shell pkg-config --cflags libcurl)
CURL_LIBS := $(shell pkg-config --libs libcurl)
GTK_CFLAGS := $(shell pkg-config --cflags gtk4)
GTK_LIBS := $(shell pkg-config --libs gtk4)
.PHONY: all test smoke clean
all: build/goreecloud-memos-native-linux
build:
	mkdir -p build
build/goreecloud-memos-native-linux: app.c model.c model.h demo-feed.c demo-feed.h response.c response.h api.c api.h | build
	$(CC) $(CFLAGS) $(GTK_CFLAGS) $(JSON_CFLAGS) $(CURL_CFLAGS) -o $@ app.c model.c demo-feed.c response.c api.c $(GTK_LIBS) $(JSON_LIBS) $(CURL_LIBS)
build/test-model: tests/test-model.c model.c model.h | build
	$(CC) $(CFLAGS) $(GLIB_CFLAGS) -o $@ tests/test-model.c model.c $(GLIB_LIBS)
build/test-api: tests/test-api.c api.c api.h response.c response.h | build
	$(CC) $(CFLAGS) $(GIO_CFLAGS) $(JSON_CFLAGS) $(CURL_CFLAGS) -o $@ tests/test-api.c api.c response.c $(GIO_LIBS) $(JSON_LIBS) $(CURL_LIBS)
build/test-response: tests/test-response.c response.c response.h | build
	$(CC) $(CFLAGS) $(JSON_CFLAGS) -o $@ tests/test-response.c response.c $(JSON_LIBS)
build/test-demo-feed: tests/test-demo-feed.c demo-feed.c demo-feed.h response.c response.h model.c model.h | build
	$(CC) $(CFLAGS) $(JSON_CFLAGS) -o $@ tests/test-demo-feed.c demo-feed.c response.c model.c $(JSON_LIBS)
build/test-transport: tests/test-transport.c api.c api.h response.c response.h | build
	$(CC) $(CFLAGS) -DGC_API_TESTING $(GIO_CFLAGS) $(JSON_CFLAGS) $(CURL_CFLAGS) -o $@ tests/test-transport.c api.c response.c $(GIO_LIBS) $(JSON_LIBS) $(CURL_LIBS)
test: build/test-model build/test-api build/test-response build/test-demo-feed build/test-transport
	./build/test-model
	./build/test-api
	./build/test-response
	./build/test-demo-feed
	python3 tests/test-https-fixture.py ./build/test-transport
smoke: all
	@timeout 5 xvfb-run -a ./build/goreecloud-memos-native-linux >/dev/null 2>build/smoke-stderr.log; result=$$?; if [ $$result -eq 124 ]; then echo 'Native GTK4 window stayed alive for 5 seconds'; else cat build/smoke-stderr.log; exit $$result; fi
clean:
	rm -rf build
