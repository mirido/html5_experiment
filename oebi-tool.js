'use strict';

//
//  PencilTool
//

const stroke_span_min = 3;

/// 新しいインスタンスを初期化する。
/// 暫定的に、selection boxで線の太さを与えている。
function PencilTool()
{
  // DOMオブジェクト取得
  this.m_thick10Selector = document.getElementById("selThickness10");
  this.m_thick01Selector = document.getElementById("selThickness01");

  // セレクタの値一覧取得
  this.m_thick01List = this.m_thick01Selector.getElementsByTagName('option');
  this.m_thick10List = this.m_thick10Selector.getElementsByTagName('option');

  // 描画パラメータ
  this.m_thickness = 1;     // 線の幅
  this.m_alpha = 1.0;       // α値
  this.m_color = 'rgb(0, 0, 0)';

  // 描画状態
  this.m_lastSender = null;
  this.m_lastPoint = null;

  // UIに逆反映
  // console.log("x01=" + this.m_thick01List[this.m_thick01Selector.selectedIndex].value);
  // console.log("x10=" + this.m_thick10List[this.m_thick10Selector.selectedIndex].value);
  this.setThicknessToSelector(this.m_thickness);
}

/// 線の太さをセレクタから取得する。(暫定処置)
PencilTool.prototype.getThicknessFromSelector = function()
{
  let idx01 = this.m_thick01Selector.selectedIndex;
  let idx10 = this.m_thick10Selector.selectedIndex;
  let val01 = this.m_thick01List[idx01].value;
  let val10 = this.m_thick10List[idx10].value;
  let thickness = 10 * val10 + val01;
  return thickness;
}

/// 線の太さをセレクタに反映する。(暫定処置)
PencilTool.prototype.setThicknessToSelector = function(new_val)
{
  let bRet;

  let val01 = new_val % 10;
  let val10 = Math.floor(this.m_thickness / 10);

  let suc = true;
  bRet = change_selection(this.m_thick01Selector, val01);
  if (!bRet) {
    suc = false;
  }
  bRet = change_selection(this.m_thick10Selector, val10);
  if (!bRet) {
    suc = false;
  }

  // エラーからの回復
  if (suc = false) {
    assert(false);    // ここに来たらバグ
    change_selection(this.m_thick01Selector, 1);
    change_selection(this.m_thick10Selector, 0);
    this.m_thickness = 1;
  }

  return suc;
}

/// ストローク開始時呼ばれる。
PencilTool.prototype.OnDrawStart = function(e)
{
  console.log("PencilTool::OnDrawStart() called. (" + e.m_point.x + ", " + e.m_point.y + ")");
  this.m_thickness = this.getThicknessFromSelector();
  this.m_lastSender = e.m_sender;
  this.m_lastPoint = e.m_point;
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
  draw_line(this.m_lastPoint.x + 0.5, this.m_lastPoint.y + 0.5, cur_pt.x + 0.5, cur_pt.y + 0.5, ctx, this.m_thickness);
  this.m_lastPoint = cur_pt;
}
