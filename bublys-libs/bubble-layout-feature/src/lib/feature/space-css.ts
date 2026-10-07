/**
 * 中身のある泡の見た目 ── 本文の席・閉じる・ObjectView の膜。
 * 泡そのものの見た目は `bubble-layout-ui` の `FIELD_CSS`。
 *
 * ★ **中身の席（`.bl-body` の inset）は、模型の装いの表（`CHROME`）から書き出す。**
 *   ここに数を直に書くと、模型（箱の大きさ）と CSS（中身の席）が別々の数を持ち、
 *   ずれが「一覧の口の隙間」のような所へ回り込んで埋められる。数は 1 か所。
 */
import { CHROME, chromeInset } from '@bublys-org/bubble-layout';
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

/**
 * **羽** ── 風と針のカーソルが、同じ 1 枚の羽を向きだけ変えて使う。
 *
 * ★ 優雅に ── なめらかな曲線だけで描き、切れ込みはやわらかく 1 つ。根元の毛のような
 *   写実は入れない。白から淡い藤色・水色へ。矢印は出さない（羽だけ）。
 * ★ 縁の下に白を敷いてある。暗い海の上でも、明るい中身の上でも輪郭が沈まないように。
 * ★ 48×48（SVG なので高精細の画面でも滲まない）。大きすぎて使えない環境では控えに落ちる。
 * ★ 押す点はどちらも**羽の軸の根元**（羽ペンのペン先と同じ所）。
 */
const featherSvg = (transform: string) =>
  `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#ffffff'/><stop offset='.5' stop-color='#f2edff'/><stop offset='1' stop-color='#dcefff'/></linearGradient></defs><g transform='${transform}'><path d='M7 0C13 -7 24 -12.6 36 -14.6Q34.6 -12.4 35.6 -11.6Q39.6 -15.4 46 -16C51.5 -16.4 55.5 -14.6 55 -12.6C50 -7 40 -2.6 28 -0.4C19 1.2 11.5 1.4 7 0Z' fill='none' stroke='#fff' stroke-width='2.4' stroke-linejoin='round'/><path d='M0 0C18 0.4 37 -4 54.6 -12.4' fill='none' stroke='#fff' stroke-width='2.2' stroke-linecap='round'/><path d='M7 0C13 -7 24 -12.6 36 -14.6Q34.6 -12.4 35.6 -11.6Q39.6 -15.4 46 -16C51.5 -16.4 55.5 -14.6 55 -12.6C50 -7 40 -2.6 28 -0.4C19 1.2 11.5 1.4 7 0Z' fill='url(#g)' stroke='#8a8dc0' stroke-width='.7' stroke-linejoin='round'/><path d='M17 -0.6Q22 -4.6 25 -9.4M27 -2Q33 -6.4 36.5 -11.6M38.5 -5Q44 -9.4 47.5 -14M19 0.4Q25 0.6 29 -0.6' fill='none' stroke='#d3cdf3' stroke-width='.55' stroke-linecap='round'/><path d='M0 0C18 0.4 37 -4 54.6 -12.4' fill='none' stroke='#8a8dc0' stroke-width='.8' stroke-linecap='round'/></g></svg>`;
const svgCursor = (svg: string, x: number, y: number) =>
  `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${x} ${y}`;

/** 風 ── 根元が左下、羽先が右上（そっと吹いて運ぶ） */
const FEATHER_CURSOR = svgCursor(featherSvg('translate(4 44) rotate(-55) scale(.9 -.9)'), 4, 44);

/** 針 ── 同じ羽を上下に返して、根元が左上・羽先が右下。軸の根元で泡を突いて割る */
const NEEDLE_CURSOR = svgCursor(featherSvg('translate(4 4) rotate(55) scale(.9 .9)'), 4, 4);

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
/* 札は小さい角のまま（FIELD_CSS の .bub.chip）。段に入れると上の --rr:16px が勝つので言い直す */
.bub.chip{--rr:6px}
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
.bub > .bl-close,
.bub > .bl-tool{cursor:pointer}

/* ステータスバー ── 出すのは url。すりガラスの帯 */
.bub > .hd{background:hsl(var(--h) 45% 18% / .5);backdrop-filter:blur(6px);
  border-radius:calc(var(--rr)) calc(var(--rr)) 0 0}
.bub > .ttl{color:#f4f7ff}

/* ★ 中身は泡の中に素の px で置く。泡ごと transform で拡大縮小されるので、
   中身の側では倍率を一切気にしなくてよい（逆 scale も要らない）。
   地は**明るい**── バブリの画面は明るい地を前提に書かれている（暗いままだと字が読めない） */
.bub > .bl-body{position:absolute;${chromeInset(CHROME.plain)};overflow:auto;
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
.bub > .bl-body.bl-clear{${chromeInset(CHROME.bar)};border-radius:0 0 calc(var(--rr) - 2px) calc(var(--rr) - 2px);
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
/* 奥行きに重ねた札 ── わざと細くしてあるので、入らないぶんは送らずに切る（BubbleSpace の註） */
.bub > .bl-body.bl-cut{overflow:hidden}
.bl-noroute{padding:10px 12px;color:#b23c27;font-size:11px;line-height:1.6}
.bub > .bl-close{position:absolute;right:4px;top:3px;width:18px;height:18px;padding:0;
  border:0;border-radius:4px;background:transparent;color:#eaf1ff;opacity:.55;
  font:600 14px/18px var(--f);cursor:pointer;pointer-events:auto}
.bub > .bl-close:hover{opacity:1;background:rgba(255,255,255,.14)}
.bub.nt > .bl-close{display:none}
/*
 * 並びごと閉じる口 ── **並びの名札の隣**。
 *
 * ★ 前は泡の見出しの、閉じるの左どなりに置いていた。押すと並び全部が消えるのに
 *   「この泡の口」の顔をしていたし、並びの泡の数だけ同じ口が並んだ（実測で言われた）。
 * ★ 並びは名札も点線の枠も掴む縁も自分で持っている。**掴む所と閉じる所を同じ側に揃える**と、
 *   1 並び＝1 つになり、泡の閉じるとも離れる。
 * ★ 見た目は名札に合わせる（同じ高さ・同じ座布団・同じ字）。名札の決まりは
 *   bubble-layout-ui の field-css の .lb にある。
 */
/* 名札と口を並べた 1 本の帯。置き所は draw.ts が出した --lbx / --lby（画角の中に寄せてある） */
.bub.imp > .bl-rowtag{position:absolute;display:flex;align-items:stretch;
  left:calc(var(--lbx, -4) * 1px * var(--k));top:calc(var(--lby, 100) * 1px * var(--k));
  height:calc(15px * var(--k));gap:calc(2px * var(--k));
  font-family:var(--f);font-weight:600;font-size:calc(10px * var(--k));line-height:1;white-space:nowrap}
/* ★ 幅は数えない。帯を flex にして、口と名札が並んだぶんだけ伸びるようにする
   ── 数えると、字や余白を変えたときに写しのほうを直し忘れる */
.bub.imp > .bl-rowtag > .bl-close-row{pointer-events:auto;
  display:flex;align-items:center;gap:calc(3px * var(--k));
  padding:0 calc(5px * var(--k));border:0;cursor:pointer;font:inherit;
  color:#ffd9d2;background:rgba(120,30,22,.92);border-radius:calc(3px * var(--k));opacity:.85}
.bub.imp > .bl-rowtag > .bl-close-row:hover{opacity:1;color:#fff;background:rgba(176,42,30,.98)}
/* 名札の見た目は field-css の .lb に合わせる（同じ座布団・同じ字） */
.bub.imp > .bl-rowtag > .bl-rowname{display:flex;align-items:center;
  padding:0 calc(3px * var(--k));color:#cdd8ee;background:rgba(8,10,17,.92);
  border-radius:calc(3px * var(--k));opacity:.8}
.bub.imp.on > .bl-rowtag > .bl-rowname{color:#6ee7ff;opacity:.95}
/* 帯を出したときは、見本の札は引っ込める（同じものが 2 つ出ないように） */
.bub.imp:has(> .bl-rowtag) > .lb{display:none}
/*
 * ステータスバーの口（閉じるの隣）。いまは岸のロックだけが使う。
 * ★ 閉じる（右 4・幅 18）の左隣に 4px 空けて並べるので right は 26。
 *   出るときは url の行き止まりもそのぶん手前へ（下の .bl-url を見よ）。
 */
/*
 * 鎖（url を見る・コピーする）── 閉じるの左隣（閉じる 右 4・幅 18 ＋ 隙間 4 ＝ 右 26）。
 *   ロックが出る泡では、ロックが閉じるの隣に居るので、鎖はそのさらに左（右 48）。
 * ★ 吹き出しは帯のすぐ下、右端に揃えて出す（泡の外へははみ出してよい）。
 *   字は data-url を読むだけ ── 乗せるたびに描き直さない。
 */
.bub > .bl-link{position:absolute;right:26px;top:3px;width:18px;height:18px;padding:0;
  border:0;border-radius:4px;background:transparent;color:#eaf1ff;opacity:.55;
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;pointer-events:auto}
.bub > .bl-link:hover,.bub > .bl-link:focus-visible{opacity:1;background:rgba(255,255,255,.14)}
.bub > .bl-link::after{content:attr(data-url);position:absolute;right:0;top:calc(100% + 6px);z-index:3;
  max-width:360px;padding:4px 8px;border-radius:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  font:500 11px/1.4 var(--f);letter-spacing:.01em;color:#eaf1ff;background:rgba(12,16,28,.92);
  box-shadow:0 4px 14px rgba(0,0,0,.3);pointer-events:none;opacity:0;transition:opacity 120ms ease}
.bub > .bl-link:hover::after,.bub > .bl-link:focus-visible::after,
.bub > .bl-link[data-copied]::after{opacity:1}
.bub > .bl-link[data-copied]{opacity:1;color:#8ff0b8}
.bub.nt > .bl-link{display:none}
.bub:has(> .bl-tool) > .bl-link{right:48px}
.bub > .bl-tool{position:absolute;right:26px;top:3px;width:18px;height:18px;padding:0;
  border:0;border-radius:4px;background:transparent;color:#eaf1ff;opacity:.55;
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;pointer-events:auto}
.bub > .bl-tool:hover{opacity:1;background:rgba(255,255,255,.14)}
/* 効いている印は色で（形も変わるが、遠目には色のほうが速い） */
.bub > .bl-tool[aria-pressed="true"]{opacity:1;color:#6ee7ff}
.bub.nt > .bl-tool{display:none}
/*
 * **並べ方の口** ── 一覧の泡の、枠の**上**にくっつく横長の帯（仮の置き場所）。
 *
 * ★ ステータスバーの中はもう url・ロック・閉じるで埋まっていて、7 つ並べる場所が無い。
 *   まずは外に出して形を見る ── 収まりが決まったら中へ移す。
 * ★ 平行 3 → 魚眼 3 → 透視、の順。**同じ語彙のかたまりのあいだだけ隙間**を空ける。
 */
.bub > .bl-view{position:absolute;left:0;bottom:100%;margin-bottom:5px;
  display:flex;align-items:center;gap:1px;padding:3px 5px;
  border-radius:9px;background:hsl(var(--h) 45% 16% / .92);
  box-shadow:0 2px 10px rgba(0,0,0,.35), inset 0 1px 0 hsla(0,0%,100%,.10);
  pointer-events:auto}
.bub > .bl-view .bl-view-pick{width:20px;height:20px;padding:0;
  display:flex;align-items:center;justify-content:center;
  border:0;border-radius:5px;background:transparent;color:#eaf1ff;opacity:.5;
  cursor:pointer;pointer-events:auto}
.bub > .bl-view .bl-view-pick:hover{opacity:.9;background:rgba(255,255,255,.12)}
/* いま効いているもの ── 色で言う（ロックと同じ） */
.bub > .bl-view .bl-view-pick[aria-pressed="true"]{opacity:1;color:#6ee7ff;background:rgba(110,231,255,.14)}
.bub > .bl-view .bl-view-gap{margin-left:6px}
/* ★ 字の口（窓の見え方）。絵の口（一覧の並べ方）と同じ棚に、同じ見た目の台で出す。
   中身のボタンは自分で色を持っているので、台は高さと余白だけ合わせる */
.bub > .bl-view.bl-view-text{padding:3px 4px;gap:0}
/* 並べ方の 7 つとは**別の項目**（留めるかどうか）。間を広く取って、仕切りを 1 本引く */
.bub > .bl-view .bl-view-apart{position:relative;margin-left:17px}
.bub > .bl-view .bl-view-apart::before{content:"";position:absolute;left:-9px;top:2px;bottom:2px;
  width:1px;background:rgba(234,241,255,.25)}
/* 一覧の札（静か）には出さない ── 並べ方を持っているのは一覧のほう */
.bub.nt > .bl-view{display:none}
/* ★ 中身が差されなかった台は出さない（口を持たない泡にも台だけは置かれるので） */
.bub > .bl-view:empty{display:none}

/* 枠の題名は url。中身が自分の題名を出すので、枠は「どこにいるか」を出す（既存 bubbles-ui と同じ） */
/*
 * ★ 長い url は**閉じるボタンに被る手前で … に切る**。
 *   切り方を横並び（flex）から普通の行（block）に変えてあるのは、
 *   text-overflow:ellipsis が効くのは**行**であって、並べ物の入れ物ではないから
 *   ── flex のままだと、はみ出したぶんがただ切り落とされて … が出ない。
 *   区切りの / は中の字のまま（inline）なので、見た目は今までどおり。
 *   右の余地 56px ＝ 左の 8 ＋ 閉じるボタン（右 4・幅 18）＋ 鎖（幅 18 ＋ 隙間 4）＋ 隙間 4。
 *   ロックが出る泡は、さらにロック 1 つぶん（22px）手前で切る。
 */
.bub:has(> .bl-tool) > .bl-url{max-width:calc(100% - 78px)}
.bub > .bl-url{display:block;max-width:calc(100% - 56px);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.85;
  font:600 11px/24px var(--f);letter-spacing:.01em}
.bl-seg{white-space:nowrap}
/* 膜の板は皮（skin-css）が使う。皮が無い海では出さない */
.bub > .bl-film{display:none}
/*
 * 型の名前とアイコン。アイコンは字の高さに合わせる（MUI の既定 20px では帯 24px に窮屈）。
 * ★ **大きさは transform で縮める。** アイコンは型が名乗った MUI の部品で、MUI の CSS は
 *   段に入っていない ── 器（@layer bl）が width を書いても MUI が必ず勝つ（中身が器に勝つ決まり）。
 *   MUI が触らない性質で、20px を 14px の台に収める。
 */
.bl-kind{display:inline-flex;align-items:center;gap:5px;height:24px;vertical-align:top;white-space:nowrap}
/* 台は flex にして、中の svg の display（MUI が決める）に行の高さを左右させない */
.bl-kind-icon{display:flex;flex:none;width:14px;height:14px;line-height:0;overflow:visible}
.bl-kind-icon > svg{flex:none;transform-origin:0 0;transform:scale(.7)}
.bl-kind-list{opacity:.7;font-weight:500}
.bl-sep{opacity:.45;margin:0 3px}
/*
 * 一覧の中の札 ── **選んでいないあいだは「中身だけ」**。
 * 枠（輪・地・影）もステータスバー（色の帯・url・閉じる）も出さない。
 * 一覧は「どれを選ぶか」を見る画面なので、札ごとに泡の装いが並ぶと中身が読めない。
 * 触れば泡として立ち上がる ── 消しているのではなく、静かにしているだけ。
 *
 * ★ **静かなのは「一覧の中に居て、選ばれていないとき」だけ**（BubbleSpace の装いの表）。
 *   海に浮いていれば装い、岸に着けば装い無し ── 置かれた場所が決める。
 */
.bub:not(.sel) > .bl-quiet{display:none}
.bub:not(.sel):has(> .bl-quiet){background:none;box-shadow:none}
.bub:not(.sel):has(> .bl-quiet)::after{content:none}
.bub:not(.sel):has(> .bl-quiet) > .hd,
.bub:not(.sel):has(> .bl-quiet) > .bl-close,
.bub:not(.sel):has(> .bl-quiet) > .bl-tool,
.bub:not(.sel):has(> .bl-quiet) > .bl-link{display:none}
/*
 * ★ 装いを出さないあいだは、**その空けてあった所まで中身を広げる**。
 *   ヘッダのぶん（上 27px）を空けたままだと、札と札のあいだが 48px も開いて
 *   一覧がすかすかになる ── 広げれば上下とも 7px で、あいだは 28px に詰まる。
 *   箱（泡の大きさ）は動かさないので、**隣の札は 1px も動かない**。
 *   選んだ札だけが、ヘッダを出すぶん上から 20px ぶん譲る。
 */
/* 一覧の札の中身は上 7px から。装いを出した札だけ帯のぶん譲る */
.bub > .bl-body.bl-tight{${chromeInset(CHROME.quiet)}}
.bub > .bl-body.bl-tight.bl-grown{${chromeInset(CHROME.plain)}}
/*
 * ★ **詰める一覧の札に装いは無い（箱＝中身）。**
 *   見えている隙間は**並べ方が決める**（View の軸の gap ＝ LIST_GAP）。
 *   装いを 1px でも持たせると、札どうしがその 2 倍ぶん勝手に開き、
 *   一覧の幅も「中身＋装い＋余白」で数えることになる ── 中身だけを見て決められなくなる。
 * ★ **透視（奥行きに重ねる）には掛けない**（.bl-packed が付くのは詰める並びのときだけ）。
 *   そちらは札が重なって見えるので、余白を削ると後ろの札を余計に覆う。
 */
.bub > .bl-body.bl-tight.bl-packed{${chromeInset(CHROME.packed)}}
/*
 * ★ **装いを出したら、普通の泡と同じ枠**（上は帯のぶん 27、下と左右は 7）。
 *   静かなときの上下 1px は「札と札のあいだを細くする」ためのもので、装いが出たら話が別。
 *   差（(27+7)−(1+1) ＝ 32）だけ箱が伸びるので、**並びの後ろの札はそのぶん送られる**
 *   ── 中身の高さは 1px も変わらない（箱＝中身＋装い）。
 */
.bub > .bl-body.bl-tight.bl-packed.bl-grown{${chromeInset(CHROME.plain)}}
/*
 * 伸びない並べ方（奥行きに重ねる）で選んだときは、装いを**中身の上に重ねる**
 * ── 位置は 1px も動かさない。重ねないと、あとから置かれる中身（不透明）に隠れて見えない。
 */
.bub.sel:has(> .bl-body.bl-tight:not(.bl-grown)) > .hd,
.bub.sel:has(> .bl-body.bl-tight:not(.bl-grown)) > .ttl,
.bub.sel:has(> .bl-body.bl-tight:not(.bl-grown)) > .bl-close,
.bub.sel:has(> .bl-body.bl-tight:not(.bl-grown)) > .bl-tool,
.bub.sel:has(> .bl-body.bl-tight:not(.bl-grown)) > .bl-link{z-index:2}


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

/*
 * 風（並べる）── 海のモード（BubbleSpace の SeaMode）。層に .bl-wind が付く。
 * ★ 自分の層の泡だけに効かせる（子の結合子）。窓の中の海は、窓ごと手が届かなくなるので要らない。
 * ★ 中身へは手を届かせない。押した所はどこでも泡の枠になる（当たり判定は wholeGrab）。
 * ★ カーソルは海ぜんぶで羽 ── 背景の上でも、いまのモードが見えるように。
 *   閉じる・道具の口はそのまま押せるので指のまま。角は大きさを変える矢印のまま。
 */
.bl-wind > .bl-hold > .bub > .bl-body{pointer-events:none}
.bl-wind,.bl-wind .bub,.bl-wind .bub *{cursor:${FEATHER_CURSOR},grab}
.bl-wind .bub > :is(.bl-close,.bl-tool,.bl-link){cursor:pointer}
.bl-wind > .bl-hnd{cursor:nwse-resize}

/*
 * 針 ── × を押したまま引いている間だけ。層に .bl-needle が付く。
 * ★ どの泡にも**急所**（.bl-spot）が出る。筆跡が急所を通った泡が割れる（BubbleSpace の armNeedle）。
 *   急所は × の下、泡の右上の**内側**── 割るものと閉じるものが同じ所にある。
 *   くっきりした玉ではなく、縁のぼやけた赤い光（膜の一部がぼんやり赤くなっている）。
 *   大きめにして、おおざっぱに引いても当たるようにする（直径 64、赤が濃いのは真ん中）。
 *   泡ごと縮んで描かれる（transform）ので、px で書けば遠い泡の急所は一緒に小さくなる。
 * ★ 中身へは手を届かせない ── 筆跡の当たりは急所だけで取るので、中身が上にあると隠れる。
 */
.bub > .bl-spot{display:none}
/* 中身は 1 つの重なりに閉じ込める ── 中身が自分で z-index を持つと（地図の板は 400）、急所を追い越して前に出る */
.bl-needle > .bl-hold > .bub > .bl-body{pointer-events:none;isolation:isolate}
.bl-needle > .bl-hold > .bub > .bl-spot{display:block;position:absolute;right:6px;top:28px;z-index:3;
  width:64px;height:64px;border-radius:50%;pointer-events:auto;
  background:radial-gradient(circle,rgba(236,34,62,.85) 0,rgba(236,34,62,.6) 28%,rgba(236,34,62,.22) 52%,rgba(236,34,62,0) 72%);
  animation:bl-spot-beat 1.4s ease-in-out infinite}
/*
 * 当たりは、見える赤より画面の上でいつも少し広い（見えない縁）。
 * ★ 遠い泡は急所も縮んで写るので、そのままだと遠いものほど当てにくい。縁の幅は --k
 *   （写る倍率の逆数）を掛けて、泡がどれだけ縮んでも画面の上で同じにする。
 */
.bl-needle > .bl-hold > .bub > .bl-spot::before{content:"";position:absolute;inset:calc(-6px * var(--k,1));border-radius:50%}
/* 呼吸 ── 大きさは変えず、赤の濃さだけが寄せては引く（膜が脈打つ） */
@keyframes bl-spot-beat{0%,100%{opacity:.75}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){ .bl-needle > .bl-hold > .bub > .bl-spot{animation:none} }
/*
 * 急所を持たない泡（一覧の札）は、針を素通しにして薄める。
 * ★ 札は DOM では一覧の兄弟で、一覧より前に描かれる ── そのままだと一覧の急所が札の下に隠れ、
 *   筆跡も札に当たって届かない。薄めれば、下の急所が透けて見え、札が割る相手でないことも伝わる。
 * ★ 薄めるのは filter ── 泡の opacity は遠さの薄まりとして style に直に入っているので、上書きできない。
 */
.bl-needle > .bl-hold > .bub:not(:has(> .bl-spot)),
.bl-needle > .bl-hold > .bub:not(:has(> .bl-spot)) *{pointer-events:none}
.bl-needle > .bl-hold > .bub:not(:has(> .bl-spot)){filter:opacity(.3)}
.bl-needle,.bl-needle .bub,.bl-needle .bub *{cursor:${NEEDLE_CURSOR},crosshair}

/* はじける泡（popEffect.ts）── 割った瞬間の写し。手は素通し（筆跡の当たりを邪魔しない） */
/* ★ 写しは現れ直さない ── 泡の出現アニメ（bl-in）まで写ると、割れる泡がふわっと現れ直す */
.bl-pop-ghost,.bl-pop-ghost *{pointer-events:none !important;transition:none !important;animation:none !important}
.bl-pop-fx{position:absolute;left:0;top:0;transform-origin:0 0;overflow:visible}
.bl-pop-ring{position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;
  border:2px solid rgba(255,255,255,.95);box-shadow:0 0 10px rgba(255,140,170,.75),inset 0 0 6px rgba(255,255,255,.8)}
.bl-pop-drop{position:absolute;border-radius:50%;
  background:radial-gradient(circle at 35% 30%,#fff 0,rgba(255,182,224,.95) 45%,rgba(150,214,255,.85) 100%);
  box-shadow:0 0 4px rgba(255,255,255,.7)}
`;
