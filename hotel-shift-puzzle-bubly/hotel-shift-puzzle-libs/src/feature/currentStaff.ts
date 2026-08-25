'use client';

/**
 * currentStaff — 「この端末を使っているのは誰か」を覚えておく。
 *
 * スタッフ本人がシフト希望を出す画面（#113）のための、ごく軽い「自分」の概念。
 * ログインではなく端末ごとの選択なので:
 *   - localStorage に持つ（端末に残り、他人には影響しない）
 *   - 世界線CAS（オブジェクトリポジトリ）には載せない。「誰が見ているか」は
 *     勤務表の履歴ではなく、時間移動しても変わってほしくないため
 *
 * 複数のバブルが同時に開いていても同じ値を見られるよう、モジュールに1つだけ値を持ち
 * useSyncExternalStore で購読する（別タブでの変更も storage イベントで反映する）。
 */
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "hotel-shift-puzzle:current-staff-id";

/** 購読者。値が変わったら再描画してもらう */
const listeners = new Set<() => void>();

/**
 * 現在値のキャッシュ。useSyncExternalStore は毎回同じ参照を返す必要があるので、
 * localStorage を直接読まずここを見る（undefined = まだ読んでいない）。
 */
let cached: string | null | undefined;

const readStorage = (): string | null => {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    // プライベートモード等で読めないことがある。その場合は「未設定」でよい
    return null;
  }
};

const notify = () => {
  for (const listener of listeners) listener();
};

const subscribe = (onStoreChange: () => void): (() => void) => {
  listeners.add(onStoreChange);
  // 別タブで変わったときも追随する
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== STORAGE_KEY) return;
    cached = readStorage();
    notify();
  };
  globalThis.addEventListener?.("storage", onStorage);
  return () => {
    listeners.delete(onStoreChange);
    globalThis.removeEventListener?.("storage", onStorage);
  };
};

const getSnapshot = (): string | null => {
  if (cached === undefined) cached = readStorage();
  return cached;
};

/** サーバ描画時は「まだ誰も選んでいない」。localStorage はクライアントにしか無い */
const getServerSnapshot = (): string | null => null;

/** 「自分」を選び直す（null で未設定に戻す） */
export const setCurrentStaffId = (staffId: string | null): void => {
  try {
    if (staffId === null) globalThis.localStorage?.removeItem(STORAGE_KEY);
    else globalThis.localStorage?.setItem(STORAGE_KEY, staffId);
  } catch {
    // 保存できなくても、その画面が開いている間は選択を効かせる
  }
  cached = staffId;
  notify();
};

/** この端末で選ばれている「自分」のスタッフID（未設定なら null） */
export const useCurrentStaffId = (): string | null =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
