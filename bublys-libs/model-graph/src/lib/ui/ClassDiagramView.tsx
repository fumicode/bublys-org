'use client';

/**
 * クラス図を SVG で描く。**props で受けたものしか描かない**（Redux も fetch も無い）。
 *
 * 図の読み方はこう決めてある:
 *
 *   縦（同じ列）  … 同じ集約の内側。上が根で、下が部品
 *   横（別の列）  … 別の集約
 *   実線 ◆       … 内包（一緒に保存され、一緒に巻き戻る）
 *   破線 →       … id で参照（集約をまたぐ。別々に保存される）
 *
 * 集約の境界が図の骨格なので、境界をまたぐ線だけ破線にしてある。
 * 「どこまでが1つのかたまりか」が線の種類で読める。
 */
import { useCallback, useMemo, useRef, useState, type FC } from 'react';
import type { ModelClass, ModelGraph } from '../domain/ModelGraph.js';
import { layoutClassDiagramByForce } from './forceLayout.js';
import {
  DEFAULT_LAYOUT_OPTIONS,
  assignAggregates,
  finishLayout,
  layoutClassDiagram,
  type ClassBox,
  type LayoutOptions,
} from './classLayout.js';

export const CLASS_DIAGRAM_PALETTE = {
  background: '#0d1117',
  boxFill: '#161b22',
  boxFillSelected: '#1f2b3d',
  aggregateEdge: '#58a6ff',
  partEdge: '#8b949e',
  valueEdge: '#7ee787',
  title: '#e6edf3',
  field: '#c9d1d9',
  fieldType: '#79c0ff',
  method: '#d2a8ff',
  /** 更新メソッド（自分を返す＝不変更新）。ドメインの動かし方そのもの */
  methodMutating: '#e3b341',
  doc: '#8b949e',
  containsLine: '#8b949e',
  referencesLine: '#e3b341',
  aggregateBand: '#1f6feb',
  /** 世界線スコープの枠。世界線ビューアの「固定」と同じシアン */
  scopeFrame: '#39c5cf',
} as const;

const KIND_LABEL: Record<ModelClass['kind'], string> = {
  aggregate: '集約',
  part: '部品',
  value: '値',
};

const kindColor = (kind: ModelClass['kind']) =>
  kind === 'aggregate'
    ? CLASS_DIAGRAM_PALETTE.aggregateEdge
    : kind === 'value'
      ? CLASS_DIAGRAM_PALETTE.valueEdge
      : CLASS_DIAGRAM_PALETTE.partEdge;

export type ClassDiagramViewProps = {
  readonly graph: ModelGraph;
  readonly options?: Partial<LayoutOptions>;
  /** 選ばれているクラス。関係する線だけを濃く出す */
  readonly selected?: string | null;
  readonly onSelect?: (name: string | null) => void;
  /**
   * 世界線での所属（live / pinned / external）。バブリ側から注入する。
   * ソースからは分からないので、渡されなければ**何も描かない**（推測しない）
   */
  readonly membershipOf?: (className: string) => string | undefined;
  /** 表示倍率。1 で実寸 */
  readonly scale?: number;
  /**
   * そのクラスがどの世界線スコープに属するか。バブリ側から注入する。
   * 渡されなければ枠を**描かない**（知らないことを描かない）
   */
  readonly scopeOf?: (className: string) => ClassScope | undefined;
  /**
   * ユーザーが動かした位置（クラス名 → 左上）。**自動配置より優先する。**
   * 動かした箱だけ入っていればよい
   */
  readonly positions?: Readonly<Record<string, { x: number; y: number }>>;
  readonly onMove?: (name: string, at: { x: number; y: number }) => void;
  /**
   * 自動配置の仕方。
   *  - 'force'  … 力学で2次元に置く。近い概念が近くに来る（既定）
   *  - 'column' … 集約ごとに列。境界がまっすぐ読める代わりに横に長い
   */
  readonly mode?: 'force' | 'column';
};

/** そのクラスが属する世界線スコープ */
export type ClassScope = {
  /** スコープID。`Schedule:<id>` のような形 */
  readonly scopeId: string;
  /** その世界での立場 */
  readonly role: 'live' | 'pinned' | 'external';
};

export const ClassDiagramView: FC<ClassDiagramViewProps> = ({
  graph,
  options,
  selected = null,
  onSelect,
  membershipOf,
  scale = 1,
  scopeOf,
  positions,
  onMove,
  mode = 'force',
}) => {
  const o: LayoutOptions = useMemo(
    () => ({ ...DEFAULT_LAYOUT_OPTIONS, ...options }),
    [options]
  );
  /**
   * クラス名 → その**世界線スコープ**。
   *
   * ★ 記述子に登録されている型だけでは足りない。集約の部品（`ShiftAssignment` など）は
   *   登録されていないが、根と一緒に保存され、一緒に巻き戻る。つまり**同じ世界の中に居る**。
   *   だから「その集約の根が live な世界」をそのまま部品にも配る。
   */
  const scopeMembers = useMemo(() => {
    const out = new Map<string, string>();
    if (!scopeOf) return out;
    const owner = assignAggregates(graph);
    for (const c of graph.classes) {
      const root = owner.get(c.name);
      const s = root ? scopeOf(root) : undefined;
      if (s?.role === 'live') out.set(c.name, s.scopeId);
    }
    return out;
  }, [graph, scopeOf]);

  /**
   * 焼き付けの写し。**外の台帳と世界の中の両方に置く**ための指定。
   *
   * 片方にしか描かないとどちらかが嘘になる。枠の中だけなら外の台帳にも居ることが消え、
   * 枠の外だけならその世界に載っていることが消える。
   */
  const echoes = useMemo(() => {
    if (!scopeOf) return [];
    const liveOf = new Map<string, string>();
    for (const c of graph.classes) {
      const s = scopeOf(c.name);
      if (s?.role === 'live' && !liveOf.has(s.scopeId)) liveOf.set(s.scopeId, c.name);
    }
    return graph.classes
      .map((c) => ({ c, s: scopeOf(c.name) }))
      .filter((x) => x.s?.role === 'pinned' && liveOf.has(x.s.scopeId))
      .map((x) => {
        const scopeId = (x.s as ClassScope).scopeId;
        return {
          of: x.c.name,
          scopeId,
          near: liveOf.get(scopeId) as string,
          // この世界の中に居るものから伸びる線は、外の箱ではなく写しにつなぐ
          members: [...scopeMembers].filter(([, id]) => id === scopeId).map(([n]) => n),
        };
      });
  }, [graph.classes, scopeOf, scopeMembers]);

  const auto = useMemo(
    () =>
      mode === 'column'
        ? layoutClassDiagram(graph, o, echoes)
        : // 世界線スコープも「近づけるまとまり」として渡す。同じ世界に載るものは
          // つながりが無くても寄るので、枠が細長くならない
          layoutClassDiagramByForce(
            graph,
            o,
            {},
            (name) => scopeMembers.get(name),
            echoes
          ),
    [graph, o, mode, scopeMembers, echoes]
  );
  // ユーザーが動かした箱はその位置に置き、線と大きさを引き直す。
  // 自動配置を捨てずに**上から重ねる**ので、動かしていない箱はそのまま
  const layout = useMemo(
    () =>
      positions && Object.keys(positions).length > 0
        ? finishLayout(
            graph,
            auto.boxes.map((b) => (positions[b.name] ? { ...b, ...positions[b.name] } : b))
          )
        : auto,
    [auto, graph, positions]
  );
  const [hover, setHover] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const grab = useRef<{ dx: number; dy: number } | null>(null);
  const focus = hover ?? selected;

  /** 画面の座標を図の座標に直す（倍率と viewBox を通す） */
  const toDiagram = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * (svgRef.current?.viewBox.baseVal.width ?? 1),
      y: ((clientY - rect.top) / rect.height) * (svgRef.current?.viewBox.baseVal.height ?? 1),
    };
  }, []);

  const onPointerDownBox = useCallback(
    (name: string, e: React.PointerEvent) => {
      const box = layout.boxes.find((b) => b.name === name);
      if (!box || !onMove) return;
      const at = toDiagram(e.clientX, e.clientY);
      grab.current = { dx: at.x - box.x, dy: at.y - box.y };
      setDragging(name);
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [layout.boxes, onMove, toDiagram]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !grab.current || !onMove) return;
      const at = toDiagram(e.clientX, e.clientY);
      onMove(dragging, {
        x: Math.max(0, Math.round(at.x - grab.current.dx)),
        y: Math.max(0, Math.round(at.y - grab.current.dy)),
      });
    },
    [dragging, onMove, toDiagram]
  );

  const endDrag = useCallback(() => {
    setDragging(null);
    grab.current = null;
  }, []);

  /**
   * 世界線スコープの枠。**その世界に一緒に載って、一緒に巻き戻る範囲**を囲う。
   * 集約の境界（◆実線）とは別の軸で、こちらは「保存と巻き戻しの単位」。
   *
   * 焼き付けメンバー（pinned）は外の台帳にも居るので、枠の中には入れない。
   * 囲うと「この世界のもの」に見えて嘘になる（印と線で結ぶだけにする）。
   */
  const scopeFrames = useMemo(() => {
    if (!scopeOf) return [];
    const inScope = (b: (typeof layout.boxes)[number], scopeId: string) =>
      b.echoScopeId === scopeId || (!b.echoOf && scopeMembers.get(b.name) === scopeId);
    const ids = [
      ...new Set(
        layout.boxes
          .map((b) => b.echoScopeId ?? scopeMembers.get(b.name))
          .filter((id): id is string => !!id)
      ),
    ];
    return ids
      .map((scopeId) => {
        // 写しも囲う。**焼き付けられたものは、その世界の中に居る**
        const members = layout.boxes.filter((b) => inScope(b, scopeId));
        if (members.length < 2) return null;
        const pad = 22;
        const x = Math.min(...members.map((m) => m.x)) - pad;
        const y = Math.min(...members.map((m) => m.y)) - pad - 14;
        return {
          scopeId,
          x,
          y,
          w: Math.max(...members.map((m) => m.x + m.width)) - x + pad,
          h: Math.max(...members.map((m) => m.y + m.height)) - y + pad,
          lit: focus === null || members.some((m) => m.name === focus),
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);
  }, [layout.boxes, scopeMembers, focus]);

  /** その線が、いま見ている箱に関わるか */
  const isLit = (from: string, to: string) =>
    focus === null || focus === from || focus === to;

  return (
    // ★ 実寸で描いて、容器にスクロールさせる。100% × 100% にすると、容器が図より
    //   縦に長いときに viewBox が引き伸ばされ、図が帯のように潰れる（実際に潰れた）
    <svg
      ref={svgRef}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      width={layout.width * scale}
      height={layout.height * scale}
      preserveAspectRatio="xMinYMin meet"
      style={{
        background: CLASS_DIAGRAM_PALETTE.background,
        display: 'block',
        touchAction: dragging ? 'none' : undefined,
      }}
      onClick={() => onSelect?.(null)}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
    >
      <defs>
        <marker
          id="cd-arrow"
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L8,4 L0,8 z" fill={CLASS_DIAGRAM_PALETTE.referencesLine} />
        </marker>
        <marker
          id="cd-diamond"
          viewBox="0 0 10 10"
          refX="1"
          refY="5"
          markerWidth="9"
          markerHeight="9"
          orient="auto-start-reverse"
        >
          <path d="M0,5 L5,2 L10,5 L5,8 z" fill={CLASS_DIAGRAM_PALETTE.containsLine} />
        </marker>
        <marker
          id="cd-pin"
          viewBox="0 0 6 6"
          refX="3"
          refY="3"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <rect x="1" y="1" width="4" height="4" fill={CLASS_DIAGRAM_PALETTE.scopeFrame} />
        </marker>
      </defs>

      {/*
        世界線スコープの枠。**その世界に一緒に載って、一緒に巻き戻る範囲**を囲う。
        集約の境界（◆実線）とは別の軸で、こちらは「保存と巻き戻しの単位」。
        焼き付けメンバー（pinned）は外の台帳にも居るので、枠の中には入れない
        （囲うと「この世界のもの」に見えて嘘になる）。破線で結ぶだけにする。
      */}
      {/* 枠の面は一番後ろ。箱を覆わないように */}
      {scopeFrames.map((f) => (
        <rect
          key={f.scopeId}
          x={f.x}
          y={f.y}
          width={f.w}
          height={f.h}
          rx={14}
          fill={CLASS_DIAGRAM_PALETTE.scopeFrame}
          fillOpacity={f.lit ? 0.05 : 0.02}
          stroke={CLASS_DIAGRAM_PALETTE.scopeFrame}
          strokeWidth={1.4}
          strokeDasharray="10 6"
          opacity={f.lit ? 1 : 0.35}
        />
      ))}

      {/* 集約の帯。同じ列が1つのかたまりであることを、線より先に地の色で言う */}
      {[...new Set(layout.boxes.map((b) => b.aggregate))].map((agg) => {
        const members = layout.boxes.filter((b) => b.aggregate === agg);
        if (members.length < 2) return null;
        const x = Math.min(...members.map((m) => m.x));
        const y = Math.min(...members.map((m) => m.y));
        const bottom = Math.max(...members.map((m) => m.y + m.height));
        return (
          <rect
            key={agg}
            x={x - 10}
            y={y - 10}
            width={o.boxWidth + 20}
            height={bottom - y + 20}
            rx={10}
            fill={CLASS_DIAGRAM_PALETTE.aggregateBand}
            opacity={focus === null || members.some((m) => m.name === focus) ? 0.1 : 0.04}
          />
        );
      })}

      {layout.edges.map((e, i) => {
        const lit = isLit(e.relation.from, e.relation.to);
        const contains = e.relation.kind === 'contains';
        const mx = (e.from.x + e.to.x) / 2;
        return (
          <path
            key={`${e.relation.from}-${e.relation.via}-${e.relation.to}-${i}`}
            d={`M ${e.from.x} ${e.from.y} C ${mx} ${e.from.y}, ${mx} ${e.to.y}, ${e.to.x} ${e.to.y}`}
            fill="none"
            stroke={
              contains
                ? CLASS_DIAGRAM_PALETTE.containsLine
                : CLASS_DIAGRAM_PALETTE.referencesLine
            }
            strokeWidth={lit ? 1.6 : 1}
            // 集約をまたぐ参照は破線。「別々に保存され、別々に巻き戻る」を線で言う
            strokeDasharray={contains ? undefined : '5 4'}
            opacity={lit ? 0.9 : 0.15}
            markerStart={contains ? 'url(#cd-diamond)' : undefined}
            markerEnd={contains ? undefined : 'url(#cd-arrow)'}
          >
            <title>
              {`${e.relation.from}.${e.relation.via} ${contains ? '◆内包' : '→参照'}` +
                `${e.relation.many ? '（複数）' : ''} ${e.relation.to}` +
                `\n見つけ方: ${e.relation.foundBy === 'type' ? '型から（確実）' : '命名から（推測）'}`}
            </title>
          </path>
        );
      })}

      {/*
        焼き付けの線。外の台帳の箱と、世界の中の写しを結ぶ。
        内包（◆実線・灰）とも参照（→破線・黄）とも違う**第3の線**にしてある。
        どちらでもないから: 値を持つのでも id で指すのでもなく、
        「世界が生まれた瞬間に同じ参照が焼かれて、以後そちらは動かない」という関係
      */}
      {layout.boxes
        .filter((b) => b.echoOf)
        .map((echo) => {
          const origin = layout.boxes.find((b) => b.name === echo.echoOf);
          if (!origin) return null;
          const lit = isLit(echo.echoOf as string, echo.name);
          const rightward = echo.x >= origin.x;
          const from = {
            x: origin.x + (rightward ? origin.width : 0),
            y: origin.y + origin.height / 2,
          };
          const to = { x: echo.x + (rightward ? 0 : echo.width), y: echo.y + echo.height / 2 };
          const mx = (from.x + to.x) / 2;
          return (
            <path
              key={`pin-${echo.name}`}
              d={`M ${from.x} ${from.y} C ${mx} ${from.y}, ${mx} ${to.y}, ${to.x} ${to.y}`}
              fill="none"
              stroke={CLASS_DIAGRAM_PALETTE.scopeFrame}
              strokeWidth={lit ? 2 : 1.2}
              strokeDasharray="2 4"
              strokeLinecap="round"
              opacity={lit ? 0.95 : 0.2}
              markerStart="url(#cd-pin)"
              markerEnd="url(#cd-pin)"
            >
              <title>
                {`${echo.echoOf} は ${echo.echoScopeId} の世界に焼き付けられている。` +
                  `\n同じオブジェクトが外の台帳と世界の中の両方に居て、中のほうは動かない`}
              </title>
            </path>
          );
        })}

      {layout.boxes.map((box) => (
        <ClassBoxView
          key={box.name}
          box={box}
          o={o}
          dim={focus !== null && focus !== box.name && focus !== box.echoOf}
          membership={membershipOf?.(box.name)}
          scope={scopeOf?.(box.name)}
          dragging={dragging === box.name}
          onSelect={onSelect}
          onHover={setHover}
          onPointerDownBox={onMove ? onPointerDownBox : undefined}
        />
      ))}

      {/* 枠の名前は最前面。箱の下に潜ると、どの枠か読めなくなる */}
      {scopeFrames.map((f) => (
        <text
          key={f.scopeId}
          x={f.x + 12}
          y={f.y + 15}
          fill={CLASS_DIAGRAM_PALETTE.scopeFrame}
          opacity={f.lit ? 1 : 0.4}
          style={{
            font: 'bold 11px ui-monospace, SFMono-Regular, Menlo, monospace',
            paintOrder: 'stroke',
            stroke: CLASS_DIAGRAM_PALETTE.background,
            strokeWidth: 4,
          }}
        >
          {f.scopeId} の世界
          <title>
            {`この枠の中は一緒に保存され、一緒に巻き戻る（世界線スコープ ${f.scopeId}）`}
          </title>
        </text>
      ))}
    </svg>
  );
};

const ClassBoxView: FC<{
  box: ClassBox;
  o: LayoutOptions;
  dim: boolean;
  membership?: string;
  scope?: ClassScope;
  dragging: boolean;
  onSelect?: (name: string | null) => void;
  onHover: (name: string | null) => void;
  onPointerDownBox?: (name: string, e: React.PointerEvent) => void;
}> = ({ box, o, dim, membership, scope, dragging, onSelect, onHover, onPointerDownBox }) => {
  const { cls } = box;
  const pad = o.boxPadding;
  let line = 0;
  const nextY = () => box.y + pad + o.lineHeight * ++line - 5;

  // 写しは題名だけの小さな箱。中身をもう一度書いても読むものは増えないし、
  // 同じ大きさにすると「別のクラスだ」と読めてしまう
  if (box.echoOf) {
    return (
      <g
        opacity={dim ? 0.35 : 1}
        style={{ cursor: onPointerDownBox ? (dragging ? 'grabbing' : 'grab') : 'pointer' }}
        onMouseEnter={() => onHover(box.echoOf as string)}
        onMouseLeave={() => onHover(null)}
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDownBox?.(box.name, e);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(box.echoOf as string);
        }}
      >
        <rect
          x={box.x}
          y={box.y}
          width={box.width}
          height={box.height}
          rx={6}
          fill={CLASS_DIAGRAM_PALETTE.boxFill}
          fillOpacity={0.85}
          stroke={CLASS_DIAGRAM_PALETTE.scopeFrame}
          strokeWidth={dragging ? 2.5 : 1.2}
          strokeDasharray="4 3"
        />
        <text
          x={box.x + pad}
          y={box.y + pad + o.lineHeight - 5}
          fill={CLASS_DIAGRAM_PALETTE.scopeFrame}
          style={{ font: '12px system-ui, sans-serif' }}
        >
          ▌{box.echoOf}
          <title>
            {`${box.echoOf} の焼き付け。外の台帳の ${box.echoOf} と同じもので、` +
              `この世界（${box.echoScopeId}）の中では動かない`}
          </title>
        </text>
      </g>
    );
  }

  return (
    <g
      opacity={dim ? 0.35 : 1}
      style={{ cursor: onPointerDownBox ? (dragging ? 'grabbing' : 'grab') : 'pointer' }}
      onMouseEnter={() => onHover(box.name)}
      onMouseLeave={() => onHover(null)}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDownBox?.(box.name, e);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(box.name);
      }}
    >
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        rx={6}
        fill={CLASS_DIAGRAM_PALETTE.boxFill}
        stroke={dragging ? CLASS_DIAGRAM_PALETTE.scopeFrame : kindColor(cls.kind)}
        strokeWidth={dragging ? 2.5 : cls.kind === 'aggregate' ? 2 : 1}
      />
      <text
        x={box.x + pad}
        y={nextY()}
        fill={CLASS_DIAGRAM_PALETTE.title}
        style={{ font: 'bold 13px system-ui, sans-serif' }}
      >
        {cls.name}
      </text>
      <text
        x={box.x + box.width - pad}
        y={box.y + pad + o.lineHeight - 5}
        textAnchor="end"
        fill={kindColor(cls.kind)}
        style={{ font: '10px system-ui, sans-serif' }}
      >
        {KIND_LABEL[cls.kind]}
        {membership ? ` / ${membership}` : ''}
        {scope?.role === 'pinned' && ' ▌'}
        <title>
          {scope
            ? scope.role === 'pinned'
              ? `${scope.scopeId} の世界に焼き付けられる（外の台帳にも居るので、枠の中には入れない）`
              : scope.role === 'live'
                ? `${scope.scopeId} の世界で変化する（枠の中）`
                : '世界に属さない（常にグローバル）'
            : ''}
        </title>
      </text>

      {cls.doc && (
        <text
          x={box.x + pad}
          y={nextY()}
          fill={CLASS_DIAGRAM_PALETTE.doc}
          style={{ font: '10px system-ui, sans-serif' }}
        >
          {cls.doc.length > 34 ? `${cls.doc.slice(0, 34)}…` : cls.doc}
          <title>{cls.doc}</title>
        </text>
      )}

      {cls.fields.slice(0, box.shownFields).map((f) => (
        <text
          key={f.name}
          x={box.x + pad}
          y={nextY()}
          style={{ font: '11px ui-monospace, SFMono-Regular, Menlo, monospace' }}
        >
          <tspan fill={CLASS_DIAGRAM_PALETTE.field}>
            {f.name}
            {f.optional ? '?' : ''}
          </tspan>
          <tspan fill={CLASS_DIAGRAM_PALETTE.fieldType}>
            {': '}
            {f.type.length > 22 ? `${f.type.slice(0, 22)}…` : f.type}
          </tspan>
          <title>{`${f.name}${f.optional ? '?' : ''}: ${f.type}`}</title>
        </text>
      ))}
      {cls.fields.length > box.shownFields && (
        <text
          x={box.x + pad}
          y={nextY()}
          fill={CLASS_DIAGRAM_PALETTE.doc}
          style={{ font: '10px system-ui, sans-serif' }}
        >
          …ほか {cls.fields.length - box.shownFields} 件
        </text>
      )}

      {cls.methods.slice(0, box.shownMethods).map((m) => (
        <text
          key={m.name}
          x={box.x + pad}
          y={nextY()}
          // 自分を返すメソッド＝更新。ドメインをどう動かせるかが一番の読みどころ
          fill={
            m.returnsSelf
              ? CLASS_DIAGRAM_PALETTE.methodMutating
              : CLASS_DIAGRAM_PALETTE.method
          }
          style={{ font: '11px ui-monospace, SFMono-Regular, Menlo, monospace' }}
        >
          {m.isStatic ? '⌂' : m.returnsSelf ? '↻' : '·'} {m.name}()
          <title>
            {`${m.isStatic ? 'static ' : ''}${m.name}(${m.params.join(', ')}): ${m.returns}` +
              (m.returnsSelf ? '\n自分を返す＝更新メソッド（不変）' : '')}
          </title>
        </text>
      ))}
      {cls.methods.length > box.shownMethods && (
        <text
          x={box.x + pad}
          y={nextY()}
          fill={CLASS_DIAGRAM_PALETTE.doc}
          style={{ font: '10px system-ui, sans-serif' }}
        >
          …ほか {cls.methods.length - box.shownMethods} 件
        </text>
      )}
    </g>
  );
};
