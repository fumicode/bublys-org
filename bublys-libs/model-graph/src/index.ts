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
