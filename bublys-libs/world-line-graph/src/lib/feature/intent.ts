/**
 * いま開いている「ユーザーの 1 意図」。
 *
 * ルール:
 *   世界線のノードは **ユーザーが手を下した 1 回につき 1 つ**。
 *   意図はユーザーの入力（pointerdown / keydown）が始まった瞬間に開き、**次の入力が始まるまで閉じない**。
 *   開いている間に配置が何回変わってもノードは増えず、2 回目以降は同じノードを書き換える（amend）。
 *   動詞（popChild / drag / close …）は、すでに開いている意図に**名前を付けるだけ**。
 *
 * 時間定数（debounce / setTimeout / rAF）は使わない。判定材料は intentId の一致と
 * 「apex が leaf か」だけ（{@link WorldLineGraph.commit}）。
 *
 * React にも DOM にも依存しないモジュールスコープの状態にしてあるのは、
 * 意図が hook の外（listener middleware・非同期の後追い）から始まることがあるため。
 */

let current: { id: string; label: string | null } | null = null;
let seq = 0;

/** 同じセッション内で id が衝突しないための塩（モジュール読み込み時に 1 回だけ） */
const sessionSalt = Math.random().toString(36).slice(2, 8);

const open = (label: string | null): string => {
  current = { id: `i${++seq}-${sessionSalt}`, label };
  return current.id;
};

/**
 * ユーザー入力が来た = 新しい意図の始まり。**必ず**新しい意図を開く。
 * （連打は連打の数だけノードになる。それがユーザーの操作回数だから）
 */
export const beginIntent = (): string => open(null);

/**
 * 入力を伴わないプログラム起点のカスケード（ShellManager 由来の生成/削除など）用。
 * 直前のジェスチャの意図に吸われて履歴が消えないよう、自分で意図を開く。
 */
export const startIntent = (label: string): string => open(label);

/** いま開いている意図の id（開いていなければ null） */
export const currentIntentId = (): string | null => current?.id ?? null;

/** いま開いている意図の名前（未命名なら null） */
export const currentIntentLabel = (): string | null => current?.label ?? null;

/**
 * いま開いている意図に名前を付ける。開いていなければ開く。
 * すでに名前が付いていれば上書きしない（最初に名乗った動詞を尊重する）。
 */
export const nameIntent = (label: string): void => {
  if (!current) {
    open(label);
    return;
  }
  if (current.label === null) current.label = label;
};

/**
 * 意図の動詞をこれで包む。**名前を付けるだけ**で、区間を閉じはしない
 * （閉じるのは次の {@link beginIntent} だけ）。
 */
export const withIntent = <T>(label: string, run: () => T): T => {
  nameIntent(label);
  return run();
};
