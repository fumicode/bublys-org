/**
 * 世界線3Dビューの型。**依存ゼロ**（three も React も domain も import しない）。
 *
 * 座標系（ユーザーの決定「世界線は一つの方向に伸びる／直交させない」を式にしたもの）:
 *   X = 時間   … 全世界線で共通の向き。入れ子の子も同じ +X へ流れる
 *   Y = 分岐   … 枝分かれを +Y へ払い出す
 *   Z = 入れ子 … -Z（奥）へ「段」を重ねる。段の間隔は一定
 *
 * ノードは YZ 平面に立つ「板（プレート）」。時間軸に直交する断面＝フィルムのコマ。
 * 板の中にはその時点の**世界の全体状態**が席順に並び、変わったものだけが厚みを持つ。
 */

export type Vec3 = readonly [x: number, y: number, z: number];

/** 席（スロット）。全ノード・全スコープで同じ key は同じ席に居続ける */
export type Slot = { readonly col: number; readonly row: number };

/** そのノードでのセルの状態 */
export type CellStatus =
  /** その時点の世界に居る */
  | 'present'
  /** 削除マーカー（墓標として出す） */
  | 'tombstone';

export type Cell3D = {
  /** `${type}:${id}` */
  readonly key: string;
  readonly type: string;
  readonly id: string;
  readonly hash: string;
  readonly slot: Slot;
  readonly status: CellStatus;
  /**
   * このノードで**値が変わった**か。
   *
   * `node.changedRefs` に入っているか、ではない。grow は渡された参照をそのまま焼くので、
   * 値が変わっていない参照も changedRefs に入りうる（既存テスト「編集で値が変わらない型は、
   * 起点と次のノードで同じ参照のまま」がその状況）。親ノードとハッシュを比べて決める。
   */
  readonly changed: boolean;
  /** 参照としては changedRefs に入っていたか（上とのズレを数えるため） */
  readonly inChangedRefs: boolean;
  /** このオブジェクトが自分の世界線を持つなら、そのスコープID */
  readonly nestedScopeId: string | null;
};

export type Plate3D = {
  readonly scopeId: string;
  readonly nodeId: string;
  /** 板の中心 */
  readonly origin: Vec3;
  /** Y方向の高さ / Z方向の奥行き */
  readonly extentY: number;
  readonly extentZ: number;
  /** そのスコープ内での世代（＝X の目盛り） */
  readonly depth: number;
  readonly isApex: boolean;
  readonly isRoot: boolean;
  readonly label?: string;
  readonly intentLabel?: string;
  readonly timestamp: number;
  readonly cells: readonly Cell3D[];
};

export type Edge3D = {
  readonly from: Vec3;
  readonly to: Vec3;
  readonly scopeId: string;
  /** time = 同じ枝の親子 / branch = 枝分かれ */
  readonly kind: 'time' | 'branch';
};

/**
 * 入れ子のつながり（親セル → 子スコープの起点）。
 *
 * kind が意味の違いを持つ。**連動しないものを連動するように描いたら嘘になる**ので分ける:
 *   - 'linked'  … 親の状態に子の現在地が入っている（universe のアドレス連動）。親を戻すと子も戻る
 *   - 'nominal' … scopeId が `型:id` で揃っているだけ（hotel の Schedule:x）。親を戻しても子は動かない
 */
export type Nest3D = {
  readonly from: Vec3;
  readonly to: Vec3;
  readonly parentScopeId: string;
  readonly childScopeId: string;
  readonly kind: 'linked' | 'nominal';
};

/** 図に出せなかったもの。黙って消さずに必ず申告する */
export type Layout3DDiagnostics = {
  /** graphs にあるのに図に出ていないスコープ */
  readonly orphanScopeIds: readonly string[];
  /** ノードが1つも無いスコープ */
  readonly emptyScopeIds: readonly string[];
  /** 親を辿れないノード（壊れたグラフ） */
  readonly orphanNodeIds: readonly string[];
  /** 親より古い timestamp を持つノード */
  readonly clockAnomalyNodeIds: readonly string[];
  /** changedRefs に入っていたが値は変わっていなかった参照の数 */
  readonly unprunedChangedCount: number;
  /** 墓標として出している削除済みの数（2Dインスペクタの件数との差） */
  readonly tombstoneCount: number;
  /** 板が重なっている等、成立していない不変条件 */
  readonly violations: readonly string[];
};

export type Layout3D = {
  readonly plates: readonly Plate3D[];
  readonly edges: readonly Edge3D[];
  readonly nests: readonly Nest3D[];
  readonly bounds: { readonly min: Vec3; readonly max: Vec3 };
  /** 席の総数（板の格子の大きさ） */
  readonly grid: { readonly cols: number; readonly rows: number };
  readonly diagnostics: Layout3DDiagnostics;
};

/**
 * 板の上部のラベル帯の高さ（セル何個分か）。
 *
 * **板の絵（キャンバス）と 3D の格子を 1:1 にするために、両者がこの1つの値を共有する。**
 * 別々に持つと、絵のマスと当たり判定・厚みの箱がずれて「クリックしたものと違うものが出る」
 * ＝図が嘘をつく（実際に踏んだ）。
 */
export const HEADER_UNITS = 1.2;

export const DEFAULT_LAYOUT_3D_OPTIONS = {
  /** 時間方向のノード間隔 */
  xStep: 14,
  /** 板の厚み（X方向） */
  plateThickness: 0.6,
  /** 変わったセルが板から -X へ伸びる長さ */
  changedThickness: 2.4,
  /** セルの一辺 */
  cell: 1.0,
  /** セルの間隔 */
  cellPitch: 1.3,
  /** 板の格子の列数（Z方向）。行数は席数から決まる */
  cols: 8,
  /** 分岐レーンの間隔（Y）。板の高さより必ず大きくする */
  lanePitchY: 0,
  /** 入れ子の段の間隔（Z）。板の奥行きより必ず大きくする */
  nestPitchZ: 0,
  /** 入れ子をどこまで潜るか（循環と爆発の保険） */
  maxNestDepth: 4,
} as const;

export type Layout3DOptions = {
  -readonly [K in keyof typeof DEFAULT_LAYOUT_3D_OPTIONS]: number;
};
