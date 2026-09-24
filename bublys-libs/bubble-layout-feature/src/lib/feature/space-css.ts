/**
 * 中身のある泡の見た目 ── 本文の席・閉じる・ObjectView の膜。
 * 泡そのものの見た目は `bubble-layout-ui` の `FIELD_CSS`。
 */
/**
 * **窓の夜空。** 空間を持つ泡は自分の宇宙を持っている。
 *
 * ★ **いちばん外の海より明るい**（海は明度 10/13/11）。
 *   窓は海の**手前に浮いている板**で、その上に一覧の板、さらに札が乗る
 *   ── 明るいものが重なる向きを 1 つに決めておく（海 → 窓 → 板 → 札）。
 * ★ 前は 16/19/17 で、海（18/22/20）との差が明度 2〜3 しか無く**窓の境目が読めなかった**。
 *   濃さを 1 段はっきり離したうえで、海と窓の上下を入れ替えてある。
 * ★ 同じ数が岸の側（ShowreLayer の WINDOW_GROUND）にもあり二重定義だった。
 *   数はここだけに置いて、岸はここから引く。
 */
export const WINDOW_SKY =
  'linear-gradient(145deg,hsl(220 35% 18%) 0%,hsl(225 40% 22%) 40%,hsl(230 35% 20%) 100%)';

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
  background:${WINDOW_SKY}}
/* 地を敷かない ── 中身が自分で持つ。空間（夜空）がそのまま透ける */
.bub > .bl-body.bl-none{background:none;box-shadow:none;color:#e6ebf5;
  /* ★ 巻物の棒も夜の側へ。明るい地を前提にした OS の棒が、
     空間の上に**白い帯**として残る（世界線の下端がそう見えていた） */
  scrollbar-width:thin;scrollbar-color:rgba(230,235,245,.28) transparent}
.bub > .bl-body.bl-none::-webkit-scrollbar{width:8px;height:8px}
.bub > .bl-body.bl-none::-webkit-scrollbar-track{background:transparent}
.bub > .bl-body.bl-none::-webkit-scrollbar-thumb{background:rgba(230,235,245,.28);border-radius:4px}
.bub > .bl-body.bl-none::-webkit-scrollbar-corner{background:transparent}
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
/*
 * ★ 長い url は**閉じるボタンに被る手前で … に切る**。
 *   切り方を横並び（flex）から普通の行（block）に変えてあるのは、
 *   text-overflow:ellipsis が効くのは**行**であって、並べ物の入れ物ではないから
 *   ── flex のままだと、はみ出したぶんがただ切り落とされて … が出ない。
 *   区切りの / は中の字のまま（inline）なので、見た目は今までどおり。
 *   右の余地 34px ＝ 左の 8 ＋ 閉じるボタン（右 4・幅 18）＋ 隙間 4。
 */
.bub > .bl-url{display:block;max-width:calc(100% - 34px);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.85;
  font:600 11px/24px var(--f);letter-spacing:.01em}
.bl-seg{white-space:nowrap}
.bl-sep{opacity:.45;margin:0 3px}
/*
 * 一覧の中の札 ── **選んでいないあいだは「中身だけ」**。
 * 枠（輪・地・影）もステータスバー（色の帯・url・閉じる）も出さない。
 * 一覧は「どれを選ぶか」を見る画面なので、札ごとに泡の装いが並ぶと中身が読めない。
 * 触れば泡として立ち上がる ── 消しているのではなく、静かにしているだけ。
 */
.bub:not(.sel) > .bl-quiet{display:none}
.bub:not(.sel):has(> .bl-quiet){background:none;box-shadow:none}
.bub:not(.sel):has(> .bl-quiet)::after{content:none}
.bub:not(.sel):has(> .bl-quiet) > .hd,
.bub:not(.sel):has(> .bl-quiet) > .bl-close{display:none}
/*
 * ★ 装いを出さないあいだは、**その空けてあった所まで中身を広げる**。
 *   ヘッダのぶん（上 27px）を空けたままだと、札と札のあいだが 48px も開いて
 *   一覧がすかすかになる ── 広げれば上下とも 7px で、あいだは 28px に詰まる。
 *   箱（泡の大きさ）は動かさないので、**隣の札は 1px も動かない**。
 *   選んだ札だけが、ヘッダを出すぶん上から 20px ぶん譲る。
 */
/* 一覧の札の中身は上 7px から。背が伸びた札だけヘッダのぶん譲る */
.bub > .bl-body.bl-tight{top:7px}
.bub > .bl-body.bl-tight.bl-grown{top:27px}
/*
 * ★ **縦に詰める一覧では、札と札のあいだを限界まで細くする。**
 *   見えている隙間は「並びの隙間（LIST_GAP ＝ 0）＋ 札の上下の余白 × 2」なので、
 *   ここを 1px にすると白い箱どうしのあいだは **2px** になる（前は 4 ＋ 7×2 ＝ 18px）。
 *   左右はそのまま ── 詰めたいのは札どうしのあいだで、枠との余白ではない。
 * ★ **透視（奥行きに重ねる）には掛けない**（.bl-packed が付くのは詰める並びのときだけ）。
 *   そちらは札が重なって見えるので、余白を削ると後ろの札を余計に覆う。
 * ★ 選んで背が伸びた札だけは、ヘッダを出すぶん上を譲る（.bl-grown）。
 */
.bub > .bl-body.bl-tight.bl-packed{top:1px;bottom:1px}
/*
 * ★ **泡になったら、下にも左右と同じだけ余白を置く。**
 *   静かなときの上下 1px は「札と札のあいだを細くする」ためのもので、
 *   装いが出て泡になったら話が別 ── 枠と中身が下だけぴたりと接していて、
 *   左右 7px と揃わない。上は装いのぶん 27px、下は左右と同じ 7px。
 *   伸びる高さ（BubbleSpace の SELECTED_GROW）はこの差ぶん ＝ (27+7)−(1+1) ＝ 32。
 *   札の背が 32px 伸びるので、**並びの後ろの札もそのぶんずれる**（中身の高さは変わらない）。
 */
.bub > .bl-body.bl-tight.bl-packed.bl-grown{top:27px;bottom:7px}
/*
 * 伸びない並べ方（奥行きに重ねる）で選んだときは、装いを**中身の上に重ねる**
 * ── 位置は 1px も動かさない。中身は上 7px が余白なので、帯（24px）が重なるのは
 * その余白と、その下の 17px だけ。字にはかからない。
 * 重ねないと、あとから置かれる中身（不透明）に隠れて装いが見えない。
 */
.bub.sel:has(> .bl-body.bl-tight:not(.bl-grown)) > .hd,
.bub.sel:has(> .bl-body.bl-tight:not(.bl-grown)) > .ttl,
.bub.sel:has(> .bl-body.bl-tight:not(.bl-grown)) > .bl-close{z-index:2}

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
