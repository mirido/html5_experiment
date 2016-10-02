'use strict';

//
//  PenTool
//

/// 新しいインスタンスを初期化する。
function PenTool()
{
  // DOMオブジェクト取得
  this.m_thick10Selector = document.getElementById("selThickness10");
  this.m_thick01Selector = document.getElementById("selThickness01");

  // セレクタの値一覧取得
  this.m_thick01List = this.m_thick01Selector.getElementsByTagName('option');
  this.m_thick10List = this.m_thick10Selector.getElementsByTagName('option');

  this.m_thickness = 1;

  // console.log("x01=" + this.m_thick01List[this.m_thick01Selector.selectedIndex].value);
  // console.log("x10=" + this.m_thick10List[this.m_thick10Selector.selectedIndex].value);
  this.setThicknessToSelector(this.m_thickness);
}

/// 線の太さをセレクタから取得する。
PenTool.prototype.getThicknessFromSelector = function()
{
  let idx01 = this.m_thick01Selector.selectedIndex;
  let idx10 = this.m_thick10Selector.selectedIndex;
  let val01 = this.m_thick01List[idx01].value;
  let val10 = this.m_thick10List[idx10].value;
  let thickness = 10 * val10 + val01;
  return thickness;
}

/// 線の太さをセレクタに反映する。
PenTool.prototype.setThicknessToSelector = function(new_val)
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

  // エラーからの回復措置
  if (suc = false) {
    assert(false);    // ここに来たらバグ
    change_selection(this.m_thick01Selector, 1);
    change_selection(this.m_thick10Selector, 0);
    this.m_thickness = 1;
  }

  return suc;
}

/// ストローク開始時呼ばれる。
PenTool.prototype.OnDrawStart = function(e, layers, exinf)
{
  this.m_thickness = this.getThicknessFromSelector();
  console.log("PenTool::OnDrawStart() called. (" + e.clientX + ", " + e.clientY + ")");
}

/// ストローク終了時呼ばれる。
PenTool.prototype.OnDrawEnd = function(e, layers, exinf)
{

}

/// ストローク中に呼ばれる。
PenTool.prototype.OnDrawing = function(e, layers, exinf)
{

}
