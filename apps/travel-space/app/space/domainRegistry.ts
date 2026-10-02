"use client";
/**
 * **この空間が知っているドメインの型。**
 *
 * 世界線は内容アドレスで記録するので、記録された姿を読み戻すには
 * 「この型文字列は何のオブジェクトか」を引ける一覧が要る。
 * 足りないと、過去の節へ戻ろうとした所で落ちる。
 */
import type { DomainRegistry } from "@bublys-org/domain-registry";
import { BUBBLE_ARRANGEMENT_DOMAIN } from "@bublys-org/bubbles-ui";
import { SEA_ARRANGEMENT_DOMAIN } from "@bublys-org/bubble-space-shell";

/**
 * ★ 型を書いておく。書かないと、推論された型が lib の中のファイルを名指ししてしまい
 *   （`TS2742`）、画面から出した瞬間に型検査が通らなくなる。
 */
export const TRAVEL_DOMAIN_REGISTRY: DomainRegistry = {
  ...BUBBLE_ARRANGEMENT_DOMAIN,
  // 海の並びの移り変わり（`useSeaWorldLine` が記録する型）
  ...SEA_ARRANGEMENT_DOMAIN,
};
