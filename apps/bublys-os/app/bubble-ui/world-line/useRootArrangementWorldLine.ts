"use client";
import { useBrowserRootArrangementWorldLine } from "@bublys-org/bubbles-ui";
import { rootBrowserSnapshotCodec } from "./snapshot-url";

/**
 * bublys-os 用の root universe ↔ ブラウザ URL バインド。
 *
 * 中身は lib 提供の {@link useBrowserRootArrangementWorldLine} に
 * `rootBrowserSnapshotCodec`（base = "universe"）を注入しただけのアプリ規約。
 */
export const useRootArrangementWorldLine = () =>
  useBrowserRootArrangementWorldLine(rootBrowserSnapshotCodec);
