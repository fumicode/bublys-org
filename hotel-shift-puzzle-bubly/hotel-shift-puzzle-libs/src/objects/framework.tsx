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
import { DomainRegistryProvider, defineDomainObjects } from "@bublys-org/domain-registry";

/** plain ↔ インスタンス変換 codec（保存・世界線記録に使う） */
export type ObjectSerialize<T> = {
  toJSON: (obj: T) => unknown;
  fromJSON: (json: unknown) => T;
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
   * このオブジェクトを個別単位（type:id）のローカル世界線でも監視するか。
   * true にすると、save 時にアプリ全体に加えてローカル世界線にも記録され、
   * 個別に巻き戻せる（例: Schedule）。
   */
  localHistory?: boolean;
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
