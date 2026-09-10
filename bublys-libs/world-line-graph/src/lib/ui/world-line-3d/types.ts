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

/**
 * そのノードで、そのオブジェクトに**何が起きたか**。
 *
 * 「いま何が居るか」ではなく「何が起きたか」を語るのが要点。
 * 世界線を見る人が知りたいのは出来事なので、状態ではなく動詞で持つ。
 */
export type CellAction =
  /** このノードで初めて現れた（作られた） */
  | 'created'
  /** 前からあって、このノードで値が変わった */
  | 'changed'
  /** このノードで消された。ここに墓標を置き、**これ以降は描かない** */
  | 'deleted'
  /** 前からあって、このノードでは何も起きていない */
  | 'unchanged';

export type Cell3D = {
  /** `${type}:${id}` */
  readonly key: string;
  readonly type: string;
  readonly id: string;
  readonly hash: string;
  readonly slot: Slot;
  readonly action: CellAction;
  /** 参照としては changedRefs に入っていたか（上とのズレを数えるため） */
  readonly inChangedRefs: boolean;
  /**
   * このオブジェクトが自分の世界線を持つなら、そのスコープID。
   * **畳んでいても ID は保つ**。消すと開き直す手がかりが図から無くなり、
   * 畳む操作が片道切符になる（実際にそうなっていた）。
   */
  readonly nestedScopeId: string | null;
  /** その入れ子がいま図に出ているか。false ＝ 畳んでいる（印は中抜きで描く） */
  readonly nestedShown: boolean;
};

export type Plate3D = {
  readonly scopeId: string;
  readonly nodeId: string;
  /** 板の中心 */
  readonly origin: Vec3;
  /** Y方向の高さ / Z方向の奥行き */
  readonly extentY: number;
  readonly extentZ: number;
  /** この板の席の数（世界ごとに違う）。絵と格子はこの値から導く */
  readonly cols: number;
  readonly rows: number;
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
 * 同じオブジェクト（同じ `type:id`）を時間方向につなぐ線。
 *
 * 席は全ノードで固定なので、この線は時間軸に平行なまっすぐな「レール」になる。
 * どのオブジェクトがいつからいつまで居たのか、どこで変わったのかが目で追える。
 */
export type IdentityLink3D = {
  readonly from: Vec3;
  readonly to: Vec3;
  readonly key: string;
  readonly scopeId: string;
  /** 線の先（子ノード側）で何が起きたか */
  readonly action: CellAction;
};

/**
 * 入れ子のつながり（親セル → 子スコープの起点）。
 *
 * kind が意味の違いを持つ。**連動しないものを連動するように描いたら嘘になる**ので分ける:
 *   - 'linked'  … 親の状態に子の現在地が入っている（universe のアドレス連動）。親を戻すと子も戻る
 *   - 'nominal' … scopeId が `型:id` で揃っているだけ（hotel の Schedule:x）。親を戻しても子は動かない
 */
export type Nest3D = {
  /** 背骨の線。面がエッジオンで消える向きでも、これは残る */
  readonly from: Vec3;
  readonly to: Vec3;
  /**
   * 漏斗の口＝親セルの位置に置いた小さな矩形。**Z（入れ子の段の方向）を法線に持つ**。
   *
   * 板の面（X法線）のまま口にすると、口も奥も同じ x 平面に乗るので、
   * 4枚の側面が1枚の平面に潰れて互いに重なる（＝面にならない）。
   * 入れ子は Z 方向に伸びるので、断面は Z 法線でなければならない。
   *
   * 回り順は (+X,+Y) → (-X,+Y) → (-X,-Y) → (+X,-Y)。
   * **口と奥で回り順を揃えること**。ずらすと側面がねじれて蝶ネクタイになる。
   */
  readonly mouth: readonly [Vec3, Vec3, Vec3, Vec3];
  /** 漏斗の奥＝子の世界の手前の面。mouth と同じ回り順・同じ法線 */
  readonly opening: readonly [Vec3, Vec3, Vec3, Vec3];
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
  /** 畳んでいて図に出していない入れ子スコープ（＝ユーザーが閉じたもの、とその子孫） */
  readonly hiddenScopeIds: readonly string[];
  /** 板が重なっている等、成立していない不変条件 */
  readonly violations: readonly string[];
};

export type Layout3D = {
  readonly plates: readonly Plate3D[];
  readonly edges: readonly Edge3D[];
  /** 同じオブジェクトを時間方向につなぐ線（同一性のレール） */
  readonly identities: readonly IdentityLink3D[];
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

/**
 * 板の左側の「型名を出す余白」の幅（セル何個分か）。
 *
 * ■ だけ並んでいても何のオブジェクトか分からない。席は型ごとに行が分かれるので、
 * 行の左に型名を書けば、全部のセルに文字を詰め込まずに済む。
 * HEADER_UNITS と同じく、板の絵と 3D の格子が共有する唯一の出所。
 */
export const GUTTER_UNITS = 3.4;

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
  /**
   * 「同時」とみなす時間の幅（ミリ秒）。
   *
   * 1つの操作は複数のスコープへ同時に書く（勤務表を1セル編集すると、その勤務表の
   * 世界線とアプリ全体スコープの両方にノードが増える）。それらは同じ X に並んでほしい。
   * ノードの timestamp は Date.now() のミリ秒なので、同じ操作の書き込みは数ミリ秒以内に収まる。
   */
  syncToleranceMs: 250,
  /**
   * 同じ時刻クラスタの中で、同じスコープに複数ノードができたときのずらし幅
   * （xStep に対する比）。アプリ全体スコープは1操作で複数ノード書くので必要。
   */
  subStep: 0.32,
} as const;

/**
 * X 軸の意味。
 *
 * - 'sync' … **実際の時刻**。同時に起きたことは同じ X に並ぶ。
 *   1操作でスコープごとに書き込む回数が違っても、世界線どうしがずれない。
 * - 'hops' … スコープ内の世代（親からのホップ数）。等間隔で読みやすいが、
 *   書き込み回数の多いスコープだけが右へ流れて、他の世界線と年表がずれる。
 */
export type TimeMode = 'sync' | 'hops';

export type Layout3DOptions = {
  -readonly [K in keyof typeof DEFAULT_LAYOUT_3D_OPTIONS]: number;
};
