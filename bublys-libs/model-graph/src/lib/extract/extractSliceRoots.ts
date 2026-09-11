/**
 * Redux スライスの宣言から「集約の根」を読む。**Node 専用**。
 *
 * 記述子（`HOTEL_OBJECTS`）を持たないバブリのための、もう1つの出どころ。
 * このリポジトリでは**スライスは集約のリポジトリに徹する**と決めてあるので
 * （CLAUDE.md）、「どのクラスが集約の根か」はスライスが既に宣言している。
 *
 * 生成コマンドの引数に根の一覧を手で書くと、型を1つ足したときに黙って古くなる。
 * 図が「新しい集約を部品だと言う」形で嘘をつく。だから**宣言そのものを読む**。
 *
 * 読む形（スライスの state 型）:
 *
 *   type MemberSliceState = {
 *     memberList: MemberState[];      // → Member が集約の根
 *   };
 *
 * ★ 見るのは `〜SliceState` という型宣言の中だけ。ファイル全体を走査すると
 *   reducer の `PayloadAction<{ shifts: ShiftState[] }>` まで拾って、
 *   集約の**部品**を根に格上げしてしまう（実際 Shift がそう）。
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';

export type SliceRoots = {
  /** スライスが保存しているクラス名（＝集約の根）。名前順 */
  readonly aggregateClasses: readonly string[];
  /** どのファイルがどのクラスを保存しているか。申告と、読めなかったときの手がかり */
  readonly byFile: Readonly<Record<string, readonly string[]>>;
};

/** `〜State` を外してクラス名にする。`MemberState` → `Member` */
function classNameOf(typeName: string): string | undefined {
  const m = /^(.+)State$/.exec(typeName);
  return m && m[1].length > 0 ? m[1] : undefined;
}

/** 型のどこかに出てくる `〜State` を集める（配列・Record・readonly・union を通す） */
function statesIn(node: ts.TypeNode, out: Set<string>): void {
  if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
    const name = classNameOf(node.typeName.text);
    if (name) out.add(name);
  }
  node.forEachChild((child) => {
    if (ts.isTypeNode(child)) statesIn(child, out);
  });
}

export function extractSliceRoots(dir: string): SliceRoots {
  const root = path.resolve(dir);
  const files = fs
    .readdirSync(root)
    .filter((f) => f.endsWith('-slice.ts') && !f.endsWith('.test.ts'))
    .sort();
  if (files.length === 0) {
    throw new Error(`スライスが見つかりません: ${root}（\`*-slice.ts\` を探している）`);
  }

  const byFile: Record<string, string[]> = {};
  for (const file of files) {
    const full = path.join(root, file);
    const sf = ts.createSourceFile(
      full,
      fs.readFileSync(full, 'utf-8'),
      ts.ScriptTarget.ES2022,
      true
    );
    const found = new Set<string>();
    ts.forEachChild(sf, (node) => {
      // 見るのは state 型の宣言だけ。reducer の payload まで見に行かない
      if (!ts.isTypeAliasDeclaration(node) || !node.name.text.endsWith('SliceState')) return;
      if (!ts.isTypeLiteralNode(node.type)) return;
      for (const member of node.type.members) {
        if (ts.isPropertySignature(member) && member.type) statesIn(member.type, found);
      }
    });
    if (found.size > 0) byFile[file] = [...found].sort();
  }

  const aggregateClasses = [...new Set(Object.values(byFile).flat())].sort();
  if (aggregateClasses.length === 0) {
    throw new Error(
      `スライスから集約の根を読めませんでした: ${root}\n` +
        '（`type 〜SliceState = { 何か: 〜State[] }` の形を期待している）'
    );
  }
  return { aggregateClasses, byFile };
}
