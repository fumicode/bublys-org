/**
 * オブジェクト記述子の登録から「登録名 → クラス名」を読む。**Node 専用**。
 *
 * `scheduleId` が何を指すかは記述子だけが知っている（登録名は `Schedule`、
 * クラスは `MonthlyStaffSchedule`）。この対応を生成コマンドの引数に手で書くと、
 * 型を1つ足したときに黙って古くなる。**登録そのものをソースから読む。**
 *
 * 読む形（`defineObjects` に包まれていてもよい）:
 *
 *   export const HOTEL_OBJECTS = defineObjects({
 *     Staff: { class: Staff, ... },
 *     Schedule: { class: MonthlyStaffSchedule, ... },
 *   });
 */
import ts from 'typescript';

export type RegistryInfo = {
  /** 登録名 → クラス名 */
  readonly aliases: Readonly<Record<string, string>>;
  /** 登録されているクラス名（＝集約の根） */
  readonly aggregateClasses: readonly string[];
};

/** 引数が1つの呼び出しに包まれていたら中身を取り出す（`defineObjects({...})`） */
function unwrap(expr: ts.Expression): ts.Expression {
  let cur = expr;
  while (ts.isCallExpression(cur) && cur.arguments.length === 1) cur = cur.arguments[0];
  return cur;
}

export function extractRegistry(file: string, exportName: string): RegistryInfo {
  const program = ts.createProgram([file], {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    // 中身は読まない。宣言の形だけ見るので、型解決も依存の読み込みも要らない
    noResolve: true,
    noLib: true,
  });
  const sf = program.getSourceFile(file);
  if (!sf) throw new Error(`記述子のファイルを読めません: ${file}`);

  const aliases: Record<string, string> = {};
  ts.forEachChild(sf, (node) => {
    if (!ts.isVariableStatement(node)) return;
    for (const decl of node.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== exportName || !decl.initializer) {
        continue;
      }
      const literal = unwrap(decl.initializer);
      if (!ts.isObjectLiteralExpression(literal)) continue;
      for (const prop of literal.properties) {
        if (!ts.isPropertyAssignment(prop) || !ts.isObjectLiteralExpression(prop.initializer)) {
          continue;
        }
        const typeName = ts.isIdentifier(prop.name)
          ? prop.name.text
          : ts.isStringLiteral(prop.name)
            ? prop.name.text
            : undefined;
        if (!typeName) continue;
        for (const inner of prop.initializer.properties) {
          if (
            ts.isPropertyAssignment(inner) &&
            ts.isIdentifier(inner.name) &&
            inner.name.text === 'class' &&
            ts.isIdentifier(inner.initializer)
          ) {
            aliases[typeName] = inner.initializer.text;
          }
        }
      }
    }
  });

  if (Object.keys(aliases).length === 0) {
    throw new Error(
      `${exportName} の登録を読めませんでした: ${file}\n` +
        `（\`export const ${exportName} = { 型名: { class: クラス } }\` の形を期待している）`
    );
  }
  return {
    aliases,
    aggregateClasses: [...new Set(Object.values(aliases))].sort(),
  };
}
