'use strict';

//
//  PencilTool
//

/// 新しいインスタンスを初期化する。
function PencilTool(rect)
{
  this.m_iconBounds = rect;

  // this.m_drawOp = new NullDrawOp();
  this.m_drawOp = new DrawOp_FreeHand();
  // this.m_effect = new NullEffect();
  this.m_effect = new Effect_Pencil(19, 'rgb(128,0,0)');
  this.m_cursor = new Cursor_Circle(19);
  this.m_drawerCore = new DrawerBase(this.m_drawOp, this.m_effect, this.m_cursor);
}

/// 選択時呼ばれる。
PencilTool.prototype.OnSelected = function(e)
{
  console.log("PencilTool::OnSelected() called. (" + e.m_point.x + ", " + e.m_point.y + ")");

  // 選択時アイコン描画
  draw_icon_face_wrp(this.m_iconBounds, true, e);

  // 描画ツール設定
  e.m_sender.setDrawer(this.m_drawerCore);
}

/// 選択解除時呼ばれる。
PencilTool.prototype.OnDiselected = function(e)
{
  console.log("PencilTool::OnDiselected() called. ");

  // 描画ツール解除
  e.m_sender.setDrawer(null);

  // 非選択時アイコン描画
  draw_icon_face_wrp(this.m_iconBounds, false, e);
}

/// 再ポイントされたとき呼ばれる。
PencilTool.prototype.OnPicked = function(e)
{
  console.log("PencilTool::OnPicked() called. (" + e.m_point.x + ", " + e.m_point.y + ")");

  // 必要があればアクション
  // TBD
}
