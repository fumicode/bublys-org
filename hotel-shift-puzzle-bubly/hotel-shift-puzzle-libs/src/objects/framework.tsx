'use client';

/**
 * オブジェクト記述子フレームワーク（プロトタイプ / 案A の薄い先取り）
 *
 * 1つのオブジェクト型の「固有の側面」（クラス・同一性・アイコン・デフォルト開きURL・
 * plain 変換）を1つの記述子にまとめ、登録を一元化する。
 *
 * 線引き:
 *   - 型に固有なもの（icon, url, getId, serialize） … 記述子に書く＝事前登録
 *   - 使う場所で変わるもの（openingPosition） … ObjectView の使用箇所で指定
 *
 * 全ドメインオブジェクトはアプリ全体の世界線スコープ（CAS）に載る（objects/repository.ts）。
 * ここでは型登録と Provider 生成だけを担う。
 */
import React from "react";
import {
  registerObjectType,
  registerObjectUrl,
  registerObjectIdentity,
  getObjectUrl,
} from "@bublys-org/bubbles-ui";
import {
  DomainRegistryProvider,
  defineDomainObjects,
  registerSchema,
  type SchemaShape,
} from "@bublys-org/domain-registry";

/** plain ↔ インスタンス変換 codec（保存・世界線記録に使う） */
export type ObjectSerialize<T> = {
  toJSON: (obj: T) => unknown;
  fromJSON: (json: unknown) => T;
};

/**
 * その型が世界線スコープに対してどう属するか。
 *
 * スコープのメンバーは3種類しかない。読み・保存・削除・誕生のすべてがこの1宣言で決まる:
 *
 *   - live     … **その世界で変化する**。編集するとその世界線にノードが増え、時間移動で戻る。
 *                自分のスコープを持つ集約も、親集約のスコープに相乗りするものもこれ。
 *                  Schedule:            (id) => `Schedule:${id}`
 *                  ConstraintSet: (id) => `Schedule:${id}`   … 親の世界線に相乗り
 *   - pinned   … **その世界が生まれた瞬間に焼き付けられ、以後動かない**。
 *                グローバル側の変更・削除は自動では波及しない（Staff）。
 *                どのスコープへ焼くかはメンバー側では言えないので、
 *                オーナー型の {@link ObjectDescriptor.scope} の pinTypes が決める。
 *   - external … スコープに属さず、**世界の中から読んでも常にグローバル**。
 *                実データ（予約状況）や確定記録（レポート）のように、時間移動しても
 *                変わってはいけないもの。
 *
 * 引数が obj ではなく id なのが要点。削除は `removeObject(type, id)` のように
 * オブジェクトを手に持たずに呼ばれるので、obj を要求すると削除だけが住所を
 * 解決できずアプリ全体スコープに落ちる（保存と削除で行き先が食い違う）。
 * 全 live 型で id はスコープの持ち主 ID に等しい（ConstraintSet.id は scheduleId）。
 */
export type Membership =
  | { kind: "live"; homeScope: (id: string) => string | undefined }
  | { kind: "pinned" }
  | { kind: "external" };

/** 省略時の所属。世界に属さない＝常にグローバルから読む。 */
const DEFAULT_MEMBERSHIP: Membership = { kind: "external" };

/** そのスコープのオーナー型が宣言する、スコープ自身の性質 */
export type ScopeSpec = {
  /**
   * この型のスコープが生まれるとき、グローバルから参照をコピーして焼き付ける型。
   * 「誰を連れて生まれるか」はスコープのオーナーだけが言える。
   */
  pinTypes?: string[];
};

/**
 * オブジェクト型の記述子。型に「固有」の側面だけをここで表現する。
 * 展開位置（openingPosition）は型ではなく使う場所で決まるため、ここには持たせない。
 */
export type ObjectDescriptor<T = unknown> = {
  /** ドメインクラス（instanceof 解決・CAS class） */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  class: new (...args: any[]) => T;
  /** オブジェクトから id を取り出す（同一性） */
  getId: (obj: T) => string;
  /** ObjectView・メニューのアイコン */
  icon?: React.ReactNode;
  /** ダブルクリックで開くデフォルトのバブルURL（id → url）。型に固有なので事前登録する */
  url?: (id: string) => string;
  /**
   * plain 変換 codec。省略時は state-object 規約（o.state ↔ new Class(plain)）。
   * 入れ子にインスタンスを持つ等で規約が使えない型だけ明示する（例: Schedule）。
   */
  serialize?: ObjectSerialize<T>;
  /**
   * この型が世界線スコープにどう属するか。省略時は external（世界に属さない）。
   * 詳しくは {@link Membership}。
   */
  membership?: Membership;
  /**
   * この型が**オーナーである**スコープの宣言（`Schedule:<id>` の Schedule 側に書く）。
   * メンバー側の membership が「私はどう読まれるか」、こちらが「誰を連れて生まれるか」。
   */
  scope?: ScopeSpec;
  /**
   * ドメインスキーマ（プロパティ定義）。バブリ横断で「型の中身」を伝えるための共通言語。
   * object-transformer などがドロップされた型を解釈してターゲット構造を再現できる。
   */
  shape?: SchemaShape;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ObjectRegistry = Record<string, ObjectDescriptor<any>>;

/** 型推論用のアイデンティティ関数（記述子をそのまま返す） */
export function defineObjects<R extends ObjectRegistry>(registry: R): R {
  return registry;
}

// 登録済みの記述子（書き込み層が getId/codec/localHistory を引くために保持）
let descriptorRegistry: ObjectRegistry = {};

/** 登録済みの記述子を取得する */
export function getDescriptor(type: string): ObjectDescriptor | undefined {
  return descriptorRegistry[type];
}

/** その型の所属（未登録・未宣言なら external） */
export function membershipOf(type: string): Membership {
  return descriptorRegistry[type]?.membership ?? DEFAULT_MEMBERSHIP;
}

/**
 * そのオブジェクトが「変化する世界」のスコープID。live 型だけが持つ。
 * pinned / external は undefined（＝自分から世界線に載りにいかない）。
 */
export function homeScopeOf(type: string, id: string): string | undefined {
  const membership = membershipOf(type);
  return membership.kind === "live" ? membership.homeScope(id) : undefined;
}

/** その型のスコープが生まれるとき焼き付ける型（オーナー型の scope.pinTypes） */
export function pinnedTypesOf(ownerType: string): string[] {
  return descriptorRegistry[ownerType]?.scope?.pinTypes ?? [];
}

/** live な型の一覧（誕生時に「持ち主一式」を集めるのに使う） */
export function liveTypes(): string[] {
  return Object.keys(descriptorRegistry).filter(
    (type) => membershipOf(type).kind === "live"
  );
}

/**
 * ObjectType（ドラッグ種別・アイコン）・同一性（class+getId）・デフォルト開きURLを
 * グローバルに登録する（副作用）。ObjectTypeRegistry はグローバル singleton なので Provider 不要。
 */
export function registerObjects(registry: ObjectRegistry): void {
  descriptorRegistry = registry;
  for (const [type, d] of Object.entries(registry)) {
    registerObjectType(type, d.icon);
    registerObjectIdentity(type, { class: d.class, getId: (obj) => d.getId(obj) });
    if (d.url) registerObjectUrl(type, d.url);
    if (d.shape) registerSchema(type, d.shape);
  }
}

/** 登録済みのデフォルト開きURLを解決する（コードから url を組み立てたいとき用） */
export function objectUrl(type: string, id: string): string {
  const url = getObjectUrl(type, id);
  if (!url) throw new Error(`objectUrl: type "${type}" に url が登録されていません`);
  return url;
}

/** 記述子から CAS 用の DomainRegistry を作る（全型・codec 省略時は state 規約） */
function toDomainRegistry(registry: ObjectRegistry) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: Record<string, any> = {};
  for (const [type, d] of Object.entries(registry)) {
    out[type] = {
      class: d.class,
      icon: d.icon,
      getId: d.getId,
      toJSON: d.serialize
        ? d.serialize.toJSON
        : (obj: unknown) => (obj as { state: unknown }).state,
      fromJSON: d.serialize
        ? d.serialize.fromJSON
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (json: unknown) => new (d.class as any)(json),
    };
  }
  return defineDomainObjects(out);
}

/**
 * バブリの全オブジェクトの codec をまとめた Provider を生成する。
 * 世界線スコープ（useCasScope）はこの Provider 配下で registry を引く。
 */
export function makeObjectsProvider(
  registry: ObjectRegistry
): React.FC<{ children: React.ReactNode }> {
  const domain = toDomainRegistry(registry);
  return function ObjectsProvider({ children }: { children: React.ReactNode }) {
    return (
      <DomainRegistryProvider registry={domain}>{children}</DomainRegistryProvider>
    );
  };
}
