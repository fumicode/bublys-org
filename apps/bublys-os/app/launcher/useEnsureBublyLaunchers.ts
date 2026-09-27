"use client";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import {
  getLoadedBublies,
  getBubly,
  toBublyLauncherUrl,
  useBubbleRoutes,
} from "@bublys-org/bubbles-ui";
import { Launcher } from "@bublys-org/launcher-model";
import { registerLaunchTargets, selectLauncherPlain, setLauncher } from "@bublys-org/launcher-libs";

/**
 * ルール: **ロードしたバブリは、自分の呼び出しを 1 つ持つ。**
 *
 * 単体で開いたときに脇の帯に並んでいたもの（`Bubly.menuItems`）が、OS の中では
 * その窓の岸に貼った呼び出し（`launchers/<name>`）になる。器は岸に貼るだけなので、
 * **中身を用意するのはこちら**。
 *
 * ★ 足りなければ足す、だけ。並べ替えも間引きもしない ── OS 標準の呼び出しと違って、
 *   ここは**人が並びを変えてよい**（OS の左の岸と同じ手ざわり、と決めた）ので、
 *   毎回こちらの言う順に戻すと、変えたそばから戻されることになる。
 * ★ 見せ方（名前・アイコン）も一緒に登録する。呼び出しが持っているのは url だけなので、
 *   登録しないと札が `ekikyo/kyuseis/五黄` のような url のまま出る。
 * ★ 気づく合図はルートの一覧（`useBubbleRoutes`）── バブリをロードすればルートが増える。
 */
export const useEnsureBublyLaunchers = () => {
  const dispatch = useAppDispatch();
  const routes = useBubbleRoutes();
  const launchers = useAppSelector((state) => state.launchers);

  useEffect(() => {
    for (const loaded of getLoadedBublies()) {
      const items = getBubly(loaded.name)?.menuItems;
      if (!items?.length) continue;

      registerLaunchTargets(items.map((i) => ({ url: typeof i.url === "function" ? i.url() : i.url, label: i.label, icon: i.icon })));

      const urls = items.map((i) => (typeof i.url === "function" ? i.url() : i.url));
      const id = loaded.name;
      const plain = selectLauncherPlain(id)({ launchers } as never);
      if (!plain) {
        dispatch(setLauncher(Launcher.create(urls, id).toPlain()));
        continue;
      }
      const launcher = Launcher.fromPlain(plain);
      const missing = urls.filter((url) => !launcher.urls.includes(url));
      if (missing.length === 0) continue;
      dispatch(setLauncher(missing.reduce((l, url) => l.add(url), launcher).toPlain()));
    }
  }, [dispatch, routes, launchers]);
};

/** 岸に貼る呼び出しの url（窓の器が `shoreUrls` で受け取るもの） */
export { toBublyLauncherUrl };
