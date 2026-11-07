/**
 * useNumberDraft — 「入力中は保存せず、確定したときに1回だけ保存する」数の編集。
 *
 * 制約の値は世界線に載る。打鍵ごとに保存すると、1つの数を直すだけで世界線に
 * ノードが何個も生える。だから入力中はドラフトに溜め、blur か Enter で1回だけ commit する。
 *
 * 外から値が変わったら（時間移動で過去の値に戻ったときなど）ドラフトを捨てて追随する。
 * 追随しないと、巻き戻したのに入力欄だけ古い打鍵が残って見える。
 *
 * NumberField（常に入力欄）・InlineNumber（文の中の数）・IconValueText（図の中の数）が
 * みなこの1つを使う。
 */
import { useEffect, useState, type KeyboardEvent } from "react";

export const useNumberDraft = (value: number, onCommit: (value: number) => void) => {
  const [draft, setDraft] = useState<string | null>(null);

  // 外から値が変わったらドラフトを捨てる（時間移動で値が変わるため）
  useEffect(() => {
    setDraft(null);
  }, [value]);

  const commit = () => {
    if (draft === null) return;
    const n = parseInt(draft, 10);
    // 同じ値なら呼ばない（同じ内容のノードを世界線に積まない）
    if (!Number.isNaN(n) && n !== value) onCommit(n);
    setDraft(null);
  };
  const cancel = () => setDraft(null);

  return {
    /** 編集中か（ドラフトを持っているか） */
    editing: draft !== null,
    /** 編集を始める（いまの値をドラフトにする） */
    start: () => setDraft(String(value)),
    /** 入力欄にそのまま渡す */
    inputProps: {
      value: draft ?? String(value),
      onChange: (e: { target: { value: string } }) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: KeyboardEvent) => {
        // 日本語入力の変換確定 Enter は確定ではない
        if (e.key === "Enter" && !e.nativeEvent.isComposing) commit();
        if (e.key === "Escape") cancel();
      },
    },
  };
};
