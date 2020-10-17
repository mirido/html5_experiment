// Copyright (c) 2016-2020, mirido
// All rights reserved.

import { dump_event } from './dbg-util';

'use strict';

function init_wnd(): void {
    // https://developer.mozilla.org/ja/docs/Web/API/Element/mousedown_event

    // isDrawing が真のとき、マウスを動かすと線を描く
    let isDrawing = false;
    let x = 0;
    let y = 0;

    const myPics: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('overlay');
    const context = myPics.getContext('2d');

    // event.offsetX, event.offsetY はキャンバスの縁からのオフセットの (x,y) です。

    // mousedown, mousemove, mouseup にイベントリスナーを追加
    myPics.addEventListener('mousedown', (e: Event) => {
        if (e instanceof MouseEvent) {
            dump_event('mousedown', e);
            x = e.offsetX;
            y = e.offsetY;
            isDrawing = true;
        }
    });

    myPics.addEventListener('mousemove', e => {
        if (isDrawing === true) {
            drawLine(context, x, y, e.offsetX, e.offsetY);
            x = e.offsetX;
            y = e.offsetY;
        }
    });

    window.addEventListener('mouseup', e => {
        dump_event('mouseup', e);
        if (isDrawing === true) {
            drawLine(context, x, y, e.offsetX, e.offsetY);
            x = 0;
            y = 0;
            isDrawing = false;
        }
    });

    function drawLine(context: any, x1: number, y1: number, x2: number, y2: number): void {
        context.beginPath();
        context.strokeStyle = 'black';
        context.lineWidth = 1;
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();
        context.closePath();
    }
}

window.onload = init_wnd;
