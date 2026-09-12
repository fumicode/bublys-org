/**
 * モデルの構造を表す図のデータ。**TypeScript のソースそのものから起こす**。
 *
 * 手で書いた宣言（記述子に relations を足す等）にしなかったのは、モデルを直したときに
 * 図だけが黙って古いまま残るから。ソースが唯一の出所なら、図は必ずモデルに追従する。
 * 追従を機械が保証するために、生成物が古くなったら落ちるテストを置いてある
 * （`extract/staleness.test.ts`）。
 *
 * 抽出は Node でしか走らない（TypeScript のコンパイラ API を使う）。
 * ★ ブラウザ側はここで定義した**データだけ**を読む。`extract/` をバレルから出さないこと。
 */

/** そのクラスがドメインの中でどういう単位か */
export type ClassKind =
  /** 集約の根。世界線に載り、id で参照される（記述子に登録されている型） */
  | 'aggregate'
  /** 集約の中の部品。単独では世界線に載らない */
  | 'part'
  /** 値オブジェクト。id を持たず、値が等しければ同じもの */
  | 'value';

/** フィールド1つ */
export type ModelField = {
  readonly name: string;
  /** TypeScript が解決した型の文字列。`WorkShiftState[]` や `Record<string, number>` など */
  readonly type: string;
  readonly optional: boolean;
};

/** クラスの振る舞い */
export type ModelMethod = {
  readonly name: string;
  readonly params: readonly string[];
  /** 戻り値の型 */
  readonly returns: string;
  /** `static` か（`of` / `fromPlain` のようなファクトリ） */
  readonly isStatic: boolean;
  /**
   * 自分自身の型を返すか。ドメインクラスは不変なので、**更新は自分を返すメソッド**になる。
   * 図で「このクラスをどう変えられるか」を読むための印
   */
  readonly returnsSelf: boolean;
};

/**
 * クラス同士のつながり。
 *
 * `contains` と `references` の違いが**集約の境界**そのもの。
 * 内包しているものは一緒に保存・巻き戻しされ、id で参照しているものは別の集約に属する。
 */
export type RelationKind =
  /** 値やインスタンスを直接持つ（集約の内側） */
  | 'contains'
  /** id で参照する（集約をまたぐ） */
  | 'references';

export type ModelRelation = {
  readonly from: string;
  readonly to: string;
  readonly kind: RelationKind;
  /** どのフィールドから来たか */
  readonly via: string;
  /** 複数持つか（配列・Record） */
  readonly many: boolean;
  /**
   * どうやって見つけたか。図が推測を断定として描かないための印。
   *  - 'type'      … フィールドの型にクラス名が出ている（確実）
   *  - 'id-naming' … `staffId: string` のような命名から推した（**推測**）
   */
  readonly foundBy: 'type' | 'id-naming';
};

export type ModelClass = {
  readonly name: string;
  /** モデルパッケージからの相対パス */
  readonly file: string;
  readonly kind: ClassKind;
  readonly fields: readonly ModelField[];
  /** getter の名前。state を包んで見せているだけのものが多いので、名前だけ持つ */
  readonly getters: readonly string[];
  readonly methods: readonly ModelMethod[];
  /** クラスの先頭に付いていた説明（jsdoc の最初の段落） */
  readonly doc?: string;
};

export type ModelGraph = {
  readonly classes: readonly ModelClass[];
  readonly relations: readonly ModelRelation[];
  /** 抽出の申告。図に出せなかったものを黙って消さない */
  readonly diagnostics: ModelGraphDiagnostics;
};

export type ModelGraphDiagnostics = {
  /** 抽出したソースのルート（リポジトリからの相対） */
  readonly sourceRoot: string;
  /** 読んだファイルの数 */
  readonly fileCount: number;
  /**
   * `state` を持たないクラス。state-object 規約から外れているのでフィールドが出せない。
   * 図では箱だけが出て中身が空になる
   */
  readonly classesWithoutState: readonly string[];
  /**
   * 型にクラス名は出ているが、そのクラスが見つからなかった参照。
   * モデルの外（他パッケージ）を指しているか、型が複雑すぎて解けなかったもの
   */
  readonly unresolvedTypes: readonly string[];
  /**
   * `〜Id` / `〜Ids` という名前なのに、**参照先を決められなかった**フィールド
   * （`Class.field` の形）。
   *
   * 推測で近い名前に寄せるより、決められなかったと言うほうが正しい。
   * ここに出ているぶん、図には**線が足りていない**。読む人にそれを知らせる。
   * 直すには、記述子の登録名とフィールド名を揃えるか、別名を足す。
   */
  readonly unresolvedIdFields: readonly string[];
};

/** 空の図。抽出に失敗したときでも、画面が「何も無い」と正しく言えるように */
export const EMPTY_MODEL_GRAPH: ModelGraph = {
  classes: [],
  relations: [],
  diagnostics: {
    sourceRoot: '',
    fileCount: 0,
    classesWithoutState: [],
    unresolvedTypes: [],
    unresolvedIdFields: [],
  },
};
