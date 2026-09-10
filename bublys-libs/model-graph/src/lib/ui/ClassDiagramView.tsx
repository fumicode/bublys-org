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
import { useMemo, useState, type FC } from 'react';
import type { ModelClass, ModelGraph } from '../domain/ModelGraph.js';
import {
  DEFAULT_LAYOUT_OPTIONS,
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
};

export const ClassDiagramView: FC<ClassDiagramViewProps> = ({
  graph,
  options,
  selected = null,
  onSelect,
  membershipOf,
  scale = 1,
}) => {
  const o: LayoutOptions = useMemo(
    () => ({ ...DEFAULT_LAYOUT_OPTIONS, ...options }),
    [options]
  );
  const layout = useMemo(() => layoutClassDiagram(graph, o), [graph, o]);
  const [hover, setHover] = useState<string | null>(null);
  const focus = hover ?? selected;

  /** その線が、いま見ている箱に関わるか */
  const isLit = (from: string, to: string) =>
    focus === null || focus === from || focus === to;

  return (
    // ★ 実寸で描いて、容器にスクロールさせる。100% × 100% にすると、容器が図より
    //   縦に長いときに viewBox が引き伸ばされ、図が帯のように潰れる（実際に潰れた）
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      width={layout.width * scale}
      height={layout.height * scale}
      preserveAspectRatio="xMinYMin meet"
      style={{ background: CLASS_DIAGRAM_PALETTE.background, display: 'block' }}
      onClick={() => onSelect?.(null)}
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
      </defs>

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

      {layout.boxes.map((box) => (
        <ClassBoxView
          key={box.name}
          box={box}
          o={o}
          dim={focus !== null && focus !== box.name}
          membership={membershipOf?.(box.name)}
          onSelect={onSelect}
          onHover={setHover}
        />
      ))}
    </svg>
  );
};

const ClassBoxView: FC<{
  box: ClassBox;
  o: LayoutOptions;
  dim: boolean;
  membership?: string;
  onSelect?: (name: string | null) => void;
  onHover: (name: string | null) => void;
}> = ({ box, o, dim, membership, onSelect, onHover }) => {
  const { cls } = box;
  const pad = o.boxPadding;
  let line = 0;
  const nextY = () => box.y + pad + o.lineHeight * ++line - 5;

  return (
    <g
      opacity={dim ? 0.35 : 1}
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => onHover(box.name)}
      onMouseLeave={() => onHover(null)}
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
        stroke={kindColor(cls.kind)}
        strokeWidth={cls.kind === 'aggregate' ? 2 : 1}
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
