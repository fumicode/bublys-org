/**
 * フィールドから**クラス同士のつながり**を導く。純粋関数だけ。
 *
 * 抽出（TypeScript のコンパイラ API）と分けてあるのは、ここが**判断**だから。
 * 「`staffId: string` は Staff への参照だ」は推測で、外すことがある。
 * だから判断はテストで固定できる形に切り出し、結果には
 * どうやって見つけたか（{@link ModelRelation.foundBy}）を必ず添える。
 */
import type { ModelField, ModelRelation } from './ModelGraph.js';

/**
 * 型の文字列から、そこに現れるクラス名を拾う。
 *
 * TypeScript が返す型は `WorkShiftState[]`・`Record<string, ShiftAssignment>`・
 * `ShiftValue | undefined` のような文字列。クラス名は「大文字始まりの語」なので、
 * 語を切り出して既知のクラス名と突き合わせる。
 *
 * `State` / `Plain` の接尾辞は落とす。plain 化した型（`WorkShiftState`）も
 * 同じクラスを指しているので、図の上では区別しない。
 */
export function classNamesInType(
  type: string,
  known: ReadonlySet<string>
): string[] {
  const found = new Set<string>();
  for (const word of type.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []) {
    if (known.has(word)) {
      found.add(word);
      continue;
    }
    const stripped = word.replace(/(State|Plain)$/, '');
    if (stripped !== word && known.has(stripped)) found.add(stripped);
  }
  return [...found];
}

/** 配列・Record・Map なら「複数持つ」 */
export function isMany(type: string): boolean {
  return /\[\]|^Array<|\bReadonlyArray<|\bRecord<|\bMap</.test(type);
}

/**
 * `staffId` / `leaderStaffIds` / `scheduleId` のような命名から参照先を推す。
 *
 * ★ これは**推測**。だから条件を絞る。
 *   - 接尾辞が `Id` / `Ids` であること（`id` そのものは自分の同一性なので除く）
 *   - 前半（またはその末尾の語）が、既知のクラスか**登録名**に当たること
 * 当たらなければ何も言わない。近い名前に寄せない。
 *
 * `aliases` は「世界線への**登録名** → クラス名」。`scheduleId` が指すのは登録名
 * `Schedule` で、クラスは `MonthlyStaffSchedule`。この対応は記述子だけが知っているので、
 * 推測せずに呼び出し側から受け取る。
 *
 * 前半は camelCase の先頭から順に削って試す（`leaderStaffIds` → `LeaderStaff` → `Staff`）。
 * 複合語のフィールドは実際にこの形をしていて、丸ごと一致しか見ないと実在する関連を落とす。
 */
export function referencedClassByNaming(
  fieldName: string,
  known: ReadonlySet<string>,
  aliases: Readonly<Record<string, string>> = {}
): string | undefined {
  const m = /^(.+?)(Id|Ids)$/.exec(fieldName);
  if (!m) return undefined;
  // camelCase を語に割り、先頭から削りながら候補を作る
  const words = m[1].replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(' ');
  for (let i = 0; i < words.length; i++) {
    const raw = words.slice(i).join('');
    const candidate = raw.charAt(0).toUpperCase() + raw.slice(1);
    const resolved = aliases[candidate] ?? candidate;
    if (known.has(resolved)) return resolved;
  }
  return undefined;
}

/**
 * 1つのクラスのフィールドから、つながりを全部導く。
 *
 * 型にクラス名が出ていれば `contains`（集約の内側）。
 * 出ていなくて命名が `〜Id` なら `references`（集約をまたぐ）。
 * **同じフィールドから両方は出さない。** 型で分かるならそちらが確実なので、そちらを採る。
 *
 * 自分自身への参照（`Staff.rename` が Staff を返す等）はここでは扱わない。
 * フィールドが自分の型を持つ場合（木構造）だけは残す。
 */
export function relationsOfClass(
  className: string,
  fields: readonly ModelField[],
  known: ReadonlySet<string>,
  aliases: Readonly<Record<string, string>> = {}
): ModelRelation[] {
  const out: ModelRelation[] = [];
  for (const f of fields) {
    const byType = classNamesInType(f.type, known).filter((n) => n !== className);
    if (byType.length > 0) {
      for (const to of byType) {
        out.push({
          from: className,
          to,
          kind: 'contains',
          via: f.name,
          many: isMany(f.type),
          foundBy: 'type',
        });
      }
      continue;
    }
    const byName = referencedClassByNaming(f.name, known, aliases);
    if (byName && byName !== className) {
      out.push({
        from: className,
        to: byName,
        kind: 'references',
        via: f.name,
        many: isMany(f.type) || f.name.endsWith('Ids'),
        foundBy: 'id-naming',
      });
    }
  }
  return out;
}
