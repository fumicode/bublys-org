"use client";
import { useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { Launcher } from "@bublys-org/launcher-model";
import { selectLauncherPlain, setLauncher } from "../slice/launcher-slice.js";

/**
 * ランチャー集約を取り出して、更新を保存する。
 * 「取る → 集約のメソッド → toPlain → set」の流れをここに閉じ込める。
 */
export const useLauncher = (launcherId: string) => {
  const dispatch = useAppDispatch();
  const plain = useAppSelector(selectLauncherPlain(launcherId));
  const launcher = useMemo(() => (plain ? Launcher.fromPlain(plain) : undefined), [plain]);

  const update = useCallback(
    (fn: (current: Launcher) => Launcher) => {
      if (!launcher) return;
      dispatch(setLauncher(fn(launcher).toPlain()));
    },
    [dispatch, launcher],
  );

  return { launcher, update };
};
