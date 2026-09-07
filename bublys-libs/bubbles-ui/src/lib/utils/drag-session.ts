/**
 * ドラッグ中だけ body に印を付ける。
 *
 * なぜ要るか: 入れ子の universe は `pointer-events: none` になっていて、空白領域は
 * 奥（親 universe）に貫通するようになっている。普段はそれでよいのだが、ドロップのときだけは
 * 困る。入れ子の宇宙の空白に落としたのに、イベントは親に抜けてしまい、親の宇宙に、しかも
 * 親の座標で開いてしまう＝「落とした場所」と違うところに出る。
 *
 * そこでドラッグしている間だけ入れ子の viewport を触れるようにする。印を CSS クラスにするのは、
 * React の state にすると全 universe が再レンダリングされるため（ドラッグ中に毎回は重い）。
 *
 * 印は dragend と drop の両方で消す。drop したときに dragend が来ないブラウザ差があるため。
 */
export const DRAGGING_CLASS = "is-bubble-dragging";

let installed = false;

/** window にドラッグ検出を仕掛ける（何度呼んでも1回だけ効く） */
export function installDragSession(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;

  const begin = () => document.body.classList.add(DRAGGING_CLASS);
  const end = () => document.body.classList.remove(DRAGGING_CLASS);

  // capture で拾うのは、途中で stopPropagation されても取りこぼさないため
  window.addEventListener("dragstart", begin, true);
  window.addEventListener("dragend", end, true);
  window.addEventListener("drop", end, true);
}
