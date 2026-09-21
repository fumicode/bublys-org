/**
 * TypeScript のソースから {@link ModelGraph} を起こす。
 *
 * ★ **このファイルは Node でしか動かない。** `typescript` を静的 import しているので、
 *   ブラウザ側から到達すると数 MB のコンパイラごとバンドルに入る。
 *   バレル（`src/index.ts`）から絶対に export しないこと。
 *   到達経路は `extract/cli.ts`（生成コマンド）と `extract/*.test.ts` だけ。
 *   world-line-graph が `three` を scene.ts だけに閉じ込めているのと同じ規律で、
 *   同じ理由（Jest とブラウザが読めなくなる）。
 *
 * 読むのは「state オブジェクト規約」に沿ったクラス:
 *
 *   export class Staff {
 *     constructor(readonly state: StaffState) {}
 *   }
 *
 * この規約から外れたクラスは、箱だけ出してフィールドを空にし、
 * {@link ModelGraphDiagnostics.classesWithoutState} で申告する（黙って落とさない）。
 */
import ts from 'typescript';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  ClassKind,
  ModelClass,
  ModelField,
  ModelGraph,
  ModelMethod,
} from '../domain/ModelGraph.js';
import { relationsOfClass } from '../domain/relations.js';

export type ExtractOptions = {
  /** モデルのソースの根。ここより下の .ts を読む */
  readonly sourceRoot: string;
  /** 図の中で「集約の根」として扱うクラス名。省略時は全部 part 扱い */
  readonly aggregateTypes?: readonly string[];
  /**
   * 世界線への**登録名 → クラス名**。`{ Schedule: 'MonthlyStaffSchedule' }` のように渡す。
   * `scheduleId` が何を指すかは記述子だけが知っているので、ソースからは推測しない
   */
  readonly typeAliases?: Readonly<Record<string, string>>;
  /** 診断に出す sourceRoot の表示名（リポジトリからの相対にするため） */
  readonly displayRoot?: string;
};

/** ソースの根の下から .ts を集める（テストと宣言ファイルは除く） */
function collectSources(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        entry.name.endsWith('.ts') &&
        !entry.name.endsWith('.test.ts') &&
        !entry.name.endsWith('.spec.ts') &&
        !entry.name.endsWith('.d.ts')
      ) {
        out.push(full);
      }
    }
  };
  walk(root);
  return out.sort();
}

/** クラス宣言の直前に書かれた説明の最初の段落 */
function docOf(node: ts.ClassDeclaration, sf: ts.SourceFile): string | undefined {
  const ranges = ts.getLeadingCommentRanges(sf.getFullText(), node.getFullStart());
  const last = ranges?.at(-1);
  if (!last) return undefined;
  const raw = sf.getFullText().slice(last.pos, last.end);
  if (!raw.startsWith('/**')) return undefined;
  const lines = raw
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((l) => l.replace(/^\s*\*ature?\s?/, '').replace(/^\s*\*\s?/, '').trimEnd());
  const paragraph: string[] = [];
  for (const line of lines) {
    if (line.trim() === '') {
      if (paragraph.length > 0) break;
      continue;
    }
    if (line.trim().startsWith('@')) break;
    paragraph.push(line.trim());
  }
  const text = paragraph.join(' ').trim();
  return text === '' ? undefined : text;
}

/** state の型（`constructor(readonly state: XState)`）を探す */
function stateTypeOf(
  node: ts.ClassDeclaration,
  sf: ts.SourceFile,
  checker: ts.TypeChecker
): ts.Type | undefined {
  for (const member of node.members) {
    if (!ts.isConstructorDeclaration(member)) continue;
    for (const param of member.parameters) {
      if (param.name.getText(sf) === 'state' && param.type) {
        return checker.getTypeAtLocation(param.type);
      }
    }
  }
  return undefined;
}

function fieldsOf(type: ts.Type, at: ts.Node, checker: ts.TypeChecker): ModelField[] {
  return checker.getPropertiesOfType(type).map((symbol) => {
    const t = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration ?? at);
    return {
      name: symbol.getName(),
      // `| undefined` は optional で言うので型からは落とす（同じことを2回言わない）
      type: checker.typeToString(t).replace(/\s*\|\s*undefined$/, ''),
      optional: (symbol.flags & ts.SymbolFlags.Optional) !== 0,
    };
  });
}

function methodsOf(
  node: ts.ClassDeclaration,
  sf: ts.SourceFile,
  checker: ts.TypeChecker,
  className: string
): ModelMethod[] {
  const out: ModelMethod[] = [];
  for (const member of node.members) {
    if (!ts.isMethodDeclaration(member) || !member.name) continue;
    const flags = ts.getCombinedModifierFlags(member);
    if (flags & ts.ModifierFlags.Private) continue;
    const signature = checker.getSignatureFromDeclaration(member);
    const returns = signature
      ? checker.typeToString(signature.getReturnType())
      : 'unknown';
    out.push({
      name: member.name.getText(sf),
      params: member.parameters.map((p) => p.name.getText(sf)),
      returns,
      isStatic: (flags & ts.ModifierFlags.Static) !== 0,
      // 不変なドメインクラスでは、更新は自分を返すメソッドとして現れる
      returnsSelf: returns === className,
    });
  }
  return out;
}

/**
 * クラスの単位を決める。
 *
 * 集約の根は**呼び出し側が渡す**（記述子に登録されている型）。ソースだけからは
 * 「これは世界線に載る単位だ」とは分からないので、推測しない。
 * 渡されなかったものは、id を持つなら部品、持たないなら値オブジェクト。
 */
function kindOf(
  className: string,
  fields: readonly ModelField[],
  aggregates: ReadonlySet<string>
): ClassKind {
  if (aggregates.has(className)) return 'aggregate';
  return fields.some((f) => f.name === 'id') ? 'part' : 'value';
}

export function extractModelGraph(options: ExtractOptions): ModelGraph {
  const root = path.resolve(options.sourceRoot);
  const files = collectSources(root);
  const program = ts.createProgram(files, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    skipLibCheck: true,
    noEmit: true,
  });
  const checker = program.getTypeChecker();
  const aggregates = new Set(options.aggregateTypes ?? []);

  const raw: { node: ts.ClassDeclaration; sf: ts.SourceFile; name: string }[] = [];
  for (const sf of program.getSourceFiles()) {
    if (sf.isDeclarationFile || !sf.fileName.startsWith(root)) continue;
    ts.forEachChild(sf, (node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        raw.push({ node, sf, name: node.name.text });
      }
    });
  }

  const known = new Set(raw.map((r) => r.name));
  const classesWithoutState: string[] = [];
  const classes: ModelClass[] = [];

  for (const { node, sf, name } of raw) {
    const stateType = stateTypeOf(node, sf, checker);
    if (!stateType) classesWithoutState.push(name);
    const fields = stateType ? fieldsOf(stateType, node, checker) : [];
    classes.push({
      name,
      file: path.relative(root, sf.fileName),
      kind: kindOf(name, fields, aggregates),
      fields,
      getters: node.members
        .filter((m): m is ts.GetAccessorDeclaration => ts.isGetAccessorDeclaration(m))
        .map((m) => m.name.getText(sf)),
      methods: methodsOf(node, sf, checker, name),
      doc: docOf(node, sf),
    });
  }

  classes.sort((a, b) => a.name.localeCompare(b.name));

  const relations = classes
    .flatMap((c) => relationsOfClass(c.name, c.fields, known, options.typeAliases ?? {}))
    .sort(
      (a, b) =>
        a.from.localeCompare(b.from) || a.via.localeCompare(b.via) || a.to.localeCompare(b.to)
    );

  // 渡された集約のうち、ソースに見つからなかったもの（型名の綴り違い・別パッケージ）
  const unresolvedTypes = [...aggregates].filter((t) => !known.has(t)).sort();

  // 「〜Id なのに参照先を決められなかった」フィールド。図に線が足りていない印
  const linked = new Set(relations.map((r) => `${r.from}.${r.via}`));
  const unresolvedIdFields = classes
    .flatMap((c) =>
      c.fields
        .filter((f) => /Ids?$/.test(f.name) && f.name !== 'id')
        .map((f) => `${c.name}.${f.name}`)
    )
    .filter((key) => !linked.has(key))
    .sort();

  return {
    classes,
    relations,
    diagnostics: {
      sourceRoot: options.displayRoot ?? options.sourceRoot,
      fileCount: files.length,
      classesWithoutState: classesWithoutState.sort(),
      unresolvedTypes,
      unresolvedIdFields,
    },
  };
}
