// Copyright (c) 2016, mirido
// All rights reserved.

﻿'use strict';

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

/// 変数内容を簡単に確認するためのログ出力関数。
function dbgv(vars)
{
	let str_vars = '';
	for (let i = 0; i < vars.length; ++i) {
		if (i <= 0) {
			str_vars += '\"';
		} else {
			str_vars += ' + \", ';
		}
		str_vars += (vars[i] + '=\" + (' + vars[i] + ')');
	}
	let cmd = "console.log(" + str_vars + ");";
	return cmd;
}
