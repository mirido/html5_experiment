// Copyright (c) 2016, mirido
// All rights reserved.

import {
  utest_pre_rendering,
  utest_ImagePatch,
  utesst_ColorConversion,
  utest_canvas_2d_context,
  utest_get_mask_image,
  utest_half_tone
} from './_doc/utest.js';
import {
  dump_event,
  assert,
  dbgv
} from './dbg-util.js';
import {
  get_guide_image,
  get_mirror_image,
  get_vert_flip_image,
  blend_image,
  fill_image,
  make_opaque,
  erase_single_layer,
  putImageDataEx,
  erase_canvas,
  copy_layer,
  get_destinaton_out_image,
  get_mask_image,
  fix_image_w_mask,
  get_joint_image
} from './imaging.js';
import {
  jsPoint,
  jsRect,
  JsPoint,
  JsRect,
  decode_rect,
  encode_to_rect,
  encode_to_rect_in_place,
  clip_coords,
  clip_rect_in_place,
  clip_rect,
  get_outbounds,
  get_common_rect,
  get_chv_dist,
  get_mht_dist,
  rect_includes,
  rects_have_common
} from './geometry.js';
import {
  pre_render_pixel,
  pre_render_square,
  put_point,
  put_point_1px,
  draw_line_w_plot_func,
  draw_line,
  draw_line_w_runtime_renderer,
  draw_line_1px,
  draw_rect,
  draw_rect_R,
  draw_circle,
  FloodFillState,
  get_max_run_len_histogram,
  get_halftone_definition,
  gen_halftones
} from './graphics.js';
import {
  getBrowserType,
  unify_rect,
  get_getBoundingClientRectWrp,
  conv_page_client_to_wnd_client,
  get_color_as_RGB,
  get_color_as_RGBA,
  get_components_from_RGBx,
  get_cursor_color,
  add_to_unique_list,
  remove_from_unique_list,
  PointManager,
  register_pointer_event_handler,
  change_selection,
  ThicknessSelector,
  KeyStateManager,
  draw_icon_face,
  draw_icon_face_ex,
  draw_icon_face_wrp,
  draw_icon_ex,
  draw_icon_wrp,
  draw_color_palette,
  MicroSlideBar,
  ListBox
} from './ui-util.js';
import {
  ImagePatch,
  DrawerBase,
  NullDrawOp,
  NullEffect,
  NullCursor,
  DrawOp_FreeHand,
  DrawOp_Rectangle,
  DrawOp_RectCapture,
  DrawOp_BoundingRect,
  EffectBase01,
  Effect_Pencil,
  Effect_Eraser,
  Effect_PencilRect,
  Effect_RectPaste,
  Effect_RectEraser,
  Effect_FlipRect,
  Effect_Halftone,
  CursorBase01,
  Cursor_Circle,
  Cursor_Square,
  History,
  UndoButton,
  RedoButton
} from './ui-element.js';
import {
  PointingEvent,
  PointingEventClone,
  VirtualClickEvent,
  modify_click_event_to_end_in_place,
  PictureCanvas
} from './picture-canvas.js';
import {
  DrawToolBase,
  PencilTool,
  FillRectTool,
  LineRectTool,
  CopyTool,
  MirrorTool,
  VertFlipTool,
  EraseTool,
  EraseRectTool,
  ThicknessTool,
  ColorPalette,
  ColorCompoTool,
  MaskTool,
  get_layer_no,
  PaintTool,
  LayerTool
} from './oebi-tool.js';
// import {
// 	CommonSetting,
// 	ToolChain,
// 	addToolHelper,
// 	ToolPalette
// } from './tool-palette.js';

import {
  g_pointManager,
  g_keyStateManager,
  g_pictureCanvas,
  g_toolPalette,
  g_paintTool,
  g_history,
  g_UndoButton
} from './index.js';

'use strict';

//
//  CommonSetting
//

// Description:
// ツール選択変更時も保存される、描画処理共通の設定を表す。
// 値の変更は、特定のツールが行う。
//   例: 描画色の変更メソッドsetColor()は、カラーピッカーツールが専ら呼び出す。
// 値の取得は、描画開始イベント受信(OnDrawStart()呼び出し)タイミングで、
// ツール個別に最新値を取得する。

const ToolType = {
  TL_Pencil: 0,
  TL_WaterColor: 1,
  TL_Eraser: 2,
  TL_Independent: 98,
  TL_Standard: 99
};

/// 新しいインスタンスを初期化する。
export function CommonSetting(nlayers) {
  this.m_toolType = ToolType.TL_Standard;

  // ツール別線幅メモリ
  this.m_thicknessDic = {};
  this.m_thicknessDic[ToolType.TL_Pencil] = 1;
  this.m_thicknessDic[ToolType.TL_Eraser] = 5;

  // 設定値
  this.m_color = 'rgb(0, 0, 0)';        // 描画色
  this.m_alpha = 255;                   // α値
  this.m_thickness = 1;                 // 線幅
  this.m_curLayerNo = 0;                // カレントレイヤー
  this.m_layerVisibility = [];          // レイヤーの可視属性
  for (let i = 0; i < nlayers; ++i) {
    this.m_layerVisibility[i] = true;
  }
  this.m_maskColor = this.m_color;      // マスク色

  // 設定変更リスナのリスト
  this.m_changeListeners = [];

  // Selection boxとの連動(暫定処置)
  // this.m_thicknessSelector = new ThicknessSelector();

  // イベント発行制御
  this.m_editingObjs = {};
  this.m_bEditing = false;
  this.m_bChanged = false;
}

/// イベントハンドラを呼び出す。
CommonSetting.prototype.callListener = function () {
  for (let i = 0; i < this.m_changeListeners.length; ++i) {
    if (this.m_changeListeners[i].OnSettingChanged) {
      this.m_changeListeners[i].OnSettingChanged(this);
    }
  }
}

// Getter, Setter
// 下記において、設定変更通知のために
// グローバル変数g_pictureCanvasを使っている。(Ad-hoc)
CommonSetting.prototype.getColor = function () { return this.m_color; }
CommonSetting.prototype.setColor = function (value) {
  if (this.m_color == value)
    return;
  this.m_color = value;
  this.callListener();
  if (this.m_bEditing) {
    this.m_bChanged = true;
  } else {
    g_pictureCanvas.raiseLayerFixRequest();   // 作業中レイヤー固定要求
  }
}
CommonSetting.prototype.getAlpha = function () { return this.m_alpha; }
CommonSetting.prototype.setAlpha = function (value) {
  this.m_alpha = value;
  this.callListener();
}
CommonSetting.prototype.getThickness = function () {
  // this.m_thickness = this.m_thicknessSelector.getThickness();
  return this.m_thickness;
}
CommonSetting.prototype.setThickness = function (value) {
  this.m_thickness = value;
  // this.m_thicknessSelector.setThickness(this.m_thickness);
  this.callListener();
}
CommonSetting.prototype.getMaskColor = function () { return this.m_maskColor; }
CommonSetting.prototype.setMaskColor = function (value) {
  this.m_maskColor = value;
  // this.callListener();   // 需要が無いのでイベント通知省略。
}
CommonSetting.prototype.getNumLayers = function () { return this.m_layerVisibility.length; }
CommonSetting.prototype.getLayerVisibility = function (layerNo) {
  return this.m_layerVisibility[layerNo];
}
CommonSetting.prototype.setLayerVisibility = function (layerNo, bVisible) {
  if (this.m_layerVisibility[layerNo] == bVisible)
    return;
  this.m_layerVisibility[layerNo] = bVisible;
  if (this.m_bEditing) {
    this.m_bChanged = true;
  } else {
    g_pictureCanvas.raiseLayerFixRequest();   // 作業中レイヤー固定要求
    g_pictureCanvas.setLayerVisibility(layerNo, bVisible);  // レイヤー可視属性変更
  }
}
CommonSetting.prototype.getCurLayerNo = function () { return this.m_curLayerNo; }
CommonSetting.prototype.setCurLayerNo = function (layerNo) {
  if (this.m_curLayerNo == layerNo)
    return;
  this.m_curLayerNo = layerNo;
  if (this.m_bEditing) {
    this.m_bChanged = true;
  } else {
    let nextLayer = g_pictureCanvas.getLayer(layerNo);
    g_pictureCanvas.raiseLayerFixRequest(nextLayer);  // 作業中レイヤー固定要求(兼レイヤー変更予告)
    g_pictureCanvas.changeLayer(layerNo);     // カレントレイヤー変更
  }
}

/// 設定をシステム全体に周知する。
CommonSetting.prototype.source = function () {
  this.callListener();

  let layerNo = this.m_curLayerNo;
  let nextLayer = g_pictureCanvas.getLayer(layerNo);
  g_pictureCanvas.raiseLayerFixRequest(nextLayer);  // 作業中レイヤー固定要求(兼レイヤー変更予告)
  for (let i = 0; i < this.m_layerVisibility.length; ++i) {
    let bVisible = this.m_layerVisibility[i];
    g_pictureCanvas.setLayerVisibility(i, bVisible);  // レイヤー可視属性変更
  }
  g_pictureCanvas.changeLayer(layerNo);     // カレントレイヤー変更
}

/// イベントハンドラを追加する。
CommonSetting.prototype.addListener = function (listener) {
  add_to_unique_list(this.m_changeListeners, listener);
}

/// イベントハンドラを削除する。
CommonSetting.prototype.removeListener = function (listener) {
  remove_from_unique_list(this.m_changeListeners, listener);
}

/// ツール別設定を切り替える。
CommonSetting.prototype.selectTool = function (toolType) {
  if (toolType != ToolType.TL_Standard && toolType == this.m_toolType)
    return;

  // 現在の値をツール別に記憶
  switch (this.m_toolType) {
    case ToolType.TL_Pencil:
    case ToolType.TL_WaterColor:
    case ToolType.TL_Standard:
      this.m_thicknessDic[ToolType.TL_Pencil] = this.getThickness();
      break;
    case ToolType.TL_Eraser:
      this.m_thicknessDic[ToolType.TL_Eraser] = 5;
      break;
    default:
      /*NOP*/
      break;
  }

  // ツール選択切替
  this.m_toolType = toolType;

  // 設定切替
  let thickness, alpha;
  switch (toolType) {
    case ToolType.TL_Pencil:
    case ToolType.TL_Standard:
      thickness = this.m_thicknessDic[ToolType.TL_Pencil];
      alpha = 255;
      break;
    case ToolType.TL_WaterColor:
      thickness = this.m_thicknessDic[ToolType.TL_Pencil];
      alpha = Math.floor(3.0908 * thickness + 243.13);
      break;
    case ToolType.TL_Eraser:
      thickness = this.m_thicknessDic[ToolType.TL_Eraser];
      alpha = this.getAlpha();
      break;
    default:
      thickness = this.getThickness();
      alpha = this.getAlpha();
      break;
  }

  // 実際に設定
  this.setThickness(thickness);
  this.setAlpha(alpha);
}

/// 設定値の編集を開始する。(編集中はイベント発生無し。)
CommonSetting.prototype.beginEdit = function (objId) {
  // console.log(this.m_editingObjs);
  assert(!(objId in this.m_editingObjs));
  this.extendEdit(objId);
}

/// 設定値の編集を延長する。(編集中はイベント発生無し。)
CommonSetting.prototype.extendEdit = function (objId) {
  // console.log(this.m_editingObjs);
  this.m_editingObjs[objId] = true;
  this.m_bEditing = true;
}

/// 設定値の編集を終了する。
CommonSetting.prototype.endEdit = function (objId) {
  // console.log(this.m_editingObjs);
  assert(objId in this.m_editingObjs);
  this.releaseEdit(objId);
}

/// 設定値の編集を終了する。
CommonSetting.prototype.releaseEdit = function (objId) {
  // console.log(this.m_editingObjs);
  delete this.m_editingObjs[objId];
  if (Object.keys(this.m_editingObjs).length <= 0) {
    this.m_bEditing = false;
    if (this.m_bChanged) {
      this.source();
      this.m_bChanged = false;
    }
  }
}

//
//  ToolChain
//

// Description:
// ツールパレット上で同一のアイコン区画(iconBounds)を占めるツール群を保持する。
// 自身のiconBounds外のポインティングイベントは無視する。
// 自身のiconBounds内でポインティングイベントがあれば、ツールへのイベント発行を行う。
// 本クラスは、ツールAに対しOnSelected()を呼んだ後、
// 次のツールBのOnSelected()を呼ぶ前に、
// 必ずAに対してOnDiselected()を呼ぶ。
// (同じツールについて、OnSelected()とOnDiselected()が対で呼ばれることを保証する。)

/// 新しいインスタンスを初期化する。
export function ToolChain(iconBounds) {
  this.m_iconBounds = iconBounds;
  this.m_tools = [];
  this.m_curToolNo = 0;
  this.m_bActive = false;
}

/// アクティブにする。
ToolChain.prototype.activate = function (toolPalette, /*[opt]*/ targetObj) {
  let iconBounds = this.m_iconBounds;
  let mod_e = new VirtualClickEvent(toolPalette, iconBounds);

  // 対象指定有り時の処理
  if (targetObj != null) {    // (具体的対象指定有り)
    // 対象検索
    for (let i = 0; i < this.m_tools.length; ++i) {
      if (this.m_tools[i] == targetObj) {     // (対象発見)
        let tgToolNo = i;
        if (tgToolNo == this.m_curToolNo) {   // (現在選択中または最後に選択したツールと同じ)
          // VirtualClickEvent()で目的のツールを確実にアクティブにするため、
          // 一旦選択を解除する。(テクニックに走りすぎ;)
          this.inactivate(toolPalette);
        }
        this.OnSelection(mod_e, tgToolNo);    // this.m_tools[tgToolNo]が確実に非アクティブ→アクティブに遷移する。
        return true;
      }
    }
    return false;
  }

  // ポインティング開始を通知
  this.OnSelection(mod_e);

  // ポインティング終了を通知
  modify_click_event_to_end_in_place(mod_e);
  this.OnPointingEnd(mod_e);

  return true;
}

/// 非アクティブにする。
ToolChain.prototype.inactivate = function (toolPalette) {
  let mod_e = new VirtualClickEvent(toolPalette, null);
  this.OnSelection(mod_e);
}

/// イベントが管轄内か否か判定する。
/// 検索用で、OnSelection()より軽量。
ToolChain.prototype.isInControl = function (e) {
  let bIncludes = rect_includes(this.m_iconBounds, e.m_point);
  return bIncludes;
}

/// ツール選択変更時にツールパレットから呼ばれる。
ToolChain.prototype.OnSelection = function (e, /*[opt]*/ targetToolNo) {
  let bHit = false;
  let bIncludes = rect_includes(this.m_iconBounds, e.m_point);
  // console.dir(this.m_iconBounds);
  // console.dir(e.m_point);

  // 場合分け
  let action = null;
  let cur_idx = null;
  let nxt_idx = null;
  if (e.m_spKey != 0x0) {   // (特殊キー押下有り)
    bHit = true;
    action = (this.m_bActive) ? 2 : 1;
    cur_idx = this.m_curToolNo;
  } else if (!this.m_bActive) {  // (非選択状態)
    if (bIncludes && this.m_tools.length > 0) {
      bHit = true;
      if (targetToolNo != null) {
        this.m_curToolNo = targetToolNo;  // カレントツール強制変更
      }
      action = 1;         // カレントツールのアクティブ化
      cur_idx = this.m_curToolNo;
    }
  } else {                // (選択状態)
    cur_idx = this.m_curToolNo;
    if (bIncludes) {
      bHit = true;

      // 次のツールがあるか?
      if (targetToolNo != null) {
        nxt_idx = targetToolNo;   // 切替先ツール強制変更
      } else {
        nxt_idx = (cur_idx + 1) % this.m_tools.length;
      }
      if (nxt_idx == cur_idx) {
        action = 2;       // カレントツールのpick
      } else {
        if (e.m_type == 'mousedown' || e.m_type == 'touchstart') {
          action = 3;     // 当ツールチェーン内の次のツールに変更
        } else {
          action = 2;     // カレントツールのpick
        }
      }
    } else {
      action = 4;         // 当ツールチェーンの選択解除
    }
  }
  // console.log("action=" + action);
  // eval(dbgv([ 'this.m_bActive', 'bIncludes' ]));
  // eval(dbgv([ 'nxt_idx' ]));
  // if (nxt_idx != null) {
  //   eval(dbgv([ 'this.m_tools[nxt_idx].m_faceText' ]));
  // }

  // イベント発行
  if (action != null) {
    // イベント発行
    switch (action) {
      case 1:   // カレントツールのアクティブ化
        this.m_bActive = true;
        e.m_sender.attatchImage();    // (Undo/Redo)
        this.m_tools[cur_idx].OnSelected(e);
        // console.dir(this.m_iconBounds);
        break;
      case 2:   // カレントツールのpick
        assert(this.m_bActive);
        this.m_tools[cur_idx].OnPicked(e);
        break;
      case 3:   // 当ツールチェーン内の次のツールに変更
        assert(this.m_bActive);
        this.m_tools[cur_idx].OnDiselected(e);
        this.m_curToolNo = nxt_idx;
        e.m_sender.attatchImage();    // (Undo/Redo)
        this.m_tools[nxt_idx].OnSelected(e);
        break;
      case 4:   // 当ツールチェーンの選択解除
        this.m_tools[cur_idx].OnDiselected(e);
        this.m_bActive = false;
        break;
      default:
        assert(false);
        break;
    }
  }

  return bHit;
}

/// クリック後、またはドラッグ後に呼ばれる。
ToolChain.prototype.OnPointingEnd = function (e) {
  if (this.m_bActive) {
    let curTool = this.m_tools[this.m_curToolNo];
    if (curTool.OnPointingEnd != null) {
      curTool.OnPointingEnd(e);
    }
  }
}

/// ツールを追加する。
/// toolObjはOnSelected(), OnPicked(), OnDiselected()の3メソッドを備える前提。
ToolChain.prototype.addTool = function (toolObj) {
  let end_idx = this.m_tools.length;
  this.m_tools[end_idx] = toolObj;
}

/// Icon描画領域を取得する。
ToolChain.prototype.getIconBounds = function () {
  return this.m_iconBounds;
}

/// ツールチェーン内のアクティブなツールを返す。(Undo/Redo)
ToolChain.prototype.getActiveTool = function () {
  if (this.m_bActive) {
    return this.m_tools[this.m_curToolNo];
  } else {
    return null;
  }
}

//
//  ToolPalette
//

// ■ ToolPalette
// 複数のツールを保持し、アクティブか否かを変更する。
// ツールに対するポインタイベントがあれば、当該ツールや関連するツールに通知する。
// アクティブなツールにキャンバスからのポインタイベントを配送する。

// ツール配置マップ
const g_toolMap = [
  // px1'	py1'	width	height
  [0, 0, 50, 21],  // [ 0] 鉛筆 ...
  [0, 22, 50, 21],  // [ 1] トーン ...
  [0, 44, 50, 21],  // [ 2] 四角 ...
  [0, 66, 50, 21],  // [ 3] コピー ...
  [0, 88, 50, 21],  // [ 4] 消しペン ...
  [0, 110, 50, 21],  // [ 5] 手書き ...
  [0, 132, 50, 21],  // [ 6] 通常 ...
  [0, 154, 24, 20],  // [ 7] 白色
  [26, 154, 24, 20],  // [ 8] 黒色
  [0, 175, 24, 20],  // [ 9] 灰色
  [26, 175, 24, 20],  // [10] 茶色
  [0, 196, 24, 20],  // [11] 紫色
  [26, 196, 24, 20],  // [12] 紅色
  [0, 217, 24, 20],  // [13] 青色
  [26, 217, 24, 20],  // [14] ピンク色
  [0, 238, 24, 20],  // [15] 黄色
  [26, 238, 24, 20],  // [16] 水色
  [0, 259, 24, 20],  // [17] 緑色
  [26, 259, 24, 20],  // [18] 橙色
  [0, 280, 24, 20],  // [19] 肌色1
  [26, 280, 24, 20],  // [20] 肌色2
  [0, 301, 50, 15],  // [21] R
  [0, 317, 50, 15],  // [22] G
  [0, 333, 50, 15],  // [23] B
  [0, 349, 50, 15],  // [24] A
  [0, 365, 50, 35],  // [25] px_width
  [0, 402, 50, 15],  // [26] bk_wt1_wt5
  [0, 421, 50, 22]   // [27] Layer
];

// カラーパレットの定義
const colorPaletteDef = [
  [7, 'rgb(255,255,255)'],
  [8, 'rgb(0,0,0)'],
  [9, 'rgb(136,136,136)'],
  [10, 'rgb(180,117,117)'],
  [11, 'rgb(192,150,192)'],
  [12, 'rgb(250,0,10)'],
  [13, 'rgb(128,128,255)'],
  [14, 'rgb(255,182,255)'],
  [15, 'rgb(231,229,141)'],
  [16, 'rgb(37,199,201)'],
  [17, 'rgb(153,203,123)'],
  [18, 'rgb(231,150,45)'],
  [19, 'rgb(249,221,207)'],
  [20, 'rgb(252,236,226)']
];

// ツールチェーンの独立群
const toolChainGroups = [
  [0, 1, 2, 3, 4],  // エフェクト
  [5],  // 描画オペレータ
  [6],  // マスク
  [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], // カラーパレット
  [21, 22, 23, 24],   // カラースライダ
  [25], // 線幅
  [26], // 描画プリセット
  [27]  // レイヤー選択
];

// 外部ツールと背反なツールチェーンのグループ番号
const exclusiveToolChainGroupIndices = [
  0,  // エフェクト
  6   // 描画プリセット
];

/// ツール登録のためのヘルパ関数。
export function addToolHelper(toolChain, toolName, toolId, toolDic) {
  let iconBounds = toolChain.getIconBounds();
  const uri = "./oebi-tool.js";
  const cmd
    // = "import(\"" + uri + "\").then((module) => {});";
    = "async function call() {"
    + "  await import(\"" + uri + "\").then((module) => {"
    + "    const toolObj = new module." + toolName + "(iconBounds);"
    + "    toolChain.addTool(toolObj);"
    + "    toolDic[toolId] = toolObj;"
    + "  });"
    + "}; call();";
  eval(cmd);
}

/// 新しいインスタンスを初期化する。
export function ToolPalette(pictCanvas) {
  // DOMオブジェクト取得
  this.m_palette = document.getElementById("tool_palette");

  // 関連オブジェクト記憶
  this.m_pictCanvas = pictCanvas;

  // 初期化パラメータ
  const n = g_toolMap.length;
  const nlayers = this.m_pictCanvas.getNumLayers();

  // ツールマップ作成
  // sx, sy, ex, eyは領域全体の左上点と右下終端点を示し、
  // 直後に行うパレット大きさ調整に使う。
  this.m_toolMap = [];
  let sx, sy, ex, ey;
  {
    let rect = g_toolMap[0];    // Alias
    sx = rect[0], sy = rect[1], ex = rect[2], ey = rect[3];
  }
  for (let i = 0; i < n; ++i) {
    let rect = g_toolMap[i];    // Alias
    sx = Math.min(sx, rect[0]);
    sy = Math.min(sy, rect[1]);
    ex = Math.max(ex, rect[0] + rect[2]);
    ey = Math.max(ey, rect[1] + rect[3]);
    let iconBounds = jsRect(rect[0], rect[1], rect[2], rect[3]);
    this.m_toolMap[i] = new ToolChain(iconBounds);
    // console.dir(toolBounds[i]);
  }

  // パレットの大きさ調整
  // console.log("sx=" + sx + ", sy=" + sy);
  assert(sx == 0 && sy == 0);
  let width = ex;
  let height = ey;
  this.m_palette.setAttribute('width', width);
  this.m_palette.setAttribute('height', height);

  // 共通設定メモリ準備
  this.m_setting = new CommonSetting(nlayers);
  this.m_setting.source();

  // パレット初期描画
  // このステップは暫定処置で、将来的には無くす予定。
  // (ツールアイコン区画内の描画は個々のツールに完全委譲する。)
  this.drawToolChainBounds(width, height);

  // ツールチェーン初期化
  this.m_layerTool = null;    // (Undo/Redo)
  this.m_maskTools = [];      // (Undo/Rddo)
  this.m_normalTool = null;   // (Undo/Redo)
  this.initToolChain();

  // 初期表示
  // addToolHelper()順序とは無関係にツールチェーン内の初期表示を定めるためには、
  // ツールチェーンのactivate()を呼ぶ必要がある。
  // 原則初期表示において画面にアイコンが現れるツールのみactivate()すれば良いが、
  // イベントリスナ登録させるためにactivate()しているものもある。(例: 線幅ツール)
  this.m_toolMap[toolChainGroups[0][2]].activate(this);   // 四角ツール(一旦有効化)
  this.m_toolMap[toolChainGroups[0][2]].inactivate(this); // 四角ツール(戻す)
  this.m_toolMap[toolChainGroups[0][3]].activate(this);   // コピーツール(一旦有効化)
  this.m_toolMap[toolChainGroups[0][3]].inactivate(this); // コピーツール(戻す)
  this.m_toolMap[toolChainGroups[0][4]].activate(this);   // 消しペンツール(一旦有効化)
  this.m_toolMap[toolChainGroups[0][4]].inactivate(this); // 消しペンツール(戻す)
  this.m_toolMap[toolChainGroups[0][0]].activate(this);   // 鉛筆ツール
  this.m_toolMap[toolChainGroups[1][0]].activate(this);   // 手書きツール
  this.m_toolMap[toolChainGroups[2][0]].activate(this);   // 通常ツール
  this.m_toolMap[toolChainGroups[3][1]].activate(this);   // カラーパレットの黒色
  this.m_toolMap[toolChainGroups[5][0]].activate(this);   // 線幅
  this.m_selToolChainIdxOf = [];
  this.m_selToolChainIdxOf[0] = toolChainGroups[0][0];    // 独立群[0]の選択ツール
  this.m_selToolChainIdxOf[1] = toolChainGroups[1][0];    // 独立群[1]の選択ツール
  this.m_selToolChainIdxOf[2] = toolChainGroups[2][0];    // 独立群[2]の選択ツール
  this.m_selToolChainIdxOf[3] = toolChainGroups[3][1];    // 独立群[3]の選択ツール
  this.m_selToolChainIdxOf[5] = toolChainGroups[5][0];    // 独立群[3]の選択ツール

  // 外部ツール
  this.m_extTool = null;

  // イベントハンドラ登録
  this.m_curToolChainIdx = null;
  this.m_bDragging = false;
  register_pointer_event_handler(this.m_palette, this);

  // コンテキストメニュー無効化
  // http://tmlife.net/programming/javascript/javascript-right-click.html
  this.m_palette.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  }, false);

  // 操作履歴
  // attatchHistory()メソッドで設定する。
  this.m_history = null;    // (Undo/Redo)
}

/// ツールチェーンの枠線を描く。
ToolPalette.prototype.drawToolChainBounds = function (width, height) {
  let ctx = this.m_palette.getContext('2d');
  ctx.fillStyle = "rgba(232, 239, 255, 255)";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgb(0, 0, 0)";
  ctx.fillStyle = "rgb(0, 0, 0)";
  ctx.lineWidth = 1;
  for (let i = 0; i < this.m_toolMap.length; ++i) {
    let rect = this.m_toolMap[i].getIconBounds();
    if (false) {   // この条件はtrue/falseどちらでも良い。
      // HTML5の矩形描画機能を使用
      ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width, rect.height);
    } else {
      // 自作のdraw_rect_R()使用
      draw_rect_R(rect, ctx);
    }
  }
}

/// ツールチェーンを初期化する。
ToolPalette.prototype.initToolChain = function () {
  // ツールアイコン区画をツールに割付け
  let toolDic = {};
  addToolHelper(this.m_toolMap[0], 'PencilTool', 0, toolDic);
  addToolHelper(this.m_toolMap[2], 'FillRectTool', 200, toolDic);
  addToolHelper(this.m_toolMap[2], 'LineRectTool', 201, toolDic);
  addToolHelper(this.m_toolMap[3], 'CopyTool', 300, toolDic);
  addToolHelper(this.m_toolMap[3], 'MirrorTool', 303, toolDic);
  addToolHelper(this.m_toolMap[3], 'VertFlipTool', 304, toolDic);
  addToolHelper(this.m_toolMap[4], 'EraseTool', 400, toolDic);
  addToolHelper(this.m_toolMap[4], 'EraseRectTool', 401, toolDic);
  addToolHelper(this.m_toolMap[6], 'MaskTool', 600, toolDic);
  addToolHelper(this.m_toolMap[6], 'MaskTool', 601, toolDic);
  addToolHelper(this.m_toolMap[6], 'MaskTool', 602, toolDic);
  addToolHelper(this.m_toolMap[25], 'ThicknessTool', 2500, toolDic);
  for (let i = 0; i < colorPaletteDef.length; ++i) {
    let idx = colorPaletteDef[i][0];
    let id = idx * 100;
    addToolHelper(this.m_toolMap[idx], 'ColorPalette', id, toolDic);
  }
  addToolHelper(this.m_toolMap[21], 'ColorCompoTool', 2100, toolDic);
  addToolHelper(this.m_toolMap[22], 'ColorCompoTool', 2200, toolDic);
  addToolHelper(this.m_toolMap[23], 'ColorCompoTool', 2300, toolDic);
  addToolHelper(this.m_toolMap[24], 'ColorCompoTool', 2400, toolDic);
  addToolHelper(this.m_toolMap[27], 'LayerTool', 2700, toolDic);
  // console.dir(toolDic);
  // console.dir(this.m_toolMap[25]);

  // ツール固有の初期化
  toolDic[0].show(this.m_setting, this.m_palette);        // 鉛筆ツール
  toolDic[200].show(this.m_setting, this.m_palette);      // 四角ツール
  toolDic[201].show(this.m_setting, this.m_palette);      // 線四角ツール
  toolDic[300].show(this.m_setting, this.m_palette);      // コピーツール
  toolDic[303].show(this.m_setting, this.m_palette);      // 左右反転ツール
  toolDic[304].show(this.m_setting, this.m_palette);      // 上下反転ツール
  toolDic[400].show(this.m_setting, this.m_palette);      // 消しペンツール
  toolDic[401].show(this.m_setting, this.m_palette);      // 消しペンツール
  toolDic[600].show(this.m_setting, 0, this.m_palette);   // 通常ツール
  toolDic[601].show(this.m_setting, 1, this.m_palette);   // マスクツール
  toolDic[602].show(this.m_setting, 2, this.m_palette);   // 逆マスクツール
  toolDic[2500].show(this.m_setting, this.m_palette);     // 線幅ツール
  for (let i = 0; i < colorPaletteDef.length; ++i) {
    let idx = colorPaletteDef[i][0];
    let id = idx * 100;
    let color = colorPaletteDef[i][1];
    toolDic[id].show(color, false, this.m_palette);   // カラーパレット1
  }
  toolDic[2100].show(this.m_setting, 0, this.m_palette);  // R
  toolDic[2200].show(this.m_setting, 1, this.m_palette);  // G
  toolDic[2300].show(this.m_setting, 2, this.m_palette);  // B
  toolDic[2400].show(this.m_setting, 3, this.m_palette);  // A
  toolDic[2700].show(this.m_setting, this.m_palette);     // レイヤーツール

  this.m_layerTool = toolDic[2700];       // (Undo/Redo)
  this.m_maskTools.push(toolDic[601]);    // (Undo/Redo)
  this.m_maskTools.push(toolDic[602]);    // (Undo/Redo)
  this.m_normalTool = toolDic[600];       // (Undo/Redo)
}

/// ドラッグ開始処理。
ToolPalette.prototype.OnDraggingStart = function (mod_e) {
  let bHit = false;

  // イベント通知すべきグループを特定
  let selGroupIdx = null;
  let selToolChainIdx = null;
  for (let k = 0; k < toolChainGroups.length; ++k) {
    let indicesInGroup = toolChainGroups[k]
    for (let i = 0; i < indicesInGroup.length; ++i) {
      let idx = indicesInGroup[i];
      let bPreHit = this.m_toolMap[idx].isInControl(mod_e);
      if (bPreHit) {
        selGroupIdx = k;
        selToolChainIdx = idx;
        break;
      }
    }
    if (selGroupIdx != null)
      break;
  }

  // 対象グループ発見時の処理
  if (selGroupIdx != null) {
    let curToolChainIdx = this.m_selToolChainIdxOf[selGroupIdx];

    // 同じグループ内の選択中ツールチェーンの処理
    if (curToolChainIdx != null) {                // (選択中有り)
      if (curToolChainIdx != selToolChainIdx) {   // (選択が変化)
        // 選択終了通知
        let mod_e2 = new PointingEventClone(mod_e);
        mod_e2.m_spKey = 0x0;
        let bRet = this.m_toolMap[curToolChainIdx].OnSelection(mod_e2);
        assert(!bRet);  // ツールチェーンのiconBoundsが重複でもしていない限りfalseが返されるはず。
      }
    }

    // 対象ツールチェーンに選択開始を通知する。
    bHit = this.m_toolMap[selToolChainIdx].OnSelection(mod_e);

    // 選択中ツールチェーン記憶
    this.m_selToolChainIdxOf[selGroupIdx] = selToolChainIdx;
    this.m_curToolChainIdx = selToolChainIdx;
  }

  return bHit;
}

/// イベントリスナ。
ToolPalette.prototype.handleEvent = function (e) {
  // console.log("ToolPalette::handleEvent: " + e.type);
  // console.dir(e);

  // 描画ストローク中のポインティングイベントは無視する。
  if (this.m_pictCanvas.isDrawing()) {
    assert(!this.m_bDragging);
    return;
  }

  // ドラッグ状態管理
  if (!this.m_bDragging) {
    if (e.type == 'mousedown' || e.type == 'touchstart') {
      // mouseupやtouchendを確実に捕捉するための登録
      g_pointManager.notifyPointStart(this, e);

      // 描画ツールに引き渡す情報を構成
      let mod_e = new PointingEvent(this, e);

      // ツールチェーンに通知
      let bHit = this.OnDraggingStart(mod_e);

      // 状態遷移
      this.m_bDragging = bHit;
    }
  } else {
    if (e.type == 'mouseup' || e.type == 'touchend') {
      let mod_e = new PointingEvent(this, e);
      this.m_toolMap[this.m_curToolChainIdx].OnPointingEnd(mod_e);
      this.m_bDragging = false;
    } else {
      // 描画ツールに引き渡す情報を構成
      let mod_e = new PointingEvent(this, e);

      // ツールチェーンに通知
      this.m_toolMap[this.m_curToolChainIdx].OnSelection(mod_e);
    }
  }

  // 外部ツールを非選択化
  // 描画ツールが有効化されたら外部ツールを非選択にする。
  // 現状、外部ツール無効化時は、描画ツールのOnSelected()イベントが
  // 外部ツールのOnDiselected()イベントに先行することになる。
  // これが問題になるようなら次の選択/非選択動作を記憶だけしておいて、
  // 全部出揃ったところでまとめて処理することを考える。
  if (this.m_extTool != null) {
    for (let i = 0; i < exclusiveToolChainGroupIndices.length; ++i) {
      let gp_idx = exclusiveToolChainGroupIndices[i];
      if (this.m_selToolChainIdxOf[gp_idx] != null) {
        let mod_e = new PointingEvent(this, e);
        this.m_extTool.OnDiselected(mod_e);
        this.m_extTool = null;
        break;
      }
    }
  }
}

/// 描画ツールを非選択状態にする。
ToolPalette.prototype.inactivateExcluciveTool = function () {
  for (let i = 0; i < exclusiveToolChainGroupIndices.length; ++i) {
    let gp_idx = exclusiveToolChainGroupIndices[i];
    let selToolChainIdx = this.m_selToolChainIdxOf[gp_idx];
    if (selToolChainIdx != null) {
      this.m_toolMap[selToolChainIdx].inactivate(this);
      this.m_selToolChainIdxOf[gp_idx] = null;
    }
  }
  this.m_curToolChainIdx = null;
}

/// ツール選択操作を外部ツールにredirectする。
ToolPalette.prototype.redirectTo = function (extTool) {
  if (extTool == null || this.extTool != null) {
    return;
  }
  this.m_extTool = extTool;

  this.inactivateExcluciveTool();

  let mod_e = new VirtualClickEvent(this, null);  // 外部ツールはクリック座標不問と想定。
  this.attatchImage();    // (Undo/Redo)
  this.m_extTool.OnSelected(mod_e);
};

/// 描画ツールを追加する。
/// 異なる描画ツールを複数追加可能。
/// その場合、描画イベント発生時に描画イベントハンドラが追加順で呼ばれる。
/// 同一の描画ツールの複数追加はできない。(2回目以降の追加を無視する。)
/// イベント通知先ツールから呼ばれる想定。
ToolPalette.prototype.addDrawer = function (drawer) {
  return this.m_pictCanvas.addDrawer(drawer);
}

/// 指定した描画ツールを削除する。
ToolPalette.prototype.removeDrawer = function (drawer) {
  return this.m_pictCanvas.removeDrawer(drawer);
}

/// レイヤー数を取得する。
/// 背景レイヤーも含むので注意。
ToolPalette.prototype.getNumLayers = function () {
  return this.m_pictCanvas.getNumLayers();
}

/// レイヤーを取得する。
ToolPalette.prototype.getLayer = function (layerNo) {
  return this.m_pictCanvas.getLayer(layerNo);
}

/// カレントレイヤーを取得する。
ToolPalette.prototype.getCurLayer = function () {
  return this.m_pictCanvas.getCurLayer();
}

/// サーフェスを取得する。
ToolPalette.prototype.getSurface = function () {
  return this.m_pictCanvas.getSurface();
}

/// オーバレイを取得する。
ToolPalette.prototype.getOverlay = function () {
  return this.m_pictCanvas.getOverlay();
}

/// キャンバスを全クリアする。
ToolPalette.prototype.eraseCanvas = function () {
  this.m_pictCanvas.eraseCanvas();
}

/// 全レイヤーを合成する。
ToolPalette.prototype.getJointImage = function (dstCanvas) {
  this.m_pictCanvas.getJointImage(dstCanvas);
}

/// レイヤー固定要求リスナを追加する。
ToolPalette.prototype.addLayerFixListener = function (listener) {
  return this.m_pictCanvas.addLayerFixListener(listener);
}

/// レイヤー固定要求リスナを削除する。
ToolPalette.prototype.removeLayerFixListener = function (listener) {
  return this.m_pictCanvas.removeLayerFixListener(listener);
}

/// ツールパレットのキャンバス(ツールアイコンの描画先)を取得する。
/// イベント通知先ツールから呼ばれる想定。
ToolPalette.prototype.getToolPaletteCanvas = function () {
  return this.m_palette;
}

/// 描画領域の絶対座標を返す。
/// イベント通知先ツールから呼ばれる想定。
ToolPalette.prototype.getBoundingDrawAreaRect = function () {
  // ツールパレットはpad幅0なので、client boudsが即draw area boundsである。
  let bounds = getBoundingClientRectWrp(this.m_palette);
  return bounds;
}

/// 共通設定を参照する。
/// イベント通知を受けたツールから呼ばれる想定。
ToolPalette.prototype.getCommonSetting = function () {
  return this.m_setting;
}

/// 操作履歴オブジェクトを接続する。(Undo/Redo)
/// 操作履歴を取る場合は、ツールやキャンバスに対する最初の操作が行われる前に呼ぶ必要がある。
/// 操作履歴を取らない場合は一切呼んではならない。
ToolPalette.prototype.attatchHistory = function (history) {
  this.m_history = history;
}

/// 操作履歴オブジェクトを取得する。
/// ToolPalette::attatchHistory()呼び出し前はnullを返すので注意。
ToolPalette.prototype.getHistory = function () {
  return this.m_history;
}

/// 操作履歴に画像を添付する。(Undo/Redo)
ToolPalette.prototype.attatchImage = function () {
  if (this.m_history == null)
    return;
  this.m_history.attatchImage();
}

/// レイヤー可視属性を外部から設定する。(Undo/Redo)
ToolPalette.prototype.setLayerVisibilityEx = function (visibilityList) {
  // レイヤーの可視属性を共通設定に反映
  let nlayers = this.m_setting.getNumLayers();
  for (let i = 0; i < nlayers; ++i) {
    this.m_setting.setLayerVisibility(i, visibilityList[i]);
  }
  this.m_layerTool.show(this.m_setting, this.m_palette);
}

/// マスク/逆マスクツールの内部状態を破棄し、キャンバス上の画像で作り直す。(Undo/Redo)
ToolPalette.prototype.invalidateMaskTools = function () {
  for (let i = 0; i < this.m_maskTools.length; ++i) {
    this.m_maskTools[i].invalidate(this.m_pictCanvas);
  }
}

/// アクティブなマスクツールを返す。(Undo/Redo)
ToolPalette.prototype.getActiveMaskTool = function () {
  for (let i = 0; i < this.m_maskTools.length; ++i) {
    if (this.m_maskTools[i].isActive()) {
      return this.m_maskTools[i];
    }
  }
  return this.m_normalTool;
}

/// マスクツールを指定マスク色でアクティブにする。(Undo/Redo)
ToolPalette.prototype.activateMaskTool = function (expMaskTool, maskColor) {
  if (expMaskTool != null) {
    let maskToolChain = this.m_toolMap[6];
    let curActiveMaskTool = maskToolChain.getActiveTool();
    let curMaskColor = this.m_setting.getMaskColor();

    // 変更の必要性判断
    if (curActiveMaskTool == expMaskTool && curMaskColor == maskColor)
      return;

    // マスク色設定
    if (curMaskColor != maskColor) {
      this.m_setting.setMaskColor(maskColor);
    }

    // 求めるマスクツールを有効化
    // { /*UTEST*/
    //   let curActiveMaskTool = maskToolChain.getActiveTool();
    //   console.log("******* curActiveMaskTool=" + curActiveMaskTool.m_drawCompoIdx + ", expMaskTool=" + expMaskTool.m_drawCompoIdx);
    // }
    let bRet = maskToolChain.activate(this, expMaskTool);
    assert(bRet);
    // { /*UTEST*/
    //   let curActiveMaskTool = maskToolChain.getActiveTool();
    //   console.log("******* curActiveMaskTool=" + curActiveMaskTool.m_drawCompoIdx + ", expMaskTool=" + expMaskTool.m_drawCompoIdx);
    //   assert(curActiveMaskTool == expMaskTool);
    // }
  }
}

/// 操作履歴巻き戻しリスナを追加する。(Undo/Redo)
ToolPalette.prototype.addHistoryRewindListener = function (listener) {
  if (this.m_history != null) {
    this.m_history.addHistoryRewindListener(listener);
  }
}

/// 操作履歴変更リスナを削除する。(Undo/Redo)
ToolPalette.prototype.removeHistoryRewindListener = function (listener) {
  if (this.m_history != null) {
    this.m_history.removeHistoryRewindListener(listener);
  }
}
