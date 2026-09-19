/**
 * 中身のある泡の見た目 ── 本文の席・閉じる・ObjectView の膜。
 * 泡そのものの見た目は `bubble-layout-ui` の `FIELD_CSS`。
 */
export const SPACE_CSS = `
/* ★ 中身は泡の中に素の px で置く。泡ごと transform で拡大縮小されるので、
   中身の側では倍率を一切気にしなくてよい（逆 scale も要らない） */
.bub > .bl-body{position:absolute;left:0;top:24px;right:0;bottom:0;overflow:auto;
  pointer-events:auto;color:#e6ebf5;font:13px/1.6 var(--f)}
.bub.chip > .bl-body{display:none}
.bub.nt > .bl-body{display:none}   /* 字が読めない大きさなら中身も描かない */
.bl-noroute{padding:10px 12px;color:#ff9db1;font-size:11px;line-height:1.6}
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
