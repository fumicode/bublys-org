/**
 * **泡がはじける** ── 針で割った泡が、急所から穴を開けて消える絵。
 *
 * > 割れるときは、急所から穴が開いて、膜が一気に引いていく。
 *
 * ★ 割れた泡は React からすぐ消えるので、**割った瞬間の写し**（DOM の clone）に絵を付ける。
 *   写しは元の留め（`.bl-hold`）ごと同じ層に置くので、元と同じ所・同じ大きさに重なる。
 *   React の知らない要素なので、終わったら自分で片付ける。
 * ★ 穴は急所を中心に広がる円（mask）。はじめはゆっくり、あとは一気に ── シャボン玉の膜が
 *   縮んでいく速さ。あわせて急所から白い輪がはじけ、しぶきが散る。
 * ★ 写しの中の動くもの（canvas など）は止まった姿になるが、消えるまでの一瞬なので構わない。
 * ★ 動きを減らす設定の人には出さない（泡はそのまま消える）。
 */

/** 穴が泡を飲み込むまで（ms） */
const HOLE_MS = 240;
/** しぶきが散りきるまで（ms） */
const DROP_MS = 420;
/** しぶきの粒の数 */
const DROPS = 14;

/**
 * `bub`（`.bub`）を、`spot`（その急所）から割る。元の泡は見えなくする ── 消すのは呼ぶ側。
 */
export function burstFrom(bub: HTMLElement, spot: HTMLElement): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const hold = bub.parentElement;
  const layer = hold?.parentElement;
  if (!hold || !layer) return;

  // 急所の真ん中（泡の中の座標。縮んで描かれる前の px）
  const cx = spot.offsetLeft + spot.offsetWidth / 2;
  const cy = spot.offsetTop + spot.offsetHeight / 2;
  const w = bub.offsetWidth;
  const h = bub.offsetHeight;
  /** 穴がいちばん遠い角に届く半径 */
  const reach = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));

  const ghostHold = hold.cloneNode(true) as HTMLElement;
  ghostHold.classList.add('bl-pop-ghost');
  const ghost = ghostHold.firstElementChild as HTMLElement | null;
  if (!ghost) return;
  ghost.removeAttribute('data-id');
  ghost.querySelector(':scope > .bl-spot')?.remove();

  /**
   * 輪としぶきは穴に削られない所に置く ── 写しと同じ位置・同じ縮みの、中身の無い入れもの。
   * （写しの中に置くと、広がる穴に一緒に消される）
   */
  const fx = document.createElement('div');
  fx.className = 'bl-pop-fx';
  fx.style.transform = bub.style.transform;
  fx.style.width = `${w}px`;
  fx.style.height = `${h}px`;
  ghostHold.appendChild(fx);

  layer.appendChild(ghostHold);
  // 元の泡は、この瞬間から見せない（消えるのは次の描き直し）
  bub.style.visibility = 'hidden';

  /**
   * 白い輪 ── 穴の縁。穴と同じ一コマで大きさを決める（別々に動かすと、輪が縁に遅れる）。
   * ★ 広げるのは幅と高さ（scale にすると縁の太さまで何十倍にもなる）。
   */
  // 輪は泡の形で切る（穴が泡より大きくなっても、泡の外に円を描かない）。しぶきは切らない
  const ringBox = document.createElement('div');
  ringBox.className = 'bl-pop-fx';
  ringBox.style.transform = bub.style.transform;
  ringBox.style.width = `${w}px`;
  ringBox.style.height = `${h}px`;
  ringBox.style.overflow = 'hidden';
  ringBox.style.borderRadius = getComputedStyle(bub).borderRadius;
  ghostHold.insertBefore(ringBox, fx);
  const ring = document.createElement('div');
  ring.className = 'bl-pop-ring';
  ring.style.left = `${cx}px`;
  ring.style.top = `${cy}px`;
  ringBox.appendChild(ring);
  const setRing = (r: number, alpha: number) => {
    const d = Math.max(6, r * 2);
    ring.style.width = ring.style.height = `${d}px`;
    ring.style.margin = `${-d / 2}px 0 0 ${-d / 2}px`;
    ring.style.opacity = `${alpha}`;
  };
  setRing(0, 1);

  // しぶき ── 急所から外へ。粒ごとに向き・遠さ・大きさを散らす
  for (let i = 0; i < DROPS; i++) {
    const d = document.createElement('div');
    d.className = 'bl-pop-drop';
    d.style.left = `${cx}px`;
    d.style.top = `${cy}px`;
    const dot = 3 + Math.random() * 5;
    d.style.width = d.style.height = `${dot}px`;
    d.style.margin = `${-dot / 2}px 0 0 ${-dot / 2}px`;
    fx.appendChild(d);
    const a = (Math.PI * 2 * i) / DROPS + (Math.random() - 0.5) * 0.6;
    const dist = 36 + Math.random() * Math.min(140, reach * 0.6);
    d.animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${Math.cos(a) * dist}px,${Math.sin(a) * dist + 12}px) scale(.3)`, opacity: 0 },
      ],
      { duration: DROP_MS * (0.7 + Math.random() * 0.5), easing: 'cubic-bezier(.15,.6,.35,1)', fill: 'forwards' },
    );
  }

  // 穴 ── 急所を中心に広がる円で写しを削る（はじめはゆっくり、あとは一気に）
  const t0 = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - t0) / HOLE_MS);
    const r = reach * t * t;
    // 縁は少しだけぼかす ── 膜がちぎれて引いていく
    const mask = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${r}px, #000 ${r + 5}px)`;
    ghost.style.setProperty('-webkit-mask-image', mask);
    ghost.style.setProperty('mask-image', mask);
    // 輪は縁に付いていき、泡を飲み込みきる手前から消えていく
    setRing(r + 1, t < 0.75 ? 1 : (1 - t) / 0.25);
    if (t < 1) requestAnimationFrame(tick);
    else ghost.style.visibility = 'hidden';
  };
  requestAnimationFrame(tick);

  window.setTimeout(() => ghostHold.remove(), Math.max(HOLE_MS, DROP_MS * 1.2) + 60);
}
