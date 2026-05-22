import { defineDomainObjects } from "@bublys-org/domain-registry";
import { BubbleViewState, BubbleViewStateJson } from "@bublys-org/bubbles-ui";

/** view オブジェクトの型名（CAS の StateRef.type） */
export const BUBBLE_VIEW_TYPE = "bubble-view";
/** 単一 view = 単一 id */
export const BUBBLE_VIEW_ID = "main";
/** bubble-ui の world-line scope */
export const BUBBLE_VIEW_SCOPE = "main";

/**
 * bubble-ui の表示状態(arrangement)を world-line-graph の1オブジェクトとして
 * 扱うための domain-registry 定義。
 */
export const BUBBLE_VIEW_DOMAIN = defineDomainObjects({
  [BUBBLE_VIEW_TYPE]: {
    class: BubbleViewState,
    fromJSON: (json: unknown) =>
      BubbleViewState.fromJSON(json as BubbleViewStateJson),
    toJSON: (o: BubbleViewState) => o.toJSON(),
    getId: () => BUBBLE_VIEW_ID,
  },
});
