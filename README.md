# PaintBBS NEO Next Generation (PNG)
## 概要
PaintBBS互換品をHTML5 + javascriptで書く企画。

既設のお絵かき掲示板を、サーバー側の変更を要さずそのまま利用する投稿ツールとしての形態を目指す。

## 最新状況
- 2016-10-09
  - 鉛筆ツールを部分的に実装した。<BR>PaintBBSにおける鉛筆ツールに当たる箇所をクリックすると選択状態がトグルする。<BR>選択状態になるとき画面下部の「線の太さ」選択ボックスの値を反映する。<BR>※ 後述するインターフェース仕様書に従い構造を変更中。

## 起動方法
html5_experiment/index.htmlをブラウザで開く。

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

### アプリ固有のクラスライブラリ
0. picture-canvas.js -- お絵かき領域を表すPictureCanvasクラス他。
0. tool-palette.js -- ツールパレットを表すPoolPaletteクラス他。
0. oebi-tools.js -- ツールパレットに乗るツールのクラス集。

### スタイルシート
0. default_style.css
0. oebi_pane.css

### インデックスファイル
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


以上
