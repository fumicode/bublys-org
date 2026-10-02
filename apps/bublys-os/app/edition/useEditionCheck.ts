"use client";
import { useCallback, useEffect, useState } from "react";
import type { Persistor } from "redux-persist/lib/types";
import { CURRENT_EDITION, EDITION_STORAGE_KEY, decideEdition } from "./edition";

/** 起動した瞬間に、この端末が憶えていたこと */
export type EditionSnapshot = { seen: string | null; hasSavedData: boolean };

/**
 * 「新しい版の見本で始める」を選んだ印。**次の起動で、store を作る前に** もう一度消す。
 * localStorage ではなく sessionStorage に置く ── localStorage は満杯のことがあり、
 * 小さな印さえ書けない（`exceeded the quota`）。
 */
const WIPE_ON_BOOT_KEY = "bublys.wipe-on-boot";

/** この端末が憶えていることを消し、今の版だけを憶える */
function wipeToCurrentEdition(): void {
  localStorage.clear();
  localStorage.setItem(EDITION_STORAGE_KEY, CURRENT_EDITION);
}

/**
 * **store を作る前に** 呼ぶ。
 *
 * 1. 前の起動で「新しい版の見本で始める」が選ばれていたら、ここでもう一度消す。
 *    消してから読み込み直すまでのあいだに、保存係が古い値を書き戻すことがある
 *    （止めても、列に積まれていたぶんは走る。#184）。store が無いここで消せば、
 *    書き戻したものも残らない。
 * 2. この端末が憶えていたことを読んでおく。store を作ると保存係が動き出し、
 *    初めて来た端末にも `persist:root` を書く ── あとから見ると「前から使っていた人」に
 *    見えてしまうので、書かれる前の姿を取っておく。
 *
 * サーバ（localStorage が無い）と、読み書きを止められている所では null。
 */
export function prepareEditionOnBoot(): EditionSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    if (sessionStorage.getItem(WIPE_ON_BOOT_KEY)) {
      sessionStorage.removeItem(WIPE_ON_BOOT_KEY);
      wipeToCurrentEdition();
    }
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
    return {
      seen: localStorage.getItem(EDITION_STORAGE_KEY),
      hasSavedData: keys.some((k) => k !== null && k !== EDITION_STORAGE_KEY),
    };
  } catch {
    return null;
  }
}

/**
 * 起動時に版を確かめる（規則は `edition.ts`）。
 *
 * ★ 分けるのは描いたあと（effect）── サーバには localStorage が無いので、
 *   最初の描画で分けるとハイドレーションが食い違う。決まるまでは `ready` が false。
 * ★ 訊いているあいだは中身を描かせない（呼ぶ側の約束）。描くと世界線や並べ方が
 *   書き込みを始め、消す前に古いものを積み増してしまう。
 * ★ 見本に入れ替えるときは、**今ある保存を書こうとしない**。前から使っていた端末は
 *   保存が満杯のことがあり、書き切ろうとすると `exceeded the quota` で落ちる。
 *   消して、読み込み直し、次の起動で store を作る前にもう一度消す（`prepareEditionOnBoot`）。
 */
export function useEditionCheck(persistor: Persistor, snapshot: EditionSnapshot | null) {
  const [asking, setAsking] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // 読めなかった（読み書きを止められている）なら、訊いても消せないので、そのまま進む
    if (snapshot) {
      const decision = decideEdition(snapshot.seen, snapshot.hasSavedData);
      if (decision === "ask") {
        setAsking(true);
        return;
      }
      if (decision === "fresh") {
        try {
          localStorage.setItem(EDITION_STORAGE_KEY, CURRENT_EDITION);
        } catch {
          // 憶えられなくても進める
        }
      }
    }
    setReady(true);
  }, [snapshot]);

  const keep = useCallback(() => {
    try {
      localStorage.setItem(EDITION_STORAGE_KEY, CURRENT_EDITION);
    } catch {
      // 満杯などで憶えられなくても、今回は進める（次に来たときまた訊く）
    }
    setAsking(false);
    setReady(true);
  }, []);

  const reset = useCallback(() => {
    setBusy(true);
    persistor.pause();
    try {
      sessionStorage.clear();
      sessionStorage.setItem(WIPE_ON_BOOT_KEY, "1");
      wipeToCurrentEdition();
    } catch {
      // 消せない所では、読み込み直すだけになる
    }
    window.location.reload();
  }, [persistor]);

  return { ready, asking, busy, keep, reset };
}
