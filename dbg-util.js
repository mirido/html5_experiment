'use strict';

//
//	Debug util
//

/// イベントをダンプする。
function dump_event(func, e) {
	console.log("<" + func + "()>");
	if (true) {
		console.log("sender: " + e.sender);
		console.log("client: (" + e.client.x + ", " + e.client.y + ")");
		console.log("parent: (" + e.parent.x + ", " + e.parent.y + ")");
		console.log(" local: (" + e.local.x  + ", " + e.local.y  + ")");
	} else {
		console.dir(e);		// お手軽だが表示内容を見るにはコンソールにて手動で展開せねばならない。
	}
}

/// Assert関数。下記より拝借。
/// http://stackoverflow.com/questions/15313418/javascript-assert
function assert(condition, message) {
    if (!condition) {
        message = message || "Assertion failed";
        if (typeof Error !== "undefined") {
            throw new Error(message);
        }
        throw message; // Fallback
    }
}
