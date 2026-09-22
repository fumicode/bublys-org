import type { ReactNode } from "react";
import { getBubly } from "@bublys-org/bubbles-ui";

/**
 * url をどう見せるか（ラベル・アイコン）。
 * ランチャーの entry は url しか持たないので、描くときにここで解決する。
 */
export type LaunchTarget = {
  url: string;
  label: string;
  icon?: ReactNode;
};

const registry = new Map<string, LaunchTarget>();

/** OS 側が「この url はこう見せる」を登録する（静的なバブリ・特別なバブル用） */
export const registerLaunchTargets = (targets: LaunchTarget[]): void => {
  for (const t of targets) registry.set(t.url, t);
};

export const unregisterLaunchTarget = (url: string): void => {
  registry.delete(url);
};

/** 登録済みの url 一覧（ランチャーに何を足せるか、を出すのに使う） */
export const getRegisteredLaunchTargets = (): LaunchTarget[] => [...registry.values()];

/**
 * url → 見せ方。
 * 1. 登録表にあればそれ
 * 2. `<name>-bubly` で動的ロードされたバブリならその label / icon
 * 3. どちらにも無ければ url をそのまま
 */
export const resolveLaunchTarget = (url: string): LaunchTarget => {
  const registered = registry.get(url);
  if (registered) return registered;

  const name = url.endsWith("-bubly") ? url.slice(0, -"-bubly".length) : undefined;
  const bubly = name ? getBubly(name) ?? getBubly(url) : undefined;
  if (bubly) return { url, label: bubly.label ?? bubly.name, icon: bubly.icon };

  return { url, label: url };
};
