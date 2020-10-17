// Copyright (c) 2016, mirido
// All rights reserved.

import { bShowAllProperty } from './app-def';

'use strict';

//
//	Debug util
//

/// イベントをダンプする。
export function dump_event(func: string, e: Event): void {
  console.log(`dump_event(): ${func}:`);
  if (bShowAllProperty) {
    // Show all property
    // コンソールをマルチラインモードにすると表示が自動で展開される。
    console.dir(e);
  } else {
    // Show major properties only

    if (e instanceof MouseEvent) {
      // e is MouseEvent.

      // Related window property
      console.log(`window: (pageXOffset, pageYOffset)=(${window.pageXOffset}, ${window.pageYOffset})`);

      // Standard properties
      console.log(`sender: ${e.target}`);
      console.log(`button: ${e.button}`);
      console.log(`screen: (${e.screenX}, ${e.screenY})`);
      console.log(`client: (${e.clientX}, ${e.clientY})`);
      console.log(`offset: (${e.offsetX}, ${e.offsetY})`);
      /*
        (NOTE)
        (e.screenX, e.screenY)は、モニタの左上点を原点とする座標。
        (e.clientX, e.clientY)は、HTMLページ左上点を原点とする座標。
        (e.clientX, e.clientY)とウィンドウのクライアント領域の左上点を原点とする座標は、
        HTMLページのスクロール量だけずれる。前者を後者に座標に変換するには、
        (e.clientX - window.pageXOffset, e.clientY - window.pageYOffset)
        とする。(pageXOffset、pageYOffsetはMouseEventではなくwindowから取得する。)
        マウスイベントを生じたDOMオブジェクト
        (イベントを登録したオブジェクトとは限らず、子でありえる)
        の左上点を原点とする座標をとりたいときは
        (e.offsetX, e.offsetY)とする。
      */

      // FireFox固有プロパティー
      {
        const e2: any = <any>e;
        const str_x = ('layerX' in e2) ? e2.layerX : "<undefined>";
        const str_y = ('layerY' in e2) ? e2.layerY : "<undefined>";
        console.log(` layer: (${str_x}, ${str_y})`);
      }

      // Key press status
      let str = "";
      if (e.shiftKey != undefined) {
        if (str.length > 0) { str += ", "; }
        str += `shift=${e.shiftKey}`
      }
      if (e.ctrlKey != undefined) {
        if (str.length > 0) { str += ", "; }
        str += `ctrl=${e.ctrlKey}`
      }
      if (e.altKey != undefined) {
        if (str.length > 0) { str += ", "; }
        str += `alt=${e.altKey}`
      }
      if (e.metaKey != undefined) {
        if (str.length > 0) { str += ", "; }
        str += `meta=${e.metaKey}`
      }
      console.log(`   key: ${str}`);

      // 従属プロパティー
      {
        const ofsX = e.clientX - window.pageXOffset;
        const ofsY = e.clientY - window.pageYOffset;
        console.log(`ciennt-window.offset=(${ofsX}, ${ofsY})`);
      }
    } else if (e instanceof KeyboardEvent) {
      // e is KeyboardEvent.

      console.log("m_bShiftDown=" + this.m_bShiftDown
        + ", this.m_bCtrlDown=" + this.m_bCtrlDown
        + ", this.m_bAltDown=" + this.m_bAltDown
        + ", this.m_bMetaDown=" + this.m_bMetaDown
      );
    } else {
      // e is unknown event.

      // Dump all property
      console.dir(e);
    }
  }
}

/// Assert関数。以下のコードを参考にTypeScript化したもの。
/// http://stackoverflow.com/questions/15313418/javascript-assert
export function assert(condition: boolean, message: string = "*** ERR ***"): void {
  if (!condition) {
    // 元のJSコードと違い、Errorクラスが未定義の可能性は無いため判定無しで使用する。
    throw new Error(message);
  }
}

/// 変数内容を簡単に確認するためのログ出力関数。
/// 変数fooとbarの値をダンプしたいとき、
/// eval(dbgv(['foo','bar']))と書く。
export function dbgv(vars: string[]) {
  let str_vars = '';
  for (let i = 0; i < vars.length; i++) {
    if (i <= 0) {
      str_vars += '\"';
    } else {
      str_vars += ' + \", ';
    }
    str_vars += (vars[i] + '=\" + (' + vars[i] + ')');
  }
  const cmd = "console.log(" + str_vars + ");";
  return cmd;
}
