'use strict';

//
//  PencilTool
//

const pre_rendering_ha = 32;

/// 新しいインスタンスを初期化する。
/// 暫定的に、selection boxで線の太さを与えている。
function PencilTool(rect)
{
  // 描画パラメータ
  // 描画途中に線幅が万が一変わると破綻する要素(pre-rendering)があるので、
  // 線幅についてはthis.m_settingを都度参照するのではなく、
  // ツール選択時に本オブジェクト側で記憶する。
  this.m_setting = null;
  this.m_thickness = null;

  // 描画状態
  this.m_lastSender = null;
  this.m_lastPoint = null;
  this.m_pre_rendered = null;
  this.m_sv_icon = null;    // 変更前のアイコン領域画像(Ad-hoc)
}

/// 選択時呼ばれる。
PencilTool.prototype.OnSelected = function(e)
{
  console.log("PencilTool::OnSelected() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
  // console.dir(e.m_sender);

  // 最新設定への参照取得
  this.m_setting = e.m_sender.refCommonSetting();
  this.m_thickness = this.m_setting.getThickness();

  // アイコン描画準備
  let iconBounds = e.m_sender.getIconBounds();
  let toolPalette = e.m_sender.getToolPaletteCanvas();
  let ctx = toolPalette.getContext('2d');

  // 選択前アイコン保存(Ad-hoc)
  // TODO: 構築時と非選択状態に戻ったとき新規に描き直す方式にする。
  this.m_sv_icon = ctx.getImageData(iconBounds.x, iconBounds.y, iconBounds.width, iconBounds.height);

  // 選択時アイコン描画
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = 'rgb(255, 255, 128)';
  ctx.strokeStyle = 'rgb(255, 255, 128)';
  ctx.fillRect(iconBounds.x, iconBounds.y, iconBounds.width, iconBounds.height);

  // 描画ツール設定
  e.m_sender.setDrawer(this);
}

/// 選択解除時呼ばれる。
PencilTool.prototype.OnDiselected = function(e)
{
  console.log("PencilTool::OnDiselected() called. ");
  let iconBounds = e.m_sender.getIconBounds();
  let toolPalette = e.m_sender.getToolPaletteCanvas();
  let ctx = toolPalette.getContext('2d');

  // 選択前アイコン復元(Ad-hoc)
  // TODO: 構築時と非選択状態に戻ったとき新規に描き直す方式にする。
  ctx.putImageData(this.m_sv_icon, iconBounds.x, iconBounds.y);

  // 描画ツール解除
  e.m_sender.setDrawer(null);
}

/// 再ポイントされたとき呼ばれる。
PencilTool.prototype.OnPicked = function(e)
{
  console.log("PencilTool::OnPicked() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
  /*NOP*/
}

/// ストローク開始時呼ばれる。
PencilTool.prototype.OnDrawStart = function(e)
{
  console.log("PencilTool::OnDrawStart() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
  // this.m_thickness = this.getThicknessFromSelector();
  this.m_lastSender = e.m_sender;
  this.m_lastPoint = e.m_point;
  // {   /*UTEST*/   // プリレンダリング実験
  //   let diameter = 19;
  //   let ha = 32;
  //   let px = this.m_lastPoint.x - ha;
  //   let py = this.m_lastPoint.y - ha;
  //
  //   let mini_canvas = pre_render_pixel(ha, diameter, 'rgb(255, 0, 0)', true);
  //   // make_opaque(mini_canvas);
  //   let ctx = this.m_lastSender.getLayer().getContext('2d');
  //   ctx.globalAlpha = 1.0;
  //   ctx.drawImage(mini_canvas, px, py);
  //
  //   mini_canvas = pre_render_pixel(ha, diameter, 'rgb(0, 255, 0)', false);
  //   // make_opaque(mini_canvas);
  //   ctx.drawImage(mini_canvas, px, py)
  // }

  console.log("m_thickness=" + this.m_thickness);
  if (this.m_thickness > 1) {
    this.m_pre_rendered = pre_render_pixel(
      pre_rendering_ha, this.m_thickness, this.m_color, true
    );
  }
}

/// ストローク終了時呼ばれる。
PencilTool.prototype.OnDrawEnd = function(e)
{
  console.log("PencilTool::OnDrawEnd() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
  assert(e.m_sender == this.m_lastSender);
}

/// ストローク中に呼ばれる。
PencilTool.prototype.OnDrawing = function(e)
{
  assert(e.m_sender == this.m_lastSender);
  let cur_pt = e.m_point;

  let ctx = this.m_lastSender.getLayer().getContext('2d');
  ctx.globalAlpha = this.m_alpha;
  ctx.fillStyle = this.m_color;
  if (this.m_thickness > 1) {
    draw_line(this.m_lastPoint.x, this.m_lastPoint.y, cur_pt.x, cur_pt.y,
      pre_rendering_ha, this.m_pre_rendered, ctx
    );
  } else {
    draw_line_1px(this.m_lastPoint.x, this.m_lastPoint.y, cur_pt.x, cur_pt.y, ctx);
  }
  this.m_lastPoint = cur_pt;
}
