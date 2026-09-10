/**
 * クラス図の配置。**純粋関数だけ**（DOM にも React にも触らない）。
 *
 * 汎用のグラフ配置ライブラリは入れていない。この図には強い構造があって、
 * 総当たりの力学配置より**構造をそのまま置くほうが読める**からだ:
 *
 *   - 集約の根（世界線に載る単位）が主役。これを列に並べる
 *   - 集約の中の部品・値オブジェクトは、内包している根の**すぐ下**に置く
 *   - 集約をまたぐ参照（id）は、根と根のあいだの線になる
 *
 * つまり縦が「集約の内側／外側」、横が「別の集約」。
 * 集約の境界が図の骨格になるので、境界を読むのに視線を彷徨わせなくてよい。
 */
import type { ModelClass, ModelGraph, ModelRelation } from '../domain/ModelGraph.js';

export type LayoutOptions = {
  /** 箱の幅 */
  readonly boxWidth: number;
  /** 1行の高さ（タイトル・フィールド・メソッドで共通） */
  readonly lineHeight: number;
  /** 箱の中の上下の余白 */
  readonly boxPadding: number;
  /** 箱と箱の横の間隔 */
  readonly gapX: number;
  /** 箱と箱の縦の間隔 */
  readonly gapY: number;
  /** フィールドを何行まで出すか。超えたぶんは「ほか N 件」 */
  readonly maxFields: number;
  /** メソッドを何行まで出すか */
  readonly maxMethods: number;
};

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  boxWidth: 240,
  lineHeight: 18,
  boxPadding: 8,
  gapX: 56,
  gapY: 40,
  maxFields: 12,
  maxMethods: 10,
};

/** 図に置かれた箱1つ */
export type ClassBox = {
  readonly name: string;
  readonly cls: ModelClass;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** その箱が属する集約の根。根自身は自分の名前 */
  readonly aggregate: string;
  /** 実際に描く行数（省略ぶんを除く） */
  readonly shownFields: number;
  readonly shownMethods: number;
};

/** 箱と箱を結ぶ線 */
export type ClassEdge = {
  readonly relation: ModelRelation;
  readonly from: { x: number; y: number };
  readonly to: { x: number; y: number };
  /** 同じ集約の内側で閉じているか。閉じていれば境界をまたがない */
  readonly withinAggregate: boolean;
};

export type ClassDiagramLayout = {
  readonly boxes: readonly ClassBox[];
  readonly edges: readonly ClassEdge[];
  readonly width: number;
  readonly height: number;
  /** 図に置けなかったもの。黙って落とさない */
  readonly diagnostics: {
    /** どの集約にも属さず、どこからも内包されていないクラス */
    readonly orphanClasses: readonly string[];
    /** 相手の箱が図に無くて引けなかった線 */
    readonly danglingRelations: readonly string[];
  };
};

/**
 * 各クラスがどの集約に属するかを決める。
 *
 * 根から `contains` を辿って届く範囲がその集約。**同じ部品が2つの集約から
 * 内包されていることがある**（`WorkingDay` は多くの集約から使われる）ので、
 * 先に見つけた根に寄せる（根の名前順で決定的にする）。
 * どの根からも届かないものは自分自身を集約とみなす。
 */
export function assignAggregates(graph: ModelGraph): Map<string, string> {
  const contains = new Map<string, string[]>();
  for (const r of graph.relations) {
    if (r.kind !== 'contains') continue;
    contains.set(r.from, [...(contains.get(r.from) ?? []), r.to]);
  }
  const roots = graph.classes
    .filter((c) => c.kind === 'aggregate')
    .map((c) => c.name)
    .sort();

  const owner = new Map<string, string>();
  for (const root of roots) {
    const stack = [root];
    while (stack.length > 0) {
      const name = stack.pop() as string;
      if (owner.has(name)) continue;
      owner.set(name, root);
      for (const child of contains.get(name) ?? []) {
        if (!owner.has(child)) stack.push(child);
      }
    }
  }
  for (const c of graph.classes) if (!owner.has(c.name)) owner.set(c.name, c.name);
  return owner;
}

function boxHeight(cls: ModelClass, o: LayoutOptions): { h: number; f: number; m: number } {
  const f = Math.min(cls.fields.length, o.maxFields);
  const m = Math.min(cls.methods.length, o.maxMethods);
  const extraLines =
    (cls.fields.length > f ? 1 : 0) + (cls.methods.length > m ? 1 : 0) + (cls.doc ? 1 : 0);
  // タイトル + 区切り + フィールド + メソッド
  const lines = 1 + f + m + extraLines;
  return { h: lines * o.lineHeight + o.boxPadding * 2, f, m };
}

/**
 * 集約ごとに列を作って並べる。
 *
 * 列の順は「その集約が内包しているクラスの数」が多い順。中身の濃い集約を左に置くと、
 * 参照の線が右へ流れて交差が減る。同数なら名前順（決定的にするため）。
 */
export function layoutClassDiagram(
  graph: ModelGraph,
  options: Partial<LayoutOptions> = {}
): ClassDiagramLayout {
  const o = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  const owner = assignAggregates(graph);
  const byName = new Map(graph.classes.map((c) => [c.name, c]));

  /** 集約ID → その集約に属するクラス（根が先頭、あとは名前順） */
  const columns = new Map<string, ModelClass[]>();
  for (const c of graph.classes) {
    const root = owner.get(c.name) as string;
    columns.set(root, [...(columns.get(root) ?? []), c]);
  }
  for (const [root, members] of columns) {
    members.sort((a, b) => {
      if (a.name === root) return -1;
      if (b.name === root) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  const order = [...columns.keys()].sort((a, b) => {
    const diff = (columns.get(b)?.length ?? 0) - (columns.get(a)?.length ?? 0);
    return diff !== 0 ? diff : a.localeCompare(b);
  });

  const boxes: ClassBox[] = [];
  let x = o.gapX;
  let maxY = 0;
  for (const root of order) {
    let y = o.gapY;
    for (const cls of columns.get(root) ?? []) {
      const { h, f, m } = boxHeight(cls, o);
      boxes.push({
        name: cls.name,
        cls,
        x,
        y,
        width: o.boxWidth,
        height: h,
        aggregate: root,
        shownFields: f,
        shownMethods: m,
      });
      y += h + o.gapY / 2;
    }
    maxY = Math.max(maxY, y);
    x += o.boxWidth + o.gapX;
  }

  const boxByName = new Map(boxes.map((b) => [b.name, b]));
  const edges: ClassEdge[] = [];
  const dangling: string[] = [];
  for (const r of graph.relations) {
    const from = boxByName.get(r.from);
    const to = boxByName.get(r.to);
    if (!from || !to) {
      dangling.push(`${r.from}.${r.via} → ${r.to}`);
      continue;
    }
    edges.push({
      relation: r,
      // 箱の縁の中点どうしを結ぶ。左右どちらから出すかは位置関係で決める
      from: {
        x: from.x + (to.x >= from.x ? from.width : 0),
        y: from.y + from.height / 2,
      },
      to: { x: to.x + (to.x >= from.x ? 0 : to.width), y: to.y + to.height / 2 },
      withinAggregate: from.aggregate === to.aggregate,
    });
  }

  const containedSomewhere = new Set(
    graph.relations.filter((r) => r.kind === 'contains').map((r) => r.to)
  );
  const orphanClasses = graph.classes
    .filter(
      (c) => c.kind !== 'aggregate' && !containedSomewhere.has(c.name) && byName.has(c.name)
    )
    .map((c) => c.name)
    .sort();

  return {
    boxes,
    edges,
    width: x,
    height: maxY + o.gapY,
    diagnostics: { orphanClasses, danglingRelations: dangling.sort() },
  };
}
