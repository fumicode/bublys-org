/**
 * **行の中から印を拾う。**
 *
 * > 言葉の意味は取りにいかない。**人がメモに残す印**だけを見る。
 *
 * ★ 散文を理解しようとしないのは、外したときに**理由が言えない**から。
 *   印なら「`5/17` と書いてあったので日付と読みました」と言える。言えれば直せる。
 * ★ 拾えなかったものは**拾えなかったままにする**。それらしく埋めると、
 *   書いた人が言っていないことを画面が言い出す。
 * ★ ここは純粋な関数だけ。React も Redux も知らない。
 */
import { about, between, exact, type Approx } from "./Approx.js";

// ========== 日付 ==========

/** 月と日。年は書かれないのが普通なので持たない */
export type FoundDate = {
  readonly month?: number;
  readonly day: number;
  /** 「初日」「2日目」のような数え方だったか（その場合 `day` は何日目か） */
  readonly nth?: number;
  readonly raw: string;
};

const NTH_WORDS: Record<string, number> = {
  初日: 1, "1日目": 1, "２日目": 2, "2日目": 2, "3日目": 3, "４日目": 4, "4日目": 4,
  最終日: -1,
};

/**
 * 日付を拾う。`5/17` `5月17日` `17日` `初日` `2日目`。
 * 何日目かの数え方は `nth` に入れる ── 実際の日付は旅程の側が知っている。
 */
export const findDate = (text: string): FoundDate | undefined => {
  for (const [word, nth] of Object.entries(NTH_WORDS)) {
    if (text.includes(word)) return { day: 0, nth, raw: word };
  }
  const slash = /(\d{1,2})\s*[/／]\s*(\d{1,2})/.exec(text);
  if (slash) return { month: Number(slash[1]), day: Number(slash[2]), raw: slash[0] };
  const kanji = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/.exec(text);
  if (kanji) return { month: Number(kanji[1]), day: Number(kanji[2]), raw: kanji[0] };
  const dayOnly = /(?<![\d:：])(\d{1,2})\s*日(?!間|目)/.exec(text);
  if (dayOnly) return { day: Number(dayOnly[1]), raw: dayOnly[0] };
  return undefined;
};

// ========== 時刻 ==========

/**
 * ざっくりした時刻の言い方。
 *
 * ★ 幅で持つ（`朝` は 1 点ではない）。**幅のまま持てば「まだ決めていない」が残る。**
 */
const VAGUE_TIMES: ReadonlyArray<readonly [string, number, number]> = [
  ["早朝", 5 * 60, 7 * 60],
  ["朝", 7 * 60, 9 * 60],
  ["午前中", 9 * 60, 12 * 60],
  ["午前", 9 * 60, 12 * 60],
  ["昼過ぎ", 13 * 60, 14 * 60],
  ["昼", 12 * 60, 13 * 60],
  ["午後", 13 * 60, 17 * 60],
  ["夕方", 16 * 60, 18 * 60],
  ["夜", 18 * 60, 21 * 60],
];

/**
 * **時刻の言葉が、別の言葉に食い込むのを止める。**
 *
 * ★ 日本語には語の切れ目が無いので、「昼」は「昼食」の中にも居る。
 *   止めないと、**「昼食」が時刻として削られて「食」だけが残る**（実測で踏んだ）。
 *   後ろにこれらが続くときは、時刻ではなく言葉の一部として扱う。
 */
const NOT_A_TIME_AFTER = /^(?:食|飯|ごはん|ご飯|市|景|行|勤|間)/;

/** その日の 0 時からの分。幅つき */
export const findTime = (text: string): Approx | undefined => {
  const colon = /(?<!\d)(\d{1,2})\s*[:：]\s*(\d{2})/.exec(text);
  if (colon) {
    const v = Number(colon[1]) * 60 + Number(colon[2]);
    if (v < 24 * 60) return exact(v, colon[0]);
  }
  const half = /(?<!\d)(\d{1,2})\s*時\s*半/.exec(text);
  if (half) return exact(Number(half[1]) * 60 + 30, half[0]);
  const hourMin = /(?<!\d)(\d{1,2})\s*時\s*(\d{1,2})\s*分/.exec(text);
  if (hourMin) return exact(Number(hourMin[1]) * 60 + Number(hourMin[2]), hourMin[0]);
  const hour = /(?<!\d)(\d{1,2})\s*時(?!間)/.exec(text);
  if (hour) return exact(Number(hour[1]) * 60, hour[0]);
  for (const [word, lo, hi] of VAGUE_TIMES) {
    const at = text.indexOf(word);
    if (at < 0) continue;
    if (NOT_A_TIME_AFTER.test(text.slice(at + word.length))) continue;
    return between(lo, hi, word);
  }
  return undefined;
};

// ========== 長さ（滞在・所要） ==========

/** 分で返す。`30分` `1時間` `1時間半` `2〜3時間` `半日` */
export const findDuration = (text: string): Approx | undefined => {
  const range = /(?<!\d)(\d+(?:\.\d+)?)\s*[〜~ー\-–]\s*(\d+(?:\.\d+)?)\s*時間/.exec(text);
  if (range) return between(Number(range[1]) * 60, Number(range[2]) * 60, range[0]);
  const rangeMin = /(?<!\d)(\d+)\s*[〜~ー\-–]\s*(\d+)\s*分/.exec(text);
  if (rangeMin) return between(Number(rangeMin[1]), Number(rangeMin[2]), rangeMin[0]);
  const half = /(?<!\d)(\d+)\s*時間\s*半/.exec(text);
  if (half) return exact(Number(half[1]) * 60 + 30, half[0]);
  const hourMin = /(?<!\d)(\d+)\s*時間\s*(\d+)\s*分/.exec(text);
  if (hourMin) return exact(Number(hourMin[1]) * 60 + Number(hourMin[2]), hourMin[0]);
  const hour = /(?<!\d)(\d+(?:\.\d+)?)\s*時間/.exec(text);
  if (hour) return withAbout(text, exact(Math.round(Number(hour[1]) * 60), hour[0]));
  const min = /(?<!\d)(\d+)\s*分(?!の)/.exec(text);
  if (min) return withAbout(text, exact(Number(min[1]), min[0]));
  if (text.includes("半日")) return between(3 * 60, 4 * 60, "半日");
  if (text.includes("終日") || text.includes("1日中")) return between(6 * 60, 8 * 60, "終日");
  return undefined;
};

// ========== 金額 ==========

/**
 * 円で返す。`¥1,500` `1500円` `1.5万` `3千` `1500〜2000円` `3万くらい`
 *
 * ★ **お金の印（`¥` `円` `万` `千`）が無ければ金額と読まない。**
 *   印を要らなくしていたころ、「2〜3時間」の「2〜3」を金額として拾っていた
 *   ── 幅のある数は金額とは限らない。
 */
export const findMoney = (text: string): Approx | undefined => {
  /** 幅のある金額。どこかに必ずお金の印が要る */
  const RANGES = [
    // 1500〜2000円 ／ 2〜3万
    /([\d,.]+)\s*(?:万|千)?\s*[〜~ー\-–]\s*([\d,.]+\s*(?:万|千|円))/,
    // ¥1,500〜2,000
    /([¥￥]\s*[\d,.]+)\s*[〜~ー\-–]\s*([¥￥]?\s*[\d,.]+)/,
  ];
  for (const re of RANGES) {
    const range = re.exec(text);
    if (!range) continue;
    /** 後ろに付いている単位は、前の数にも効く（`2〜3万` の `2` は 2 万） */
    const unit = /万|千/.exec(range[2])?.[0] ?? "";
    const lo = yenOf(range[1] + unit);
    const hi = yenOf(range[2]);
    if (lo !== undefined && hi !== undefined) return between(lo, hi, range[0]);
  }
  /**
   * ★ **「円」が無くても、単位があれば金額**（`1.5万くらい` `3千`）。
   *   円を必須にしていたころ、いちばん人が書きそうな書き方だけが落ちていた。
   */
  const one = /[¥￥]\s*[\d,.]+\s*(?:万|千)?|[\d,.]+\s*(?:万|千)\s*円?|[\d,.]+\s*円/.exec(text);
  if (one) {
    const v = yenOf(one[0]);
    if (v !== undefined) return withAbout(text, exact(v, one[0]));
  }
  return undefined;
};

const yenOf = (s: string): number | undefined => {
  const cleaned = s.replace(/[¥￥円,\s]/g, "");
  const m = /^([\d.]+)(万|千)?$/.exec(cleaned);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return undefined;
  if (m[2] === "万") return Math.round(n * 10000);
  if (m[2] === "千") return Math.round(n * 1000);
  return Math.round(n);
};

/**
 * 「くらい」の言い方。曖昧の印であり、題名からは外すもの。
 *
 * ★ **「約」は数の直前のときだけ**（`約3時間`）。ただの `約` にすると
 *   **「要予約」の「約」**を拾って、題名が `そば屋 要予` になり、
 *   拾った印が `¥0 約` になる（実測で踏んだ）。
 *   後ろに付く言い方（くらい・ほど）は、数の後ろに来るので取り違えない。
 */
export const ABOUT_WORDS = /くらい|ぐらい|ほど|程度|前後|約(?=[\d¥￥])/;

/**
 * 「くらい」が近くにあれば、曖昧にする。
 *
 * ★ **書かれたままは数のところだけ**にしておく。「くらい」を足すと、
 *   前に付く言い方（`約30分`）で並び順が合わず、題名から取り除けない。
 *   取り除くのは読み解き側がまとめてやる（`readNote` の `ABOUT_WORDS`）。
 */
const withAbout = (text: string, a: Approx): Approx =>
  ABOUT_WORDS.test(text) ? about(a.min, a.raw) : a;

// ========== 移動手段 ==========

export type Transport =
  | "walk" | "train" | "bus" | "car" | "taxi" | "boat" | "ropeway" | "plane" | "bike";

const TRANSPORT_WORDS: ReadonlyArray<readonly [RegExp, Transport]> = [
  [/徒歩|歩き|歩いて/, "walk"],
  [/ロマンスカー|新幹線|電車|列車|登山鉄道|ケーブルカー|JR|私鉄/, "train"],
  [/ロープウェイ|ロープウエイ/, "ropeway"],
  [/バス/, "bus"],
  [/タクシー/, "taxi"],
  [/遊覧船|海賊船|フェリー|船/, "boat"],
  [/レンタカー|車で|マイカー|自家用車/, "car"],
  [/飛行機|空路/, "plane"],
  [/自転車|レンタサイクル/, "bike"],
];

export const findTransport = (text: string): { transport: Transport; raw: string } | undefined => {
  for (const [re, transport] of TRANSPORT_WORDS) {
    const m = re.exec(text);
    if (m) return { transport, raw: m[0] };
  }
  return undefined;
};

// ========== 熱量（どれくらい決まっているか） ==========

/**
 * **決まり具合。**
 *
 * ★ これが要るのは、旅程が「入れる／見送る」を決める道具でもあるから。
 *   全部を同じ重さで入れると、溢れたときにどれを外せばよいか誰にも言えない。
 */
export type Commitment = "decided" | "want" | "maybe";

export const findCommitment = (text: string): { commitment: Commitment; raw: string } | undefined => {
  const decided = /予約済|確定|済み|チケット購入|押さえた|確保/.exec(text);
  if (decided) return { commitment: "decided", raw: decided[0] };
  const want = /絶対|必ず|マスト|外せない|行きたい|やりたい|食べたい/.exec(text);
  if (want) return { commitment: "want", raw: want[0] };
  const maybe = /できれば|余裕があれば|かも|候補|気になる|迷い|検討|要検討|\?|？/.exec(text);
  if (maybe) return { commitment: "maybe", raw: maybe[0] };
  return undefined;
};

// ========== 人 ==========

/** `2名` `大人2` `3人` `田中さんと` */
export const findPeople = (text: string): { count?: number; names: string[]; raw: string } | undefined => {
  const count = /(?<!\d)(\d{1,2})\s*(?:名|人)(?!気|口)/.exec(text);
  const names = [...text.matchAll(/([ぁ-んァ-ヴー一-龠A-Za-z]{1,8})(?:さん|くん|ちゃん)と/g)].map((m) => m[1]);
  if (!count && names.length === 0) return undefined;
  return {
    count: count ? Number(count[1]) : undefined,
    names,
    raw: count?.[0] ?? names.join("・"),
  };
};

// ========== 区間（A から B へ） ==========

export type FoundLeg = { readonly from: string; readonly to: string; readonly raw: string };

/** `新宿→箱根湯本` `新宿から箱根湯本まで` */
export const findLeg = (text: string): FoundLeg | undefined => {
  const arrow = /([^\s→\->]+?)\s*(?:→|->|=>)\s*([^\s→\->]+)/.exec(text);
  if (arrow) return { from: arrow[1].trim(), to: arrow[2].trim(), raw: arrow[0] };
  const kara = /([^\s]+?)から\s*([^\s]+?)まで/.exec(text);
  if (kara) return { from: kara[1].trim(), to: kara[2].trim(), raw: kara[0] };
  return undefined;
};

// ========== そのほかの印 ==========

/** 予約が要るか */
export const needsBooking = (text: string): boolean => /要予約|予約必要|要事前|要申込/.test(text);

/**
 * 営業時間の断り（`〜17時` `月休`）。
 *
 * ★ **「時間」は時刻ではない。** `(?!間)` が無かったころ、`2〜3時間` の `〜3時` を
 *   営業時間として拾っていた ── 滞在の長さが、店の閉まる時刻になっていた。
 */
export const findOpeningNote = (text: string): string | undefined => {
  const close = /[〜~]\s*\d{1,2}\s*時(?!間)|\d{1,2}\s*時(?!間)\s*まで|L\.?O\.?\s*\d{1,2}/.exec(text);
  if (close) return close[0];
  const holiday = /[月火水木金土日]\s*休|定休/.exec(text);
  if (holiday) return holiday[0];
  return undefined;
};

/** 「AかB」── どちらか一方（両方は入れない） */
export const findEither = (text: string): string[] | undefined => {
  const m = /([^\s、,]+)\s*(?:か|または|or|\/)\s*([^\s、,]+)/.exec(text);
  if (!m) return undefined;
  return [m[1], m[2]];
};
