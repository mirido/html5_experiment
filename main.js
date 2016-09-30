'use strict';

const {app, BrowserWindow} = require('electron');
const shell = require('electron').shell;

let win;

function createWindow() {
    win = new BrowserWindow({width: 350, height: 500});
    win.loadURL('file://' + __dirname + '/index.html');
//  win.webContents.openDevTools();

    win.on('closed', function() {
        win = null;
    });
};

app.on('ready', function () {
    createWindow();
});

app.on('window-all-closed', function() {
    // macOSの場合ウィンドウを全部閉じても終了しない
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', function() {
    // macOSの場合ウィンドウがないときはドックのアイコンをクリックしてウィンドウを開く
    if (win === null) {
        createWindow();
    }
});
