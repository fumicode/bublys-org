/**
 * このバブリのスライスの注入（副作用）。
 *
 * `world-line/init.ts` と同じく、import するだけで store に注入される。
 */
import { injectSlice } from "@bublys-org/state-management";
import { worldFileSlice } from "./worldFileSlice.js";

injectSlice(worldFileSlice);
