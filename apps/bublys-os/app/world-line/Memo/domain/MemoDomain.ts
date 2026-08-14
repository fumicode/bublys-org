import { defineDomainObjects } from "@bublys-org/domain-registry";
import { Memo, RawMemo } from "./Memo";

/**
 * メモを world-line-graph 上の CAS shell として扱うための domain-registry 定義。
 *
 * 各 memo は固有の scope（scopeId = `memo:<memoId>`）を持ち、その中で 1 種類の
 * shell（type = "memo", id = memoId）を更新していく。useMemoWorldLine と
 * MEMO_SCOPE_PREFIX を併用すること。
 */

export const MEMO_TYPE = "memo";

export const MEMO_DOMAIN = defineDomainObjects({
  [MEMO_TYPE]: {
    class: Memo,
    fromJSON: (json: unknown) => Memo.fromJson(json as RawMemo),
    toJSON: (memo: Memo) => memo.toJson(),
    getId: (memo: Memo) => memo.id,
  },
});

/** memo の scopeId に使うプレフィックス。selectScopeIds("memo:") で memo 一覧を引ける。 */
export const MEMO_SCOPE_PREFIX = "memo:";
export const memoScopeId = (memoId: string) => `${MEMO_SCOPE_PREFIX}${memoId}`;
