"use client";
import { useEffect } from "react";

// ホイール操作を開始したバブルが無操作でこの時間(ms)続いたらロックを解除する。
const LOCK_IDLE_MS = 300;

type WheelDeltaHandler = (deltaY: number) => void;

let lockedHandler: WheelDeltaHandler | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let listenerRefCount = 0;

const resetIdleTimer = () => {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    lockedHandler = null;
    idleTimer = null;
  }, LOCK_IDLE_MS);
};

/**
 * ヘッダー上でホイール操作を開始したバブルに、無操作 {@link LOCK_IDLE_MS} ms の
 * 間ホイールイベントを固定して送り続ける。
 *
 * レイヤー移動でバブルが拡大縮小すると、ヘッダーがカーソル直下から動いてしまい
 * 続けてホイールを回すと違う要素に当たってしまう。ロック中はカーソルがヘッダーの
 * 真上から外れていても同じバブルへ操作を送り続けることで、この不便さを解消する。
 */
const onWindowWheel = (e: WheelEvent) => {
  if (!lockedHandler) return;
  e.preventDefault();
  e.stopPropagation();
  lockedHandler(e.deltaY);
  resetIdleTimer();
};

export function acquireWheelLayerLock(handler: WheelDeltaHandler) {
  lockedHandler = handler;
  resetIdleTimer();
}

/**
 * ロック中継用の window wheel リスナーを、実体は1個だけ張る（複数バブルの
 * useWheelLayerNavigation から呼ばれてもref countで多重登録を防ぐ）。
 */
export function useWheelLayerLockListener() {
  useEffect(() => {
    listenerRefCount += 1;
    if (listenerRefCount === 1) {
      window.addEventListener("wheel", onWindowWheel, { passive: false });
    }
    return () => {
      listenerRefCount -= 1;
      if (listenerRefCount === 0) {
        window.removeEventListener("wheel", onWindowWheel);
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = null;
        lockedHandler = null;
      }
    };
  }, []);
}
