/**
 * モデルの構造を図にするライブラリ。
 *
 * ★ `lib/extract/` は**絶対にここから export しないこと。** `typescript` を
 *   静的 import しているので、漏れるとブラウザのバンドルにコンパイラが丸ごと入り、
 *   Jest（jsdom）からも読めなくなる。到達経路は生成コマンドとテストだけ。
 */
export * from './lib/domain/ModelGraph.js';
export {
  classNamesInType,
  isMany,
  referencedClassByNaming,
  relationsOfClass,
} from './lib/domain/relations.js';
export {
  DEFAULT_LAYOUT_OPTIONS,
  assignAggregates,
  layoutClassDiagram,
  type ClassBox,
  type ClassDiagramLayout,
  type ClassEdge,
  type LayoutOptions,
} from './lib/ui/classLayout.js';
export {
  CLASS_DIAGRAM_PALETTE,
  ClassDiagramView,
  type ClassDiagramViewProps,
} from './lib/ui/ClassDiagramView.js';
