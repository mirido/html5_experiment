'use strict';

//
//  ToolPalette
//

// ■ ToolPalette
// 複数のツールを保持し、アクティブか否かを変更する。
// ツールに対するポインタイベントがあれば、当該ツールや関連するツールに通知する。
// アクティブなツールにキャンバスからのポインタイベントを配送する。

const g_toolMap = [
  // px1'	py1'	width	height
  [  0,   0, 50, 21 ],  // [ 0] 鉛筆 ...
  [  0,  22, 50, 21 ],  // [ 1] トーン ...
  [  0,  44, 50, 21 ],  // [ 2] 四角 ...
  [  0,  66, 50, 21 ],  // [ 3] コピー ...
  [  0,  88, 50, 21 ],  // [ 4] 消しペン ...
  [  0, 110, 50, 21 ],  // [ 5] 手書き ...
  [  0, 132, 50, 21 ],  // [ 6] 通常 ...
  [  0, 154, 24, 20 ],  // [ 7] 白色
  [ 26, 154, 24, 20 ],  // [ 8] 黒色
  [  0, 175, 24, 20 ],  // [ 9] 灰色
  [ 26, 175, 24, 20 ],  // [10] 茶色
  [  0, 196, 24, 20 ],  // [11] 紫色
  [ 26, 196, 24, 20 ],  // [12] 紅色
  [  0, 217, 24, 20 ],  // [13] 青色
  [ 26, 217, 24, 20 ],  // [14] ピンク色
  [  0, 238, 24, 20 ],  // [15] 黄色
  [ 26, 238, 24, 20 ],  // [16] 水色
  [  0, 259, 24, 20 ],  // [17] 緑色
  [ 26, 259, 24, 20 ],  // [18] 橙色
  [  0, 280, 24, 20 ],  // [19] 肌色1
  [ 26, 280, 24, 20 ],  // [20] 肌色2
  [  0, 301, 50, 15 ],  // [21] R
  [  0, 317, 50, 15 ],  // [22] G
  [  0, 333, 50, 15 ],  // [23] B
  [  0, 349, 50, 15 ],  // [24] A
  [  0, 365, 50, 35 ],  // [25] px_width
  [  0, 402, 50, 15 ],  // [26] bk_wt1_wt5
  [  0, 421, 50, 22 ]   // [27] Layer
];

/// 新しいインスタンスを初期化する。
function ToolPalette()
{
  // DOMオブジェクト取得
	this.m_palette = document.getElementById("tool_pallete");

  const n = g_toolMap.length;

  // パレットの大きさ調整
  this.m_toolBounds = [];
  let sx, sy, ex, ey;
  for (let i = 0; i < n; ++i) {
    let rect = g_toolMap[i];    // Alias
    sx = (sx) ? Math.min(sx, rect[0]) : rect[0];
    sy = (sy) ? Math.min(sy, rect[1]) : rect[1];
    ex = (ex) ? Math.max(ex, rect[0] + rect[2]) : rect[0] + rect[2];
    ey = (ey) ? Math.max(ey, rect[1] + rect[3]) : rect[1] + rect[3];
    this.m_toolBounds[i] = jsRect(rect[0], rect[1], rect[2], rect[3]);
    // console.dir(this.m_toolBounds[i]);
  }
  const width = ex - sx;
  const height = ey - sy;
  this.m_palette.setAttribute('width', width);
  this.m_palette.setAttribute('height', height);

  // パレット初期描画
  // 個々の区画内の描画はツールに委譲(予定)
	{
		let ctx = this.m_palette.getContext('2d');
		ctx.fillStyle = "rgba(232, 239, 255, 255)";
		ctx.fillRect(0, 0, width, height);

    if (true) {
      ctx.strokeStyle = "rgb(0, 0, 0, 0)";
  		ctx.lineWidth = 1;
      for (let i = 0; i < this.m_toolBounds.length; ++i) {
        let rect = this.m_toolBounds[i];
        // console.dir(rect);
        ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width, rect.height); // アンチエリアスがかかるのでNG。
      }
    } else {
      ctx.strokeStyle = "rgb(0, 0, 0, 0)";
      ctx.fillStyle = "rgb(0, 0, 0)";
  		ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < this.m_toolBounds.length; ++i) {
        let rect = this.m_toolBounds[i];
        // console.dir(rect);
        draw_rect_R(rect.x + 0.5, rect.y + 0.5, rect.width, rect.height, ctx, 1);
      }
      ctx.stroke();
      ctx.closePath();
    }
	}
}
