// Copyright (c) 2016-2020, mirido
// All rights reserved.

const target_id = "png_test";

function my_onload(): void {
    const elem: HTMLElement = document.getElementById(target_id);
    console.log(`elem=${elem}\n`);

    elem.style.display = "block";
    elem.style.position = "absolute";
    elem.style.left = "300";
    elem.style.right = "400";
    elem.style.background = "orange";
    elem.style.width = "640px";
    elem.style.height = "480px";
    // elem.style.padding = "50px";
    elem.style.margin = "40px";
    elem.innerText = "Hello World!";
    const r: DOMRect = elem.getBoundingClientRect();
    console.log(`bound=(${r.x}, ${r.y}, ${r.width}, ${r.height})\n`)
    console.log(`bounds=${elem.getClientRects()}\n`)

}

window.onload = my_onload;
