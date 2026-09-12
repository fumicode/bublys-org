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

/**
 * 焼き付けの**写し**。
 *
 * 焼き付けメンバー（pinned）は、外の台帳と世界の中の**両方に居る**。
 * 片方にしか描かないとどちらかが嘘になる:
 *   枠の中だけ → 外の台帳にも居ることが消える
 *   枠の外だけ → その世界に載っていることが消える
 * だから両方に置いて、**同じものだと分かる線**で結ぶ。
 */
export type EchoSpec = {
  /** 写し元のクラス名 */
  readonly of: string;
  /** どの世界に焼き付けられるか */
  readonly scopeId: string;
  /** その世界の中で、どの箱の近くに置くか */
  readonly near: string;
  /**
   * その世界の中に居るクラス（集約の部品も含む）。
   *
   * **ここから焼き付けメンバーへ伸びる線は、外の箱ではなく写しにつなぐ。**
   * 世界の中から見えているのは焼き付けたほうで、外の台帳のほうではないから。
   * 外につなぐと「この世界のものが外を見ている」という嘘になる。
   */
  readonly members: readonly string[];
};

/** 位置が決まる前の箱（採寸だけ） */
export type MeasuredBox = {
  readonly name: string;
  readonly cls: ModelClass;
  readonly width: number;
  readonly height: number;
  /** その箱が属する集約の根。根自身は自分の名前 */
  readonly aggregate: string;
  /** 実際に描く行数（省略ぶんを除く） */
  readonly shownFields: number;
  readonly shownMethods: number;
  /**
   * 焼き付けの写しなら、写し元のクラス名。
   * 写しは中身を持たない（同じオブジェクトなので、2回書いても読むものが増えない）
   */
  readonly echoOf?: string;
  /** 写しが属する世界 */
  readonly echoScopeId?: string;
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
  /** 焼き付けの写しなら、写し元のクラス名 */
  readonly echoOf?: string;
  /** 写しが属する世界 */
  readonly echoScopeId?: string;
};

export type Point = { readonly x: number; readonly y: number };

/**
 * 曲線の形。**配置が決める**（ビューは `M from C c1 c2 to` と書くだけ）。
 *
 * 制御点をビューで作ると、横の縁から出る線と上下の縁から出る線で式が変わるのに
 * 片方だけ直して食い違う。どの縁から出すかを知っているのはここなので、形もここで決める。
 */
export type Curve = {
  readonly from: Point;
  readonly to: Point;
  readonly c1: Point;
  readonly c2: Point;
};

/** 箱と箱を結ぶ線 */
export type ClassEdge = Curve & {
  readonly relation: ModelRelation;
  /** 同じ集約の内側で閉じているか。閉じていれば境界をまたがない */
  readonly withinAggregate: boolean;
};

/**
 * 焼き付けの線。外の台帳の箱と、世界の中の写しを結ぶ**第3の線**。
 *
 * 内包（値を持つ）でも参照（id で指す）でもない。「世界が生まれた瞬間に同じ参照が
 * 焼かれて、以後そちらは動かない」という関係なので、線の種類を分けてある。
 *
 * ★ 位置の計算をビューに置かず、ここで関係の線と**一緒に**決める。
 *   別に計算すると同じ点に重なって、矢尻を隠してしまう（実際に隠した）。
 */
export type PinEdge = Curve & {
  /** 写し元のクラス名 */
  readonly of: string;
  /** 写しの箱の名前 */
  readonly echo: string;
  /** どの世界に焼き付けられるか */
  readonly scopeId?: string;
};

export type ClassDiagramLayout = {
  readonly boxes: readonly ClassBox[];
  readonly edges: readonly ClassEdge[];
  /** 焼き付けの線（写しがあるときだけ） */
  readonly pinEdges: readonly PinEdge[];
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

/**
 * 箱の大きさと、どの集約に属するかを決める。**位置は決めない。**
 *
 * 位置の決め方（列に並べる／力学で置く）は差し替えたいが、大きさの決め方は
 * どちらでも同じ。分けておかないと、片方だけ直して食い違う。
 */
export function measureBoxes(
  graph: ModelGraph,
  options: Partial<LayoutOptions> = {}
): MeasuredBox[] {
  const o = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  const owner = assignAggregates(graph);
  return graph.classes.map((cls) => {
    const { h, f, m } = boxHeight(cls, o);
    return {
      name: cls.name,
      cls,
      width: o.boxWidth,
      height: h,
      aggregate: owner.get(cls.name) as string,
      shownFields: f,
      shownMethods: m,
    };
  });
}

/**
 * 写しの箱を採寸する。
 *
 * 中身（フィールド・メソッド）は書かない。もう一度書いても読むものは増えない。
 * ただし**幅は本物と同じにする**。小さくすると脚注のように見えて、
 * 「世界の中からの矢印が向かう先」として読めない（実際に読めなかった）。
 */
export function measureEchoes(
  echoes: readonly EchoSpec[],
  measured: readonly MeasuredBox[],
  options: Partial<LayoutOptions> = {}
): MeasuredBox[] {
  const o = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  const byName = new Map(measured.map((b) => [b.name, b]));
  return echoes
    .map((e): MeasuredBox | null => {
      const origin = byName.get(e.of);
      if (!origin) return null;
      return {
        name: echoName(e),
        cls: origin.cls,
        width: o.boxWidth,
        height: o.lineHeight * 2 + o.boxPadding * 2,
        aggregate: origin.aggregate,
        shownFields: 0,
        shownMethods: 0,
        echoOf: e.of,
        echoScopeId: e.scopeId,
      };
    })
    .filter((b): b is MeasuredBox => b !== null);
}

/** 写しの箱の名前。写し元とぶつからないように世界の名前を足す */
export function echoName(e: EchoSpec): string {
  return `${e.of}@${e.scopeId}`;
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
  options: Partial<LayoutOptions> = {},
  echoes: readonly EchoSpec[] = []
): ClassDiagramLayout {
  const o = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  const owner = assignAggregates(graph);

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

  // 写しは「近くに置く相手」の集約の列に入れる（その世界の中に見えるように）
  const echoBoxes = measureEchoes(echoes, measureBoxes(graph, o), o);
  const echoesInColumn = new Map<string, MeasuredBox[]>();
  for (let i = 0; i < echoes.length; i++) {
    const box = echoBoxes.find((b) => b.name === echoName(echoes[i]));
    if (!box) continue;
    const column = owner.get(echoes[i].near);
    if (!column) continue;
    echoesInColumn.set(column, [...(echoesInColumn.get(column) ?? []), box]);
  }

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
    for (const echo of echoesInColumn.get(root) ?? []) {
      boxes.push({ ...echo, x, y });
      y += echo.height + o.gapY / 2;
    }
    maxY = Math.max(maxY, y);
    x += o.boxWidth + o.gapX;
  }

  return finishLayout(graph, boxes, { width: x, height: maxY + o.gapY }, echoes);
}

/** 箱のどの縁から線を出すか */
type Side = 'left' | 'right' | 'top' | 'bottom';

/** 線を箱のどの縁から出すかの**請求**。縁のどこに付くかは、あとでまとめて決める */
type PortRequest = {
  readonly box: ClassBox;
  readonly side: Side;
  /** 相手の箱の中心。縁の上での並び順に使う（相手が手前にある線ほど手前の口に付く＝交差が減る） */
  readonly toward: Point;
};

/** 縁の端に残す余白。角丸の上に線の口が乗らないように */
const PORT_INSET = 6;

/**
 * 2つの箱を、**どの縁とどの縁で**結ぶか。
 *
 * ★ 中心の左右だけで決めると、横に重なった箱どうしで線が**後ろ向きに走る**。
 *   矢尻は進行方向を向くので、相手の箱の中に食い込んで、あとから描かれる箱に
 *   塗りつぶされる——「矢印が1本もつながっていない」に見える。実際に見えなかった。
 *
 * だから「離れている向き」で決める。横に並んでいれば横の縁どうし、
 * 横に重なっている（＝縦に積まれている）なら上下の縁どうし。
 * こうすると線は必ず**互いの外側へ向かって**出る。
 */
function sidesBetween(from: ClassBox, to: ClassBox): { from: Side; to: Side } {
  const right = to.x - (from.x + from.width); // from の右に to が居るときの隙間
  const left = from.x - (to.x + to.width); // from の左に to が居るとき
  if (right >= 0 || left >= 0) {
    return right >= left ? { from: 'right', to: 'left' } : { from: 'left', to: 'right' };
  }
  // 横に重なっている＝縦に積まれている。上下の縁で結ぶ
  const below = to.y - (from.y + from.height);
  const above = from.y - (to.y + to.height);
  return below >= above ? { from: 'bottom', to: 'top' } : { from: 'top', to: 'bottom' };
}

/**
 * 同じ縁に届く線を、縁の上に**並べる**。
 *
 * ★ 全部を縁の中点に集めると、何本届いていても**1本にしか見えない**。しかも印
 *   （矢尻・四角）が完全に重なるので、あとから描いた線が前の線の印を塗りつぶす。
 *   実際「写しに矢印が1本もつながっていない」という絵になった——3本とも同じ点に
 *   終わっていて、最後に描いた焼き付けの四角が矢尻2つを隠していた。
 *
 * 1本しか来ない縁は中点のまま（ほとんどの箱はこちら）。
 */
function allocatePorts(requests: readonly PortRequest[]): Point[] {
  const groups = new Map<string, number[]>();
  requests.forEach((r, i) => {
    const key = `${r.side}:${r.box.name}`;
    groups.set(key, [...(groups.get(key) ?? []), i]);
  });

  const ports: Point[] = new Array(requests.length);
  for (const indices of groups.values()) {
    const vertical = requests[indices[0]].side === 'left' || requests[indices[0]].side === 'right';
    // 相手が手前にいる線ほど手前の口に付ける。同じ位置なら請求順（決定的にするため）
    const key = (i: number) => (vertical ? requests[i].toward.y : requests[i].toward.x);
    const order = [...indices].sort((a, b) => key(a) - key(b) || a - b);
    order.forEach((i, rank) => {
      const { box, side } = requests[i];
      const length = vertical ? box.height : box.width;
      const inset = Math.min(PORT_INSET, length / 4);
      const at = inset + ((length - inset * 2) * (rank + 1)) / (order.length + 1);
      ports[i] = vertical
        ? { x: box.x + (side === 'right' ? box.width : 0), y: box.y + at }
        : { x: box.x + at, y: box.y + (side === 'bottom' ? box.height : 0) };
    });
  }
  return ports;
}

/**
 * 線の曲がり方。縁の向きにまっすぐ出て、相手の縁へまっすぐ入る。
 * 横の縁なら制御点を横に、上下の縁なら縦に置く。
 */
function curve(from: Point, to: Point, side: Side): Curve {
  if (side === 'left' || side === 'right') {
    const mx = (from.x + to.x) / 2;
    return { from, to, c1: { x: mx, y: from.y }, c2: { x: mx, y: to.y } };
  }
  const my = (from.y + to.y) / 2;
  return { from, to, c1: { x: from.x, y: my }, c2: { x: to.x, y: my } };
}

/**
 * 置き終わった箱から、線・大きさ・申告を作る。**配置の仕方によらず共通**。
 *
 * 線は箱の左右どちらかの縁から出る。どちらの縁かは位置関係で決めるので、力学配置で
 * 箱が入れ替わっても線の出方は自然なまま。縁のどこに付くかは、**その縁に何本来たか**
 * で決める（`allocatePorts`）。焼き付けの線も同じ仕組みで口を取るので、関係の矢印と
 * 重ならない。
 */
export function finishLayout(
  graph: ModelGraph,
  boxes: readonly ClassBox[],
  size?: { width: number; height: number },
  echoes: readonly EchoSpec[] = []
): ClassDiagramLayout {
  const boxByName = new Map(boxes.map((b) => [b.name, b]));

  /**
   * 世界の中から焼き付けメンバーへ伸びる線を、**写しのほうへ付け替える**。
   * 世界の中から見えているのは焼き付けたほうなので、外の箱につなぐと
   * 「この世界のものが外を見ている」という嘘になる。
   */
  const redirect = new Map<string, string>();
  for (const e of echoes) {
    const echo = boxByName.get(echoName(e));
    if (!echo) continue;
    for (const from of e.members) redirect.set(`${from}→${e.of}`, echo.name);
  }

  const requests: PortRequest[] = [];
  const center = (b: ClassBox): Point => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
  /** 2つの箱の口を請求して、[出口, 入口, 縁の向き] を返す */
  const claim = (from: ClassBox, to: ClassBox): [number, number, Side] => {
    const side = sidesBetween(from, to);
    const out = requests.push({ box: from, side: side.from, toward: center(to) }) - 1;
    const into = requests.push({ box: to, side: side.to, toward: center(from) }) - 1;
    return [out, into, side.from];
  };

  const dangling: string[] = [];
  const relationPorts: {
    relation: ModelRelation;
    withinAggregate: boolean;
    at: [number, number, Side];
  }[] = [];
  for (const r of graph.relations) {
    const from = boxByName.get(r.from);
    const to = boxByName.get(redirect.get(`${r.from}→${r.to}`) ?? r.to);
    if (!from || !to) {
      dangling.push(`${r.from}.${r.via} → ${r.to}`);
      continue;
    }
    relationPorts.push({
      relation: r,
      withinAggregate: from.aggregate === to.aggregate,
      at: claim(from, to),
    });
  }

  // 焼き付けの線は**箱から**導く（写しの箱があること自体が焼き付けの事実）。
  // 関係の線と同じ請求の列に並べるので、同じ縁に来れば互いに譲り合う
  const pinPorts: {
    of: string;
    echo: string;
    scopeId?: string;
    at: [number, number, Side];
  }[] = [];
  for (const echo of boxes) {
    if (!echo.echoOf) continue;
    const origin = boxByName.get(echo.echoOf);
    if (!origin) continue;
    pinPorts.push({
      of: echo.echoOf,
      echo: echo.name,
      scopeId: echo.echoScopeId,
      at: claim(origin, echo),
    });
  }

  const ports = allocatePorts(requests);
  const shapeOf = ([out, into, side]: [number, number, Side]) =>
    curve(ports[out], ports[into], side);
  const edges: ClassEdge[] = relationPorts.map((p) => ({
    relation: p.relation,
    withinAggregate: p.withinAggregate,
    ...shapeOf(p.at),
  }));
  const pinEdges: PinEdge[] = pinPorts.map((p) => ({
    of: p.of,
    echo: p.echo,
    scopeId: p.scopeId,
    ...shapeOf(p.at),
  }));

  const containedSomewhere = new Set(
    graph.relations.filter((r) => r.kind === 'contains').map((r) => r.to)
  );
  const orphanClasses = graph.classes
    .filter((c) => c.kind !== 'aggregate' && !containedSomewhere.has(c.name))
    .map((c) => c.name)
    .sort();

  const width = size?.width ?? Math.max(...boxes.map((b) => b.x + b.width), 0) + 40;
  const height = size?.height ?? Math.max(...boxes.map((b) => b.y + b.height), 0) + 40;

  return {
    boxes,
    edges,
    pinEdges,
    width,
    height,
    diagnostics: { orphanClasses, danglingRelations: dangling.sort() },
  };
}
