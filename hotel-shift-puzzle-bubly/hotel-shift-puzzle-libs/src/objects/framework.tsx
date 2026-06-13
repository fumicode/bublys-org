'use client';

/**
 * オブジェクト記述子フレームワーク（プロトタイプ / 案A の薄い先取り）
 *
 * 1つのオブジェクト型の「固有の側面」（クラス・アイコン・デフォルト開きURL・
 * 世界線シリアライズ）を1つの記述子にまとめ、登録を一元化する。
 *
 * 線引き:
 *   - 型に固有なもの（icon, url, serialize） … 記述子に書く＝事前登録
 *   - 使う場所で変わるもの（openingPosition） … ObjectView の使用箇所で指定
 */
import React, { useEffect } from "react";
import {
  registerObjectType,
  registerObjectUrl,
  registerObjectIdentity,
  getObjectUrl,
} from "@bublys-org/bubbles-ui";
import { DomainRegistryProvider, defineDomainObjects } from "@bublys-org/domain-registry";
import { useCasScope } from "@bublys-org/world-line-graph";

/** 世界線/CAS シリアライズ設定（永続化）。getId は識別子なので記述子トップに置く */
export type ObjectSerialize<T> = {
  toJSON: (obj: T) => unknown;
  fromJSON: (json: unknown) => T;
};

/**
 * オブジェクト型の記述子。型に「固有」の側面だけをここで表現する。
 * 展開位置（openingPosition）は型ではなく使う場所で決まるため、ここには持たせず
 * ObjectView の使用箇所で指定する。
 */
export type ObjectDescriptor<T = unknown> = {
  /** ドメインクラス（instanceof 解決・CAS class） */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  class: new (...args: any[]) => T;
  /** オブジェクトから id を取り出す（同一性）。ObjectView へ object を渡したときの解決に使う */
  getId: (obj: T) => string;
  /** ObjectView・メニューのアイコン */
  icon?: React.ReactNode;
  /** ダブルクリックで開くデフォルトのバブルURL（id → url）。型に固有なので事前登録する */
  url?: (id: string) => string;
  /** 世界線/CAS シリアライズ設定。指定すると世界線記録の対象になる */
  serialize?: ObjectSerialize<T>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ObjectRegistry = Record<string, ObjectDescriptor<any>>;

/** 型推論用のアイデンティティ関数（記述子をそのまま返す） */
export function defineObjects<R extends ObjectRegistry>(registry: R): R {
  return registry;
}

/**
 * ObjectType（ドラッグ種別・アイコン）とデフォルト開きURLをグローバルに登録する（副作用）。
 * ObjectTypeRegistry はグローバル singleton なので Provider 不要。
 * 展開位置は型に紐づけず、ObjectView の使用箇所で openingPosition を指定する。
 */
export function registerObjects(registry: ObjectRegistry): void {
  for (const [type, d] of Object.entries(registry)) {
    registerObjectType(type, d.icon);
    registerObjectIdentity(type, {
      class: d.class,
      getId: (obj) => d.getId(obj),
    });
    if (d.url) registerObjectUrl(type, d.url);
  }
}

/** 登録済みのデフォルト開きURLを解決する（コードから url を組み立てたいとき用） */
export function objectUrl(type: string, id: string): string {
  const url = getObjectUrl(type, id);
  if (!url) throw new Error(`objectUrl: type "${type}" に url が登録されていません`);
  return url;
}

/** serialize を持つ型（=世界線対象）だけを集めて DomainRegistry を作る */
function toDomainRegistry(registry: ObjectRegistry) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: Record<string, any> = {};
  for (const [type, d] of Object.entries(registry)) {
    if (!d.serialize) continue;
    out[type] = {
      class: d.class,
      icon: d.icon,
      fromJSON: d.serialize.fromJSON,
      toJSON: d.serialize.toJSON,
      getId: d.getId,
    };
  }
  return defineDomainObjects(out);
}

/**
 * バブリの世界線対象オブジェクトを1つにまとめた Provider を生成する。
 * 型を足しても記述子に1行追加するだけ。per-object の Provider は作らない。
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

/** 世界線スコープID（型ごとに namespace 化） */
export const objectScopeId = (type: string, id: string): string => `${type}:${id}`;

/**
 * 世界線スコープに載ったオブジェクトを「現在(apex)の状態 + 更新関数」として扱う hook。
 * scope/shell/apex/初期化/射影 の定型コードをここに畳み込む。
 *
 * - object: 現在（apex）のオブジェクト
 * - update(fn): 集約メソッドで更新（= 自動で世界線に記録）
 * - onApex: apex が変わるたびに現在状態を受け取る（slice への射影など。任意）
 *
 * slice は「現在の apex 状態の射影」に過ぎないので、onApex に1行書くだけでよい。
 */
export function useObjectShell<T>(
  type: string,
  id: string,
  initial: T,
  onApex?: (current: T) => void
): { object: T; update: (fn: (obj: T) => T) => void } {
  const scope = useCasScope(objectScopeId(type, id), {
    initialObjects: [{ type, object: initial }],
  });
  const shell = scope.getShell<T>(type, id);
  const object = shell?.object ?? initial;
  const apexId = scope.graph.getApex()?.id ?? null;

  useEffect(() => {
    if (shell && onApex) onApex(shell.object);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apexId]);

  return {
    object,
    update: (fn) => {
      shell?.update(fn);
    },
  };
}
