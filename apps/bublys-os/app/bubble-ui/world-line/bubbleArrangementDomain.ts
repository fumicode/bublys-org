import { defineDomainObjects } from "@bublys-org/domain-registry";
import { BubbleArrangement, BubbleArrangementState } from "@bublys-org/bubbles-ui";

/** view オブジェクトの型名（CAS の StateRef.type） */
export const BUBBLE_ARRANGEMENT_TYPE = "bubble-arrangement";
/** 単一 universe = 単一 arrangement なので固定 id */
export const BUBBLE_ARRANGEMENT_ID = "main";

/**
 * bubble-ui の表示状態(arrangement)を world-line-graph の1オブジェクトとして
 * 扱うための domain-registry 定義。
 */
export const BUBBLE_ARRANGEMENT_DOMAIN = defineDomainObjects({
  [BUBBLE_ARRANGEMENT_TYPE]: {
    class: BubbleArrangement,
    fromJSON: (json: unknown) =>
      BubbleArrangement.fromJSON(json as BubbleArrangementState),
    toJSON: (o: BubbleArrangement) => o.toJSON(),
    getId: () => BUBBLE_ARRANGEMENT_ID,
  },
});
