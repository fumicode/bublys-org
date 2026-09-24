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
export const colsFor = (preset: PresetId, box: Box, itemWidth: number): number | undefined => {
  if (preset !== 'grid' && preset !== 'coverflowGrid') return undefined;
  return Math.max(GRID_MIN_SIDE, fitsAcross(box.w, itemWidthFor(preset, itemWidth)));
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
 */
export const itemWidthFor = (preset: PresetId, itemWidth: number): number => {
  const w = Math.max(1, itemWidth);
  if (preset === 'stackDepth') return Math.max(1, w - LIST_DEPTH_INSET * 2);
  return w;
};

/**
 * その並べ方のときの「等間隔」の刻み。決めるのは coverflow とその縦版だけ
 * （ほかは詰める並びなので、間隔は札の大きさと隙間から決まる）。
 *
 * ★ **送る向きの辺で測る。** 横へ送るなら札の幅、上下へ送るなら札の高さ
 *   ── どちらも「札より少し狭い」が欲しいことなので、比は同じ。
 *   折り返す並べ方は両方の向きへ送るので、両方を返す。
 */
export const stepFor = (
  preset: PresetId,
  card: { readonly w: number; readonly h: number },
): { readonly x?: number; readonly y?: number } | undefined => {
  const x = Math.round(card.w * COVERFLOW_STEP_RATIO);
  const y = Math.round(card.h * COVERFLOW_STEP_RATIO);
  if (preset === 'coverflow') return { x };
  if (preset === 'coverflowY') return { y };
  if (preset === 'coverflowGrid') return { x, y };
  return undefined;
};
