# HTML5実験アプリ インターフェース仕様 Ver.2

Copyright (c) 2016, mirido
All rights reserved.

## 概要

PaintBBSの機能を、
0. お絵かきキャンバス
0. ツールパレット
0. ツール
0. ポインティングイベント
0. 共通設定


の5種類に大別し、それぞれインターフェース仕様を規定する。

## インターフェース仕様

### お絵かきキャンバス

下記インターフェースを備える。

- 初期化と後始末
  0. コンストラクタ -- （特に規定無し）
  0. dispose() -- 保持する資源を解放する。


- 描画
  0. getLayer() -- カレントレイヤーへの参照を取得する。
  0. getBoundingDrawAreaRect() -- カレントレイヤーのクライアント座標を取得する。
  0. changeLayer() -- カレントレイヤーを変更する。
  0. setDrawer() -- 描画ツールを設定する。
  0. eraseCanvas() -- キャンバスを全クリアする。
  0. setVisibility() -- レイヤーの可視状態を設定する。


- 画像保存
  0. getJointImage() -- 全レイヤーを合成した画像を出力する。


- 画面レイアウト調整
  0. fitCanvas() -- ブラウザの表示領域が許す限り、画像サイズに合わせてキャンバスを拡大する。


### ツールパレット

- 初期化と後始末
  0. コンストラクタ -- 引数でお絵かきキャンバスへの参照を1個受け取る。
  0. dispose() -- 保持する資源を解放する。


- ツール選択
  0. getToolPaletteCanvas() -- Icon描画キャンバスへの参照を取得する。
  0. getBoundingDrawAreaRect() -- Icon描画キャンバスのクライアント座標を取得する。
  0. getCommonSetting() -- 共通描画設定（線幅や色等）への参照を取得する。


- 描画

  - （お絵かきキャンバスの描画インターフェースと同じ。）

### ツール

下記インターフェースを備える。

- 初期化と後始末
  0. コンストラクタ -- 引数でツールパレット系オブジェクトへの参照を受け取る。
  0. dispose() -- 保持する資源を解放する。
  0. ツール固有の初期化インターフェース -- ツール固有の初期化とアイコン描画を行う。選択状態、非選択状態のいずれかを引数で指定可能とする。


- ツール選択
  0. OnSelected() -- 当該ツールがポインタで選択されたとき呼ばれる。
  0. OnDiselected() -- 当該ツールが選択解除されたとき呼ばれる。
  0. OnPicked() -- 当該ツールが再ポイントされたとき呼ばれる。


3は、選択状態のみで呼ばれ、非選択状態では呼ばれないことを保証する。

- 描画
  0. OnDrawStart() -- ストローク開始時呼ばれる。
  0. OnDrawEnd() -- ストローク終了時呼ばれる。
  0. OnDrawing() -- ストローク中、ポインティングデバイスの移動につれ随時呼ばれる。


### ポインティングイベント

- 構築
  0. コンストラクタ -- お絵かきキャンバスかツールパレットへの参照と、DOM eventのイベントオブジェクトへの参照を渡す。

- メンバ
  0. m_sender -- コンストラクタに渡されたお絵かきキャンバスかツールパレットへの参照
  0. m_point -- m_senderが有するcanvas左上点を原点とする座標
  0. m_spkey -- 下記ビットフラグのOR
    + SpKey.KY_SHIFT -- SHIFTキー押下状態のときセット
    + SpKey.KY_CTRL -- CTRLキー押下状態のときセット
    + SpKey.KY_ALT -- ALTキー押下状態のときセット
    + SpKey.KY_META -- METAキー押下状態のときセット


ここで、m_senderはお絵かきキャンバスの描画インターフェースと同じインターフェースを備えるものとする。

### 共通設定

- 構築
  0. コンストラクタ -- お絵かきキャンバスのレイヤー枚数を引数で与える。（注意: 描画レイヤー2枚なら、背景を追加した枚数3を与える。）


- Setter/Getter
  0. getColor() -- 描画色を取得する。
  0. setColor() -- 描画色を設定する。
  0. getThickness() -- 線幅を取得する。
  0. setThickness() -- 線幅を設定する。
  0. getVisibility() -- お絵かきキャンバスのレイヤーの可視状態を取得する。
  0. setVisibility() -- お絵かきキャンバスのレイヤーの可視状態を設定する。

上記setterで本オブジェクトに対し設定する値とお絵かきキャンバスの状態はただちには連動せず、両者の同期はツールが責任を持って行う。

## シーケンス

### 構築時

0. お絵かきキャンバスが必要なDOMイベントハンドラを登録する。<BR>以降、お絵かきキャンバスのcanvas上でのポインティングイベント発生時、お絵かきキャンバスのイベントリスナが呼ばれる。

0. ツールパレットが下記を行う。
  0. コンストラクタ引数で与えられたお絵かきキャンバスへの参照を記憶する。<BR>以降、描画インターフェースの機能をお絵かきキャンバスに委譲可能となる。
  0. ツールパレットのcanvas上にツール別のアイコン領域を定める。
  0. ツールのコンストラクタにthisを渡してツールを構築する。
  0. ツール固有の初期化メソッドを呼び出す。
  0. ツールパレットが必要なDOMイベントハンドラを登録する。<BR>以降、ツールパレットのcanvas上でのポインティングイベント発生時、ツールパレットのイベントリスナが呼ばれる。

0. 上記2.3において、個々のツールのコンストラクタでは、引数で渡されたツールパレットへの参照を親オブジェクトとして記憶する。

0. 上記2.4において、個々のツールの初期化メソッドでは下記を行う。
  0. アイコン描画 -- 親オブジェクトのgetIconBounds()メソッドとgetToolPaletteCanvas()メソッドを使用する。
  0. 必要な初期化 -- 親オブジェクトのgetCommonSetting()メソッドを使用する。

### ツールの選択

0. ユーザーがツールパレットのどこかをクリックする。

0. ツールパレットがクリックされた座標を包含するアイコンを特定し、対応するツールのOnSelected()イベントを呼び出す。その際、ポインティングイベントオブジェクトを渡す。

0. アイコン描画 -- 上記2.4におけるアイコン描画ルーチンで、ツール選択状態のアイコンを描画する。

### 筆系の描画（鉛筆、水彩、トーン、ぼかし、覆い焼き、焼き込み）
※ それぞれ手書き、直線、BZ曲線有り。<BR>
(TBD)

### テキストの描画（テキスト）
(TBD)

### 範囲指定操作（四角、線四角、楕円、線楕円、レイヤ結合、角取り、左右反転、上下反転、傾け、消し四角）
(TBD)

### 範囲指定＋ポインティング（コピー）
(TBD)

### ポインティングのみ（全消し）
(TBD)

### CTRL+ポインティング（色ツール）
(TBD)

### 線幅変更
(TBD)

### 規定の三択（1 px黒/5 px白/10 px白）
(TBD)

### レイヤ選択
(TBD)
