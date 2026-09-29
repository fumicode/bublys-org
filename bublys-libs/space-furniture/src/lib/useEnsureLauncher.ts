"use client";
/**
 * ルール: **その空間の標準の呼び出しは、ランチャーに必ず 1 つずつ居る。**
 *
 * ★ **何が標準かは空間が決める**（引数で受け取る）。前は OS の呼び出し一覧を
 *   直に読んでいたので、この仕掛けごと別の空間へ持って行けなかった。
 *   ルール自体は空間によらないので、一覧だけ外から渡す形にした。
 */
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { Launcher } from "@bublys-org/launcher-model";
import { selectLauncherPlain, setLauncher } from "@bublys-org/launcher-libs";

export type EnsureLauncherOptions = {
  /** ランチャーの ID（url は `launchers/<id>`） */
  launcherId: string;
  /** その空間の標準の呼び出し（この順に並べる） */
  urls: readonly string[];
  /** 行き先が変わった呼び出し（古い url → 今の url）。足す前に差し替える */
  retired?: Readonly<Record<string, string>>;
};

/**
 * - 集約が無ければ、標準の呼び出しで作る
 * - 行き先が変わった呼び出しは差し替える（足す前に。でないと古いのと新しいのが並ぶ）
 * - 有っても足りないものがあれば足す（あとから増えた呼び出しが出てこないので）
 * - **標準の並び順に揃える**（`ordered`）。足すだけだと、順番を変えても
 *   すでに使っている人は古い並びのままで、新しいものが末尾に付くだけになる。
 *   標準に無いもの（読み込んだバブリ）は触らない
 *
 * **泡は作らない** ── 「どこに出すか」は海の側の仕事（定位置として渡す）。
 */
export const useEnsureLauncherEntity = ({
  launcherId,
  urls,
  retired,
}: EnsureLauncherOptions): void => {
  const dispatch = useAppDispatch();
  const plain = useAppSelector(selectLauncherPlain(launcherId));
  useEffect(() => {
    if (!plain) {
      dispatch(setLauncher(Launcher.create([...urls], launcherId).toPlain()));
      return;
    }
    const launcher = Launcher.fromPlain(plain);
    const moved = Object.entries(retired ?? {}).reduce((l, [from, to]) => l.rename(from, to), launcher);
    const missing = urls.filter((url) => !moved.urls.includes(url));
    const next = missing.reduce((l, url) => l.add(url), moved).ordered([...urls]);
    if (next === launcher) return;
    dispatch(setLauncher(next.toPlain()));
  }, [dispatch, plain, launcherId, urls, retired]);
};
