/**
 * **泡の皮** ── 泡の見た目を、ウィンドウからシャボン玉の膜へ着せ替える。
 *
 * > 泡は、ObjectView に触れたときに浮かぶ膜と同じものでできている。
 *
 * ★ **着るかどうかは海を立てる側が決める。** 祖先に `BUBBLE_SKIN`（クラス名）が
 *   付いていれば着る。付けなければ今までどおり（SPACE_CSS の見た目）。
 *   窓の中の海も同じ祖先の下に居るので、同じ皮を着る。
 * ★ **変えるのは塗り・角丸・縁・影・文字色だけ。** 箱の大きさ・位置・中身の席
 *   （`CHROME`）には手を出さない ── SPACE_CSS と同じ約束。
 * ★ 膜の色は ObjectView の膜（SPACE_CSS の `.bl-object::after`）と同じ数から取る。
 * ★ **泡なので、後ろが透ける。** ただし重なるのが前提の並べ方なので、透けたままだと
 *   重なった所の字が読めない ── 後ろを**ぼかして**透かす（すりガラス）。
 *   形は見えるが字は混ざらない。中身の板も同じ決まりで、白を少しだけ透かす。
 * ★ ぼかし（backdrop-filter）は重い。泡が多い海で掴んで動かすと、毎フレーム
 *   後ろを塗り直すことになる ── 重ければ、まずぼかしの強さを下げる。
 * ★ 見えない親（`.imp`）は体を持たないので、膜を着せない。
 * ★ **装いは、触っているあいだだけ着る。** 触っていない泡は中身だけが浮かぶ。
 *   触っている ＝ ホバーしている・選んでいる・中の欄を打っている（`:focus-within`）。
 *   決まりは `--bl-dress`（0 か 1）の 1 つだけで、膜・輪・帯・題名・口がどれもそれを読む。
 * ★ 出し入れしても**中身は 1px も動かない**。消すのは塗りだけで、箱も中身の席もそのまま
 *   （ObjectView の膜が、触れたときに中身の周りへ浮かぶのと同じ出方）。
 * ★ 膜は泡の本体ではなく**膜の板**（`.bl-film`）に描く。本体の地（背景のグラデーション）は
 *   滑らかに出し入れできないので、板ごと薄める。
 * ★ 見えていない口（閉じる・鎖・ロック）は押せない。指で触る画面では、見えない × を
 *   押した瞬間に泡が消える、が起きるので。
 *
 * 帯（`.hd`）の形は、まだ決めていない。いまは膜になじむ薄いすりガラスにしてある。
 */

/** 泡の皮を着せる印（祖先に付けるクラス名） */
export const BUBBLE_SKIN = 'bl-skin-bubble';

const S = `.${BUBBLE_SKIN}`;

export const BUBBLE_SKIN_CSS = `
/* 一覧の板（ListSpace の LIST_PANEL）── 膜の上に乗るので、灰色ではなく白いすりガラスに */
/* ★ 触っていないあいだは膜が無く、暗い海の上に直に乗るので、白は濃いめに */
/*
 * 板の白とぼかしは変数にしてある ── 海の地によって、ちょうどよい白の濃さが違うので。
 * ★ 既定は暗い海向け（白を濃く）。白を減らすと、暗い地が透けて灰色にくすむ。
 *   明るい絵を敷いた海は、海の器（BubbleSea の style）で薄い白に差し替える
 *   ── そうすると、ぼけた絵が板の向こうに透けて見える。
 */
${S}{--bl-list-panel:linear-gradient(180deg,rgba(255,255,255,.9) 0%,rgba(248,249,253,.82) 100%);
  --bl-body-glass:linear-gradient(180deg,rgba(255,255,255,.9) 0%,rgba(248,249,253,.84) 100%);
  /* 一覧の板も、中身の板と同じすりガラス（後ろが透けても字が混ざらない） */
  --bl-list-blur:blur(14px) saturate(1.4)}
/* 泡の本体は地を持たない。地は膜の板（.bl-film）が持つ */
${S} .bub:not(.imp){--rr:22px;--rw:1px;--rc:rgba(255,255,255,.72);--bl-dress:0;
  background:none;box-shadow:none}
/* 触っているあいだだけ装いを着る */
${S} .bub:not(.imp):is(:hover,.sel,:focus-within){--bl-dress:1}
/* 選んだ泡 ── 膜の水色で輪を太く */
${S} .bub.sel:not(.imp){--rw:2.2px;--rc:hsl(200 92% 64%)}

/* 膜の板。ObjectView の膜と同じく、少し縮んだ所から浮かんでくる */
${S} .bub > .bl-film{display:block;position:absolute;inset:0;border-radius:var(--rr);pointer-events:none;
  /* 色の濃さは --bl-film-k で薄められる（板ごと opacity で薄めると、板の上に描く照りまで薄まるので） */
  background:
    radial-gradient(115% 85% at 22% 16%,rgba(255,255,255,calc(.6 * var(--bl-film-k,1))) 0%,rgba(255,255,255,0) 58%),
    radial-gradient(90% 70% at 82% 88%,rgba(255,228,246,calc(.5 * var(--bl-film-k,1))) 0%,rgba(255,228,246,0) 60%),
    linear-gradient(135deg,rgba(255,158,214,calc(.44 * var(--bl-film-k,1))) 0%,rgba(190,173,255,calc(.4 * var(--bl-film-k,1))) 34%,
      rgba(138,219,255,calc(.36 * var(--bl-film-k,1))) 66%,rgba(178,255,231,calc(.34 * var(--bl-film-k,1))) 100%),
    hsl(232 45% 94% / calc(.22 * var(--bl-film-k,1)));
  -webkit-backdrop-filter:blur(14px) saturate(1.5);backdrop-filter:blur(14px) saturate(1.5);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.6),inset 0 1px 6px rgba(255,255,255,.5),
    0 10px 36px rgba(122,138,214,.32),0 2px 8px rgba(20,24,48,.18);
  opacity:var(--bl-dress);transform:scale(calc(.97 + .03 * var(--bl-dress)))}
/* 一覧の中の静かな札（選んでいないとき）は中身だけ ── 膜も出さない（SPACE_CSS の .bl-quiet と同じ決まり） */
${S} .bub:not(.sel):has(> .bl-quiet) > .bl-film{display:none}
/* 輪（FIELD_CSS の ::after）も装いのうち */
${S} .bub:not(.imp)::after{opacity:var(--bl-dress)}

/* 帯：膜の上に薄いすりガラス。字は膜の上で読める濃さに */
${S} .bub > .hd{background:linear-gradient(180deg,rgba(255,255,255,.42),rgba(255,255,255,.08));
  backdrop-filter:none;border-radius:var(--rr) var(--rr) 0 0;opacity:var(--bl-dress)}
${S} .bub > .ttl{color:#2c3150;opacity:calc(.85 * var(--bl-dress))}
${S} .bub > .bl-view{opacity:var(--bl-dress)}
${S} .bub > .bl-close,
${S} .bub > .bl-tool,
${S} .bub > .bl-link{color:#2c3150;opacity:calc(.5 * var(--bl-dress))}
${S} .bub > .bl-close:hover,
${S} .bub > .bl-tool:hover,
${S} .bub > .bl-link:hover{opacity:var(--bl-dress);background:rgba(44,49,80,.08)}
${S} .bub > .bl-link[data-copied]{opacity:var(--bl-dress);color:hsl(150 60% 32%)}
${S} .bub > .bl-tool[aria-pressed="true"]{color:hsl(200 80% 42%)}
/* 見えていない口は押せない */
${S} .bub:not(:hover):not(.sel):not(:focus-within) > :is(.bl-close,.bl-tool,.bl-link){pointer-events:none}

/* 出し入れは ObjectView の膜と同じ長さ・同じ曲線 */
${S} .bub > :is(.bl-film,.hd,.ttl,.bl-view,.bl-close,.bl-tool,.bl-link),
${S} .bub:not(.imp)::after{transition:opacity 160ms ease-out,transform 160ms ease-out}
@media (prefers-reduced-motion:reduce){
  ${S} .bub > :is(.bl-film,.hd,.ttl,.bl-view,.bl-close,.bl-tool,.bl-link),
  ${S} .bub:not(.imp)::after{transition:none}
}

/*
 * 風（並べる）── 膜が中身の**前**へ回る。どの泡も包まれ、装いを着る。
 * ★ 前に回るのは裏の膜の板そのもの（新しい板は足さない）。並べ終えて使うモードに戻れば、また裏へ。
 * ★ 前の膜はぼかしを弱く、少し薄くする ── 中身は透けて読めるが、膜の向こうにあると分かる程度。
 * ★ 中身は 1 つの重なりに閉じ込める（isolation）。中身が自分で z-index を持っていると
 *   （地図の板は 400、一覧の中の層は 1）、膜を追い越して前に出てしまうので。
 * ★ 帯・題名・口は膜のさらに前（押せる口は押せるまま）。
 */
${S} .bl-wind > .bl-hold > .bub:not(.imp){--bl-dress:1}
${S} .bl-wind > .bl-hold > .bub > .bl-body{isolation:isolate}
${S} .bl-wind > .bl-hold > .bub > .bl-film{z-index:1;--bl-film-k:.7;
  -webkit-backdrop-filter:blur(1px) saturate(1.15);backdrop-filter:blur(1px) saturate(1.15)}
${S} .bl-wind > .bl-hold > .bub > :is(.hd,.ttl,.bl-view,.bl-close,.bl-tool,.bl-link){z-index:2}
/*
 * 光の照り返しを一筋 ── 膜が前に張っていることを、色ではなく形で言う。
 * ★ 左上の角に沿った短い弧（円の上と左の縁だけを描き、両端は薄める）。シャボン玉の照りと同じ所。
 * ★ 大きさは泡の**短辺**から出す（膜の板を寸法の入れ物にして cqmin で測る）。
 *   縦横の比に引きずられると、縦長の一覧では細長い輪、大きな地図では縁を下りる「C」になる。
 */
${S} .bl-wind > .bl-hold > .bub > .bl-film{container-type:size}
${S} .bl-wind > .bl-hold > .bub > .bl-film::before{content:"";position:absolute;left:5cqmin;top:5cqmin;
  width:46cqmin;height:46cqmin;border-radius:50%;
  border:solid #fff;border-width:clamp(4px,2cqmin,9px) 0 0 clamp(4px,2cqmin,9px);
  filter:drop-shadow(0 0 4px rgba(255,255,255,.9));
  -webkit-mask-image:radial-gradient(circle at 22% 22%,#000 0,#000 26%,transparent 50%);
  mask-image:radial-gradient(circle at 22% 22%,#000 0,#000 26%,transparent 50%)}
/*
 * 一覧の中の札は、一覧の膜の**内側**のもの。
 * ★ DOM では一覧の兄弟なので、一覧の膜を追い越して前に出てしまう ── 札にも同じ膜を張る。
 *   照りと装いは付けない（照りは一覧に 1 筋だけ。札ごとに輪や帯が出ると騒がしい）。
 */
${S} .bl-wind > .bl-hold > .bub:has(> .bl-quiet){--bl-dress:0}
${S} .bl-wind > .bl-hold > .bub:has(> .bl-quiet) > .bl-film{display:block;opacity:1}
${S} .bl-wind > .bl-hold > .bub:has(> .bl-quiet) > .bl-film::before{content:none}

/* 中身の板：角を泡の角に合わせる（外の角丸 22 − 左右の装い 7） */
${S} .bub > .bl-body{border-radius:15px;
  box-shadow:inset 0 1px 3px rgba(40,50,90,.06),0 0 0 1px rgba(255,255,255,.55)}
/*
 * 中身の板も少しだけ透かす（字が読めるぶんの白は残す）。窓・地なしは中身が自分で地を持つので触らない。
 * ★ 板は**自分でもすりガラスを持つ**。触っていないあいだは後ろに膜が無く、暗い海が直に透けて
 *   灰色にくすむので。
 */
${S} .bub > .bl-body:not(.bl-clear):not(.bl-none){
  background:var(--bl-body-glass);
  -webkit-backdrop-filter:var(--bl-list-blur);backdrop-filter:var(--bl-list-blur)}
${S} .bub > .bl-body.bl-clear{border-radius:0 0 calc(var(--rr) - 2px) calc(var(--rr) - 2px);box-shadow:none}
${S} .bub > .bl-body.bl-none{box-shadow:none}
`;
