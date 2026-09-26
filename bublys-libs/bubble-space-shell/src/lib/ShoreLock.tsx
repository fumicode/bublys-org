"use client";
/**
 * **岸のロック。**
 *
 * 岸で海を埋めた状態（いわゆるスプリットビュー）は、**窓の大きさが変わると崩れる** ──
 * 岸の大きさは px で持っているので、広げれば埋めていたはずの所に海が顔を出し、
 * 狭めれば向かい合った岸どうしが食い込む。
 *
 * > **ロックした岸は、窓の大きさが変わっても海の分け方を保つ。**
 *
 * 保つ引き直しそのものは `retileToViewport`（岸の規則）にある。ここが持つのは
 * 「どの岸がロックされているか」だけ。
 *
 * ★ 名前は **url**（岸を覚える名前 `persistKey` と同じ）。ボタンを出すのは
 *   **外の空間のステータスバー**（× の隣）で、ロックを使うのは**その窓の中の岸**
 *   ── 描いている場所が違うので、名前で繋ぐ。
 * ★ 持ち主は窓より**上**に置く（`BubblesUINext`）。窓は岸に貼ると描き直されるので、
 *   窓の中に持つと貼り直すたびにロックが外れる。
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type FC,
  type ReactNode,
} from "react";

export type ShoreLock = {
  readonly isLocked: (key: string) => boolean;
  readonly toggle: (key: string) => void;
};

const NONE: ShoreLock = { isLocked: () => false, toggle: () => undefined };

const ShoreLockContext = createContext<ShoreLock>(NONE);

/** ロックの持ち主。包んでいない所では「どれもロックされていない」 */
export const ShoreLockProvider: FC<{ readonly children: ReactNode }> = ({ children }) => {
  const [locked, setLocked] = useState<ReadonlySet<string>>(() => new Set<string>());
  const value = useMemo<ShoreLock>(
    () => ({
      isLocked: (key) => locked.has(key),
      toggle: (key) =>
        setLocked((prev) => {
          const next = new Set(prev);
          if (!next.delete(key)) next.add(key);
          return next;
        }),
    }),
    [locked],
  );
  return <ShoreLockContext.Provider value={value}>{children}</ShoreLockContext.Provider>;
};

export const useShoreLock = (): ShoreLock => useContext(ShoreLockContext);

/**
 * 錠前。閉じていれば掛け金が下りている（＝分け方を保つ）。
 * 12px 四方で、色は文字と同じ（`currentColor`）── 帯の中の他の字と同じ扱いにする。
 */
const LockIcon: FC<{ readonly on: boolean }> = ({ on }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
    <rect x="2" y="5.5" width="8" height="5.5" rx="1.2" fill="currentColor" />
    <path
      d={on ? "M4 5.5V3.6a2 2 0 0 1 4 0v1.9" : "M4 5.5V3.6a2 2 0 0 1 4 0"}
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

/**
 * ステータスバーに出す口（× の隣）。押すと、その窓の岸のロックが切り替わる。
 *
 * ★ `onPointerDown` で押したことを止める ── 止めないと、その下の枠が
 *   「泡を掴んだ」と読んで窓が動きだす（`bl-close` と同じ）。
 */
export const ShoreLockButton: FC<{ readonly shoreKey: string }> = ({ shoreKey }) => {
  const { isLocked, toggle } = useShoreLock();
  const on = isLocked(shoreKey);
  const onClick = useCallback(() => toggle(shoreKey), [toggle, shoreKey]);
  return (
    <button
      className="bl-tool"
      aria-pressed={on}
      title={
        on
          ? "岸をロック中 ── 窓の大きさを変えても、海の分け方はこのまま"
          : "岸をロックする ── 窓の大きさを変えても、海の分け方を保つ"
      }
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
    >
      <LockIcon on={on} />
    </button>
  );
};
