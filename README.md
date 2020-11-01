# PaintBBS NEO Next Generation (PNG)
Copyright (c) 2016-2020, mirido
All rights reserved.

# Introduction
This software is picture drawing tool wich works on web browser.

It aimed to bring the good picture drawing environment on anyware of the World Wide Web.

# System requirement
Any major web browser based upon HTML5.

# How to use
Currentry easy installation package is not prepared. (Very sorry.)

You must install build tool first, and build from source code to try this software. 

## Get source code
Download repository by the known means well in the GitHub.

## Install build tool
1. Install `node.js`.
1. Open command prompt (on Windows).
1. Type next command.
    ```bat:Install node package
    npm i -D webpack webpack-cli typescript ts-loader
    ```
1. If you will not only use this software but also develop (or debug) it, do following step additionally.
    1. Install `VSCode`.
    1. Open VSCode.
    1. Download following extensions with extension palette.
        * ESLint
        * HTMLLint
        * Live Server
        * Debugger for Chrome (or Edge)

    (There are linters and debug environment. So not necessary when you only run this software.)

## Build this software
1. Open command prompt (on Windows).
1. Type next command.
    ```bat:Install node package
    npm run build
    ```
    (If you open the workspace of this software with VSCode, you may press `Ctrl+Shift+B` to achieve it.)

## Run this software
1. Double click the file `index.html` in workspace.<br>(Or open the html with Live Server on VSCode.)

## Debug this software
1. If you will develop (or debug) it, do operation of `Debugging in Visual Studio Code`.

## *** NOTICE! ***
Following description of this document may be little old.
Therefore you should be careful when referring it.
I think I'll correct it soon.

## 概要
PaintBBS互換品をHTML5 + javascriptで書く企画。

既設のお絵かき掲示板を、サーバー側の変更を要さずそのまま利用する投稿ツールとしての形態を目指す。

ソースコードは修正BSDライセンスのもとで公開する。（COPYRIGHTファイル参照。）

## 最新状況
- 2016-11-15 V0.05 alpha
  - 「元に戻す」（Undo）機能と「やり直し」（Redo）機能を追加した。

## 使い方
html5_experiment/index.htmlをブラウザで開いて起動する。

投稿ボタン押下またはCTRL+キャンバスクリックで、レイヤ結合画像がウィンドウの下部に出る。これを右クリックして画像として保存することで、ローカル保存ができる。

なお、ネット上のお絵かき掲示板への投稿を行う場合は、miridoが作業中のPaintBBS NEOのフォークしたリポジトリに投稿機能付きの統合版があるので、そちらを参照のこと。

## スクリーンショット

![スクリーンショット](https://github.com/mirido/html5_experiment/blob/master/_screenshot/app_image.png)


## ドキュメント
0. \_doc/interface_speccification.md -- インターフェース仕様書


## ファイル構成

### 汎用ライブラリ
0. dbg-util.js -- デバッグ用関数集。
0. geometry.js -- 幾何学関数集。
0. graphics.js -- グラフィック描画関数集。
0. imaging.js -- 画像処理関数集。
0. ui-util.js -- GUI構成用関数およびクラス集。

### アプリ固有のクラスライブラリ
0. picture-canvas.js -- お絵かき領域を表すPictureCanvasクラス他。
0. tool-palette.js -- ツールパレットを表すPoolPaletteクラス他。
0. oebi-tools.js -- ツールパレットに乗るツールのクラス集。
0. ui-element.js -- PaintBBS互換GUIのフレームワーク。

### スタイルシート
0. default_style.css
0. oebi_pane.css

### プログラムのエントリポイント
0. index.html -- 最初にブラウザで開くファイル。
0. index.js -- index.htmlのロード完了時に呼ばれるinit_wnd()を定義する。

# 更新履歴

- 2016-09-26
  - funige氏のPaintBBS NEOのソースコードを見てHTML5の可能性を知った。


- 2016-10-01
  - 当プロジェクト開始。


- 2016-10-02
  - canvasの重ねあわせ表示を実現した。
  - PaintBBS風レイアウトを実現した。
  - 当該canvas上の画像の合成処理を実現した。


- 2016-10-09
  - 鉛筆ツールを部分的に実装した。<BR>PaintBBSにおける鉛筆ツールに当たる箇所をクリックすると選択状態がトグルする。<BR>選択状態になるとき画面下部の「線の太さ」選択ボックスの値を反映する。<BR>※ 後述するインターフェース仕様書に従い構造を変更中。


- 2016-10-18 V0.02 alpha
  - 鉛筆ツール、カラーパレット、カラースライダ、線幅ツール、スポイトツールを実装した。PaintBBSと同様の連携動作をする。


- 2016-10-23 V0.03 alpha
  - マスクツールと逆マスクツールを実装した。


- 2016-11-08 V0.041 alpha
  - マスク（または逆マスク）有効状態におけるレイヤーの可視状態変更処理に問題があったので修正した。


- 2016-11-01 V0.04 alpha
  - レイヤー切替機能、塗り潰し（ペイント）ツール、消しペンツール、四角ツール、線四角ツールを追加した。

以上
