"use client";
/**
 * **この OS が知っているドメインの型。**
 *
 * 世界線は内容アドレスで記録するので、記録された姿を読み戻すには
 * 「この型文字列は何のオブジェクトか」を引ける一覧が要る（`DomainRegistryProvider` → CAS）。
 *
 * ★ **置き場所は画面ではなく、ここ 1 つ。** 海を出す画面は 2 つある（いまの海と、
 *   レイヤー時代の海）ので、画面ごとに書き写すと**片方にだけ型が足りない**ことになる
 *   ── 足りないほうは読み戻せずに落ちる。
 */
import type { DomainRegistry } from "@bublys-org/domain-registry";
import { BUBBLE_ARRANGEMENT_DOMAIN } from "@bublys-org/bubbles-ui";
import { SEA_ARRANGEMENT_DOMAIN } from "@bublys-org/bubble-space-shell";
import { MEMO_DOMAIN } from "@bublys-org/memo-libs";
import { IGO_GAME_DOMAIN } from "./igo-game/domain/IgoGameDomain";

/**
 * ★ 型を書いておく。書かないと、推論された型が lib の中のファイルを名指ししてしまい
 *   （`TS2742`）、**画面から出した瞬間に型検査が通らなくなる**。
 */
export const APP_DOMAIN_REGISTRY: DomainRegistry = {
  ...BUBBLE_ARRANGEMENT_DOMAIN,
  // 海の並びの移り変わり（`useSeaWorldLine` が記録する型）
  ...SEA_ARRANGEMENT_DOMAIN,
  ...MEMO_DOMAIN,
  ...IGO_GAME_DOMAIN,
};
