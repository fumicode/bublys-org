// Module augmentation for state-management
// bubbleStateをRootStateに追加する
import type { BubbleStateSlice } from "./bubbles-slice.js";

declare module "@bublys-org/state-management" {
  interface LazyLoadedSlices {
    bubbleState: BubbleStateSlice;
  }
}
