/**
 * 中身のある泡の見た目 ── 本文の席・閉じる・ObjectView の膜。
 * 泡そのものの見た目は `bubble-layout-ui` の `FIELD_CSS`。
 */
export const SPACE_CSS = `
/**
 * 器（泡の見た目）── ラボの暗い箱ではなく、バブリの画面が乗る器にする。
 *
 * ★ ここは **FIELD_CSS（ラボと px で突き合わせる側）を触らずに上書きする**。
 *   変えるのは塗り・角丸・影・文字色だけで、箱の大きさと位置には手を出さない
 *   （受け入れ検査はラボとの矩形一致を見張っている）。
 * ★ 画面で固定したい量は逆 scale（--k）で戻す。border-width や font-size を
 *   毎フレーム書くと layout が戻ってくる。
 *
 * 見分けは余白ではなく **塗り・角丸・縁・影**に依っている（CARRYOVER の実測）ので、
 * 旧 bubbles-ui の泡と同じ作りを、この 3 つで置き直す。
 */
/* ★ 地は**不透明**。重なるのが前提の並べ方なので、半透明だと重なった所が霞んで読めない
   （旧は重ならない前提だったので半透明でよかった） */
.bub{--rr:16px;
  background:linear-gradient(145deg,
    hsl(var(--h) 34% 19%) 0%, hsl(var(--h) 32% 15%) 45%, hsl(var(--h) 30% 13%) 100%);
  box-shadow:0 8px 32px hsl(var(--h) 50% 22% / .38), 0 2px 8px rgba(0,0,0,.18),
    inset 0 2px 4px hsla(0,0%,100%,.35), inset 0 -1px 2px hsl(var(--h) 50% 30% / .2)}
/* ③ 見えない親は体を持たない（FIELD_CSS の指定をここでも守る） */
.bub.imp{background:none;box-shadow:none}

/**
 * カーソルは**できることを言う**。いままで全部 grab で嘘をついていた（CARRYOVER）。
 *   ヘッダ（＝掴む所）… grab / 掴んでいる間 grabbing
 *   中身              … 普通（中の UI が自分で決める）
 *   右下の角          … nwse-resize（FIELD_CSS の .bl-hnd）
 */
.bub{cursor:grab}
.bub:active{cursor:grabbing}
.bub > .bl-body{cursor:auto}
.bub > .bl-close{cursor:pointer}

/* ステータスバー ── 出すのは url。すりガラスの帯 */
.bub > .hd{background:hsl(var(--h) 45% 18% / .5);backdrop-filter:blur(6px);
  border-radius:calc(var(--rr)) calc(var(--rr)) 0 0}
.bub > .ttl{color:#f4f7ff}

/* ★ 中身は泡の中に素の px で置く。泡ごと transform で拡大縮小されるので、
   中身の側では倍率を一切気にしなくてよい（逆 scale も要らない）。
   地は**明るい**── バブリの画面は明るい地を前提に書かれている（暗いままだと字が読めない） */
.bub > .bl-body{position:absolute;left:7px;top:27px;right:7px;bottom:7px;overflow:auto;
  pointer-events:auto;border-radius:11px;
  background:linear-gradient(180deg,#ffffff 0%,#f7f8fb 100%);
  color:#1b2029;font:13px/1.6 var(--f);
  box-shadow:inset 0 2px 4px rgba(0,0,0,.05),0 1px 2px hsla(0,0%,100%,.5)}
/**
 * 窓（空間を持つ泡）は、**枠そのものが岸**。だから泡の輪（FIELD_CSS の ::after）は出さない
 * ── 岸の管と二重になる。上端はステータスバーにぶつかる所まで。
 */
.bub:has(> .bl-body.bl-clear)::after{content:none}

/* 窓（中身が自分で背景を持つ ── 入れ子の宇宙・canvas）。地を敷かず、箱いっぱいに広げる */
.bub > .bl-body.bl-clear{left:0;top:24px;right:0;bottom:0;border-radius:0 0 calc(var(--rr) - 2px) calc(var(--rr) - 2px);
  overflow:hidden;box-shadow:none;color:#e6ebf5;
  /* 窓の中は自分の宇宙。夜空は**この窓が持つ**（外の海の夜空は透けさせない） */
  background:linear-gradient(145deg,hsl(220 35% 16%) 0%,hsl(225 40% 19%) 40%,hsl(230 35% 17%) 100%)}
/* 地を敷かない ── 中身が自分で持つ。空間（夜空）がそのまま透ける */
.bub > .bl-body.bl-none{background:none;box-shadow:none;color:#e6ebf5}
.bub.chip > .bl-body{display:none}
/* ★ 中身を消すのは題名より**奥**（倍率 0.3）。題名が読めなくなっても、
   中身の形は「何が入っているか」の手がかりになるので描き続ける（CONTENT_MIN） */
.bub.nc > .bl-body{display:none}
.bl-noroute{padding:10px 12px;color:#b23c27;font-size:11px;line-height:1.6}
.bub > .bl-close{position:absolute;right:4px;top:3px;width:18px;height:18px;padding:0;
  border:0;border-radius:4px;background:transparent;color:#eaf1ff;opacity:.55;
  font:600 14px/18px var(--f);cursor:pointer;pointer-events:auto}
.bub > .bl-close:hover{opacity:1;background:rgba(255,255,255,.14)}
.bub.nt > .bl-close{display:none}

/* 枠の題名は url。中身が自分の題名を出すので、枠は「どこにいるか」を出す（既存 bubbles-ui と同じ） */
.bub > .bl-url{display:flex;align-items:center;gap:0;overflow:hidden;opacity:.85;
  font:600 11px/1 var(--f);letter-spacing:.01em}
.bl-seg{white-space:nowrap}
.bl-sep{opacity:.45;margin:0 3px}

/* ObjectView の膜。「掴める・開ける」の唯一の合図（出たら必ず何かできる） */
.bl-object{position:relative;isolation:isolate}
.bl-object::after{content:"";position:absolute;inset:-4px;z-index:1;pointer-events:none;
  opacity:0;transform:scale(.97);transition:opacity 160ms ease-out,transform 160ms ease-out;
  border-radius:var(--object-view-film-radius,12px);
  background:
    radial-gradient(115% 85% at 22% 16%,rgba(255,255,255,.6) 0%,rgba(255,255,255,0) 58%),
    radial-gradient(90% 70% at 82% 88%,rgba(255,228,246,.5) 0%,rgba(255,228,246,0) 60%),
    linear-gradient(135deg,rgba(255,158,214,.44) 0%,rgba(190,173,255,.4) 34%,
      rgba(138,219,255,.36) 66%,rgba(178,255,231,.34) 100%);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.6),inset 0 1px 6px rgba(255,255,255,.5),
    0 2px 12px rgba(122,138,214,.18)}
.bl-object[data-film=on]:hover::after,
.bl-object[data-film=on]:focus-visible::after{opacity:1;transform:scale(1)}
/* 入れ子のときは内側が勝つ（開くときの stopPropagation と同じ決まりを見た目にも通す） */
.bl-object[data-film=on]:has([data-object-view]:hover)::after{opacity:0}
@media (prefers-reduced-motion:reduce){ .bl-object::after{transition:none} }
`;
