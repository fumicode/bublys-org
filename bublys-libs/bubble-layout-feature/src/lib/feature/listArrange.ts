/**
 * 一覧の**並べ方の決まり**だけを集めた所 ── React も世界も要らない、ただの寸法の話。
 *
 * 一覧がやることは 2 つしかない（`ListSpace` の註）。そのうちの
 * 「**並べ方を選ぶ**」と「その並べ方のときの札の形」がここ。
 *
 *   1. 縦に並べて**収まる** … 縦に並べる（`column`）
 *   2. 収まらない ＋ 箱が**縦にも横にも 2 枚以上とれる** … 折り返す coverflow
 *   3. 収まらない ＋ 箱が**横長** … coverflow（横へ送る）
 *   4. 収まらない ＋ 箱が**縦長** … 縦の coverflow（上下へ送る）
 *
 * ★ 3 と 4 の分かれ目は**箱の形**。入りきらないぶんをどちらへ送るかは、
 *   「長いのはどちらの向きか」で決まる ── 送る道が長いほうへ送る。
 * ★ 2 が先。**どちらの向きにも並べる場所があるなら、1 列に押し込めずに折り返す**。
 *
 * ★ **この条件は仮。** ラボの並べ方を**全部輸入してから、条件ごと整理し直す**
 *   （2026-09-24 の申し送り）。いまは `stackDepth`（奥行きに重ねる）に出番が無い
 *   ── 消してはいない。選び方を決め直すときに、もう一度机に乗せる。
 */
import { METRICS } from '@bublys-org/bubble-layout';
import type { PresetId } from '@bublys-org/bubble-layout';

/**
 * 一覧の並びの隙間。**0**（札が自分で上下 7px の余白を持っている）。
 * 既定（{@link METRICS.GAP} ＝ 14）のままだと札と札のあいだが 28px も開く。
 */
export const LIST_GAP = 0;

/**
 * 一覧の**中身**の既定。バブリはどれも同じ大きさの一覧を出す。
 *
 * ★ 高さは「**縦に並べるか、そうでないか**」の境目でもある ── 箱は詰める軸で中身が入るまで
 *   伸びるので、伸びたあとで測ると「収まる」がいつも真になる。だから境目は**自前の大きさ**で見る。
 * ★ **中身の数**（`chrome.ts`）。前は装い込みの箱 420×540 だった
 *   ── 普通の泡の装い（左右 7・上 27・下 7）を引いて 406×506。見た目は変わらない。
 */
export const LIST_BOX = { width: 406, height: 506 } as const;

/**
 * 一覧の中の札の幅 ── **箱の中身いっぱい**。
 *
 * ★ 左右に残るのは並びの余白（`METRICS.PAD`）だけ。前は札を 280 にしていたので、
 *   一覧の中で **左右に 70px ずつ空いていた**（札の隙間は 4 なのに）。
 *   広く取ってあったのは「右の余白に口（＋新規）を収める」ためだったが、
 *   口の幅（60 ＋ 隙間 8）に対して余白は 56 しかなく**そもそも収まっていない**
 *   ── 口は上の帯へ回っていた（`pickPreset` の `needsBand`）。つまり余白は誰の役にも立っていない。
 */
export const LIST_CARD_WIDTH = LIST_BOX.width - METRICS.PAD * 2;

/**
 * 透視（奥行きに重ねる）のときだけ、札を左右にこれだけ細くする。
 *
 * ★ **後ろの札の肩を出すため。** 子の空間の消失点は「自分の中身の箱の左上の角」なので、
 *   奥へ行った札の左端は `cx + vp.x·(1−m) − (幅/2)·m`。**幅がちょうど中身の箱いっぱい**だと
 *   `幅/2 = |vp.x|` で `m` の項が消え、**奥も手前も左端がぴたりと揃う**（実測：どの札も 84.0）。
 *   揃うと手前の札が後ろをまっすぐ覆ってしまうので、透視では細くして階段に戻す。
 */
export const LIST_DEPTH_INSET = 56;
/** 透視のときの札の幅（既定の箱での値。実際は箱から測る ── {@link itemWidthFor}） */
export const LIST_DEPTH_CARD_WIDTH = LIST_CARD_WIDTH - LIST_DEPTH_INSET * 2;

/**
 * **coverflow の送り幅は、札の幅に対する割合で決まる。**
 *
 * 札より少し狭くすると、隣が肩を出して「まだ後ろに居る」が見える。
 * ラボ（v5-dom の場面 3）は写真 90 に対して刻み 68 ＝ **0.756**。同じ比を使う。
 * 1 を超えると隙間が空いて、ただの横並びになる。
 */
export const COVERFLOW_STEP_RATIO = 68 / 90;

/** 格子のいちばん小さい形 ── **2×2**。これを下回るなら、それは格子ではない */
export const GRID_MIN_SIDE = 2;

/**
 * **折り返す魚眼の箱の大きさ** ── 中心と、その上下左右。
 *
 * > **真ん中の 3 列（3 行）で箱の 8 割。残りの 2 割に、外の列がぜんぶ入る。**
 *
 * ★ 全部が原寸で入る大きさにしては**魚眼の意味が無い**（レンズが何もしない）。
 *   かといって際限なく小さくすると、真ん中まで読めなくなる。
 *   「中心 ＋ 上下左右がちょうど収まって、その外はチラ見え」がいちばん働く形。
 * ★ 画は tanh なので、この割り当てから箱の大きさが 1 つに決まる:
 *   3 列ぶん（札 1.5 枚ぶん）の像が箱の 8 割 → `tanh(1.5·札 / H) = 0.8`
 *   → `H = 1.5·札 / atanh(0.8)`、箱 ＝ 2H ＝ **札の約 2.73 倍**。
 *
 *   そのときの姿（計算値。中心からの位置は箱の半分に対する割合）:
 *     中心 96% ／ 上下左右 61%（58%）／ その外 20%（87%）／ さらに外 5%（97%）
 *
 * ★ はじめは 9 割で測っていたが、**外側が中心へ潜り込みすぎた**
 *   （上下左右が 45% まで潰れ、箱の縁に何も無い余白が残る）。
 *   8 割にすると外側が一回り大きくなって、箱の中に散る。
 */
export const LENS_GRID_SHARE = 0.8;
/**
 * 折り返す魚眼の**素の隙間**（刻み ＝ 札 ＋ これ）。
 *
 * ★ **隙間も一緒に歪む。** 並べ方に直した魚眼は「大きさ ＋ 隙間」の 2 つで歪みを言うので、
 *   隙間を 0 にすると（＝刻みを札そのものにすると）札が地続きの 1 枚に見えて、
 *   どこまでが 1 枚か読めない。素の隙間を置いておけば、中心では素のまま、
 *   端へ行くほどレンズが詰めてくれる ── 小さく写っているもの同士ほどマージンが小さい。
 * ★ 詰める一覧の隙間（{@link LIST_GAP} ＝ 0）とは別 ── あちらは札が自分の余白で離れている。
 *   こちらは端で札の余白ごと潰れるので、並べ方の側が持つ。
 */
export const LENS_GRID_GAP = METRICS.GAP;
export const LENS_GRID_BOX = 3 / Math.atanh(LENS_GRID_SHARE);

/** 口（＋新規）の場所 ── 中身の箱の上からの位置と、その下に空ける隙間 */
const HEAD_TOP = 2;
/**
 * 口の下に空ける隙間。**見えている隙間は 10px** ──
 * 枠の CSS（.bl-body の上 27px）と模型のヘッダ（24px）の差 3px を込みにしてある。
 */
const HEAD_GAP = 13;
/** 口を右の余白に置くときの、札とのあいだ */
const HEAD_MARGIN = 8;

export type Box = { readonly w: number; readonly h: number };

/**
 * **口のために縦の場所を取るか。**
 *
 * 口は右上の角に置く。札は横に中央ぞろえなので、箱が札より十分広ければ右の余白に収まり、
 * 縦の場所取りは要らない（下までいっぱいに詰められる）。
 * 細くして右の余白が消えたときだけ、口の段を縦に空ける。
 */
export const needsBand = (box: Box, itemWidth: number, headBox: Box | null): boolean =>
  !!headBox && (box.w - itemWidth) / 2 - METRICS.PAD < headBox.w + HEAD_MARGIN;

/**
 * 並びの上に空けておく量 ── **口の底＋隙間まで**（枠の余白のぶんは、並びの側でもう空いている）。
 * 並びはこのすぐ下から積む（View の軸の reserve）。
 */
export const reserveFor = (headBox: { readonly h: number } | null): number =>
  headBox ? Math.max(0, HEAD_TOP + headBox.h + HEAD_GAP - METRICS.PAD) : 0;

/**
 * その向きに、札が**何枚とれるか**（枠の余白を引いた中身の側で数える）。
 * 折り返すかどうかも、何列で折り返すかも、この 1 つの数え方で決まる。
 */
const fitsAcross = (boxSide: number, cardSide: number): number =>
  Math.max(0, Math.floor(Math.max(0, boxSide - METRICS.PAD * 2) / Math.max(1, cardSide)));

/**
 * **何列で折り返すか。** 折り返さない並べ方では `undefined`。
 *
 * > **格子は 2×2 を最低とし、空きと札の大きさから、入るだけ列を足す。**
 *
 * ★ **2 列を下回らない。** 1 列なら格子ではなく、ただの縦の並び
 *   ── 「格子」を選んだのに縦一列になるのでは、選んだ意味がない。
 *   箱に 1 列ぶんしか無くても 2 列にして、はみ出したぶんは見切れさせる
 *   （札の大きさは箱が決めない、の続き）。
 * ★ どこで折り返すかは**箱の話**なので、View（見え方）ではなく並べる側が持つ。
 *   View に持たせると「箱の大きさ」が見え方の一部になってしまい、
 *   同じ見え方を別の大きさの箱で使えない。
 */
export const colsFor = (
  preset: PresetId,
  box: Box,
  itemWidth: number,
  count = 0,
  itemHeight = 0,
): number | undefined => {
  if (preset !== 'grid' && preset !== 'coverflowGrid') return undefined;
  if (preset === 'grid') return Math.max(GRID_MIN_SIDE, fitsAcross(box.w, itemWidth));
  return gridColsForLens(box, { w: itemWidth, h: itemHeight }, count);
};

/**
 * **折り返す魚眼の列数** ── 「箱に何枚入るか」では決めない。
 *
 * > 詰める格子は**箱が**折り返す所を決める。魚眼の格子は**枚数と箱の形**で決める。
 *
 * ★ **入る枚数で決めると、魚眼の甲斐がない。** 端へ行くほど小さく写るのに、
 *   並べる数が詰める格子と同じままなら、小さくなったぶんは**ただの余白**になる
 *   （実測：6 枚が 2 列 3 行のまま、上下の行に横 113px の空きが残った）。
 *   何枚入るかはレンズが面倒を見るので、こちらは**形**だけ決める。
 * ★ 形は**箱に似せる**（札を単位に測った縦横比）。横長の箱なら列が増え、縦長なら行が増える。
 *   箱の大きさ（`fitBoxFor`）も同じ考え方で「四角に近い形」から測っているので、
 *   選んだ直後の箱と並びで**数が食い違わない**（前は箱が 3 列ぶん・並びが 2 列で食い違っていた）。
 */
const gridColsForLens = (box: Box, card: Box, count: number): number => {
  const n = Math.max(1, count);
  const w = Math.max(1, card.w);
  const h = Math.max(1, card.h);
  /** 札を単位にした箱の縦横比（横に何枚ぶん ÷ 縦に何枚ぶん） */
  const aspect = (box.w / w) / Math.max(1e-6, box.h / h);
  /**
   * ★ **奇数にする。** 魚眼は「**中心の 1 つ**が原寸で、そこから離れるほど小さい」並べ方なので、
   *   偶数列だと中心が列と列のあいだに落ちて、原寸の札が 1 枚も無くなる。
   *   そのうえ両隣が半端に縮むので、いちばん外は縮みが重なって**消えてしまう**
   *   （実測：16 枚を 4 列にすると 4 隅が 12×3px になり、描く下限を切って出なくなった）。
   */
  const want = Math.sqrt(n * aspect);
  const odd = Math.max(3, 2 * Math.round((want - 1) / 2) + 1);
  return Math.max(GRID_MIN_SIDE, Math.min(n, odd));
};

/**
 * **その並べ方に合う箱の大きさ**（中身の側。装いは箱が外へ足す）。
 *
 * > 並べ方を選んだら、その並べ方に合う大きさへ ── **追いかけ合うとき**（`follows`）だけ。
 *
 * 規則は 1 つ:
 *
 * > **並びの広がりが、ちょうど入る大きさ。広がりは「刻み」で測る。**
 *
 * ★ 刻みは並べ方が持っている ── **詰める並びの刻みは札そのもの**（`n 枚ぶん`）、
 *   **魚眼の刻みは札より狭い**（札の 0.756 倍。肩を出して重ねるので）。
 *   だから魚眼の箱は平行な兄弟より**少し小さく**なり、端の何枚かにだけレンズが効く
 *   ── 「箱が小さくても全部見える」ための並べ方なので、それでちょうどいい。
 * ★ **透視は「手前の札＋奥へ逃げるぶん」**。こちらは軸に次元を刺さない（奥行きだけ）ので
 *   刻みでは測れない。奥へ退く量は、後ろの肩を出すために細くする量と同じだけ見ておく。
 * ★ 格子の列数は**四角に近い形**から出す（箱から数える `colsFor` は、
 *   ここでは箱がまだ決まっていないので使えない）。
 * ★ 広さ（`room`）を渡すと、そこで頭打ちにする ── 海より大きい箱は置けない。
 *   入りきらないぶんは見切れて、送って見に行く（魚眼ならレンズが収める）。
 */
export const fitBoxFor = (
  preset: PresetId,
  count: number,
  card: Box,
  reserve: number,
  room?: Box | null,
): Box | undefined => {
  const n = Math.max(1, count);
  const cap = (b: Box): Box => ({
    w: room ? Math.min(b.w, Math.max(card.w, room.w)) : b.w,
    h: room ? Math.min(b.h, Math.max(card.h, room.h)) : b.h,
  });
  const pad = METRICS.PAD * 2;
  /** その向きに k 枚並べたときの広がり ── **刻み ×(k−1) ＋ 札 1 枚** */
  const spread = (k: number, by: number, side: number): number =>
    Math.max(side, (Math.max(1, k) - 1) * Math.max(1, by) + side);
  /**
   * ★ **箱の広がりは、並べ方の刻みとは別に測る。**
   *   魚眼は「詰めたときより一回り小さい箱」がちょうどいい ── 同じ大きさにすると
   *   全部そのまま入ってしまって、**レンズが何もしない**（格子魚眼を選んでも
   *   詰めた格子と同じ絵になる）。縮める比は coverflow の刻みと同じものを使う。
   */
  const tight =
    preset === 'coverflow' || preset === 'coverflowY' || preset === 'coverflowGrid'
      ? COVERFLOW_STEP_RATIO
      : 1;
  const sx = card.w * tight;
  const sy = card.h * tight;
  if (preset === 'column' || preset === 'coverflowY') {
    return cap({ w: card.w + pad, h: spread(n, sy, card.h) + reserve + pad });
  }
  if (preset === 'row' || preset === 'coverflow') {
    return cap({ w: spread(n, sx, card.w) + pad, h: card.h + reserve + pad });
  }
  if (preset === 'coverflowGrid') {
    /**
     * ★ **枚数では変わらない。** 何枚あっても「中心と上下左右が収まる」大きさ
     *   ── 増えたぶんは外側でチラ見えになる、がレンズの仕事（{@link LENS_GRID_BOX}）。
     */
    return cap({
      w: card.w * LENS_GRID_BOX + pad,
      h: card.h * LENS_GRID_BOX + reserve + pad,
    });
  }
  if (preset === 'grid') {
    const cols = Math.max(GRID_MIN_SIDE, Math.ceil(Math.sqrt(n)));
    const rows = Math.ceil(n / cols);
    return cap({
      w: spread(cols, sx, card.w) + pad,
      h: spread(rows, sy, card.h) + reserve + pad,
    });
  }
  if (preset === 'stackDepth') {
    return cap({
      w: card.w + LIST_DEPTH_INSET + pad,
      h: card.h + LIST_DEPTH_INSET + reserve + pad,
    });
  }
  return undefined;
};

/** 箱の大きさから並べ方を決める（海でも岸でも同じ式） */
export const pickPreset = (
  box: Box,
  count: number,
  itemWidth: number,
  itemHeight: number,
  headBox: Box | null,
): PresetId => {
  const band = needsBand(box, itemWidth, headBox);
  /**
   * ★ 取り分は「**口の底まで**」ちょうど 1 回ぶん。
   *
   *   札は「空けた量のすぐ下」から積む（View の軸の reserve。resolve.ts が当てる）ので、
   *   要るのは 口の底 − PAD だけ。前は中央ぞろえのまま空けようとして**口の高さの 2 倍**を
   *   取っており、**最後の札と縁のあいだに余白が残っているのに奥行きへ切り替わって**いた。
   */
  const room = box.h - METRICS.PAD * 2 - reserveFor(band ? headBox : null);
  // 詰める並びの要り高 ＝ 札の高さ × 枚数 ＋ 隙間 ×（枚数 − 1）
  const need = count * itemHeight + Math.max(0, count - 1) * LIST_GAP;
  if (need <= room) return 'column';
  /**
   * ★ **どちらの向きにも 2 枚以上とれるなら、折り返す。**
   *   1 列（1 行）に押し込むのは、押し込むしかないときだけ。
   */
  const card = { w: itemWidthFor('coverflowGrid', itemWidth), h: itemHeight };
  if (
    fitsAcross(box.w, card.w) >= GRID_MIN_SIDE &&
    fitsAcross(box.h, card.h) >= GRID_MIN_SIDE &&
    count > 1
  ) return 'coverflowGrid';
  /**
   * ★ **入りきらないときの行き先は、箱の形で決まる。**
   *   長いほうの向きへ送る ── 横長なら coverflow、縦長ならその縦版。
   */
  return box.w > box.h ? 'coverflow' : 'coverflowY';
};

/**
 * その並べ方のときの札の幅。
 *
 * > **札の大きさは、札の中身が決める。箱は決めない。**
 *
 * ★ 前は**箱から出していた**（`箱 − 余白`）。だから**窓を横に伸ばすと札まで太った**
 *   ── 実測：箱 420→523 で札 392→495。囲碁の札の中身が要るのは約 240px なので、
 *   ×の口が遠くに浮いていた。箱は札を**並べる場所**であって、札の形を決める場所ではない。
 * ★ 箱より札が広いときは**見切れさせる**。縮めない ── 岸で決めたのと同じで、
 *   「自分で狭めたのなら、小さく全部見せるより、前と同じ大きさで見切れるほうがいい」。
 *
 * 並べ方で変えるのは 1 つだけ:
 * - 透視：左右 {@link LIST_DEPTH_INSET} ずつ細く ── **必ず階段になる**（後ろの札の肩を出す）
 *
 * ★ ここで細くしてよいのは**幅を数で決めている札**だけ。札が自分で幅を決める（関数で答える）なら、
 *   細さは**狭い所を渡して札に決めさせる**（`ListSpace` の `cardRoom`）── 引き算は札の下限を
 *   知らないので、下限を割って字が折り返す（実測：囲碁の札が 7 文字 243 を割って 196 になった）。
 */
export const itemWidthFor = (preset: PresetId, itemWidth: number): number => {
  const w = Math.max(1, itemWidth);
  if (preset === 'stackDepth') return Math.max(1, w - LIST_DEPTH_INSET * 2);
  return w;
};

/**
 * その並べ方のときの「等間隔」の刻み。決めるのは魚眼の 3 つだけ
 * （ほかは詰める並びなので、間隔は札の大きさと隙間から決まる）。
 *
 * ★ **送る向きの辺で測る。** 横へ送るなら札の幅、上下へ送るなら札の高さ
 *   ── どちらも「札より少し狭い」が欲しいことなので、比は同じ。
 *
 * ★ **折り返す魚眼だけは、刻み ＝ 札そのもの（隙間なく敷き詰まる）。**
 *
 *   魚眼は本来「**大きさ自体が歪む**」もので、並べ方に直すと
 *   「大きさ ＋ 隙間」の 2 つで言うことになる ── そこで隙間まで動かすと、
 *   歪みではなく**階段**に見える。横・縦の coverflow は
 *   「肩を出して重ねる」のが言いたいこと（写真を繰る絵）なので札より狭い刻みでよいが、
 *   格子でそれをやると縦にも横にも食い違って、格子に見えない。
 *   刻みを札にすると、**詰める格子とまったく同じ配置のまま、大きさだけがレンズで歪む**
 *   ── 画（レンズ）は連続なので、隣り合う札の像もぴたりと隣り合う（隙間も重なりも出ない）。
 */
export const stepFor = (
  preset: PresetId,
  card: { readonly w: number; readonly h: number },
): { readonly x?: number; readonly y?: number } | undefined => {
  const x = Math.round(card.w * COVERFLOW_STEP_RATIO);
  const y = Math.round(card.h * COVERFLOW_STEP_RATIO);
  if (preset === 'coverflow') return { x };
  if (preset === 'coverflowY') return { y };
  if (preset === 'coverflowGrid') return { x: card.w + LENS_GRID_GAP, y: card.h + LENS_GRID_GAP };
  return undefined;
};
