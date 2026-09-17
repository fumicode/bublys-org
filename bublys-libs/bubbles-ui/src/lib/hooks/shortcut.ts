/**
 * shortcut — キーボードショートカットの表記と判定（純粋関数）
 *
 * ショートカットは `"mod+shift+z"` のような1本の文字列で書く。Windows でも Mac でも同じ書き方になる。
 *   - `mod`   : Cmd または Ctrl（どちらの OS でも両方効く）
 *   - `shift` / `alt` : そのキー
 *   - 最後の要素がキー（`e.key` と大文字小文字を無視して比べる）。例: `"ArrowLeft"` / `"mod+z"`
 * 修飾は過不足なく一致したときだけ当たる（`"z"` は Ctrl+Z に当たらない）。
 */

export type Shortcut = {
  key: string;
  mod: boolean;
  shift: boolean;
  alt: boolean;
};

/** キー判定に使うイベントの形（DOM の KeyboardEvent / React の KeyboardEvent どちらも満たす） */
export type ShortcutEventLike = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
};

const MODIFIERS = ["mod", "shift", "alt"] as const;
type Modifier = (typeof MODIFIERS)[number];

/** `"mod+shift+z"` を解釈する。知らない修飾や空のキーは書き間違いなので例外にする */
export function parseShortcut(keys: string): Shortcut {
  const parts = keys.split("+");
  const key = parts.pop() ?? "";
  if (key === "") throw new Error(`ショートカットにキーがありません: "${keys}"`);
  const shortcut: Shortcut = { key: key.toLowerCase(), mod: false, shift: false, alt: false };
  for (const part of parts) {
    const modifier = part.toLowerCase();
    if (!MODIFIERS.includes(modifier as Modifier)) {
      throw new Error(
        `ショートカットの修飾が分かりません: "${part}"（使えるのは ${MODIFIERS.join(" / ")}）: "${keys}"`
      );
    }
    shortcut[modifier as Modifier] = true;
  }
  return shortcut;
}

/** イベントがショートカットに当たるか（修飾は過不足なく一致） */
export function matchesShortcut(e: ShortcutEventLike, shortcut: Shortcut): boolean {
  return (
    e.key.toLowerCase() === shortcut.key &&
    (e.ctrlKey || e.metaKey) === shortcut.mod &&
    e.shiftKey === shortcut.shift &&
    e.altKey === shortcut.alt
  );
}

/**
 * テキストを打っている最中の要素か。そこではショートカットでキーを奪わない。
 * input / textarea / contentEditable に加えて、`data-text-editing` を付けた要素の内側
 * （勤務表のセルのように、独自に文字入力を受ける要素が打っている最中だけ付ける）。
 */
export function isTextEditingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== "function") return false;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable) return true;
  return el.closest("[data-text-editing]") !== null;
}
