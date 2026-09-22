/**
 * 題名と印の幅を測る ── lab.html 952-961 行 `measEl` / `textW` と同じやり方。
 * 画面の外に置いた1枚の div で測り、覚えておく（同じ字を二度測らない）。
 */
const FONT =
  '-apple-system,BlinkMacSystemFont,"Hiragino Sans","Noto Sans JP",sans-serif';

let el: HTMLDivElement;
const cache = new Map<string, number>();

/** 画面がある所で使う。無い所（テスト）では `drawField` に自前のものを渡す */
export function measureTextInDom(text: string, px: number): number {
  if (typeof document === 'undefined') return 0;
  if (!el) {
    el = document.createElement('div');
    el.style.cssText =
      'position:absolute;left:-9999px;top:-9999px;white-space:nowrap;font-weight:600;font-family:' +
      FONT;
    document.body.appendChild(el);
  }
  const key = px + '|' + text;
  const known = cache.get(key);
  if (known !== undefined) return known;
  el.style.fontSize = px + 'px';
  el.textContent = text;
  const v = el.offsetWidth;
  cache.set(key, v);
  return v;
}

/** 覚えたものを捨てる（字体が変わったときだけ要る） */
export function forgetTextWidths(): void {
  cache.clear();
}
