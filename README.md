# PaintBBS NEO Next Generation (PNG)
Copyright (c) 2016, mirido
All rights reserved.

## 概要
PaintBBS互換品をHTML5 + javascriptで書く企画。

既設のお絵かき掲示板を、サーバー側の変更を要さずそのまま利用する投稿ツールとしての形態を目指す。

ソースコードは修正BSDライセンスのもとで公開する。（COPYRIGHTファイル参照。）

## 最新状況
- 2016-10-18 V0.02 alpha
  - 鉛筆ツール、カラーパレット、カラースライダ、線幅ツール、スポイトツールを実装した。PaintBBSと同様の連携動作をする。

## 使い方
html5_experiment/index.htmlをブラウザで開いて起動する。

投稿ボタン押下またはCTRL+キャンバスクリックで、レイヤ結合画像がウィンドウの下部に出る。これを右クリックして画像として保存することで、ローカル保存ができる。

なお、ネット上のお絵かき掲示板への投稿を行う場合は、miridoが作業中のPaintBBS NEOのフォークしたリポジトリに投稿機能付きの統合版があるので、そちらを参照のこと。

## スクリーンショット

![スクリーンショット](https://github.com/mirido/html5_experiment/blob/PaintBBS_NEO_Next_Generation/_screenshot/app_image.png?raw=true)

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


以上
