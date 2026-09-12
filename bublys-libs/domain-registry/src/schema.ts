/**
 * ドメインスキーマの純粋層。
 *
 * DomainRegistryProvider を含む index.ts と分離し、React 依存のない
 * schema 型・レジストリ・推論だけを提供する。テストや model 層はこちらを使うと
 * DOM/React まで型解決の面倒を見なくて良い。
 */

export {
  type PrimitiveKind,
  type SchemaShape,
  type SchemaField,
  primitiveShape,
  enumShape,
  objectShape,
  arrayShape,
  shapeKindLabel,
  isLeafShape,
  walkLeafFields,
  pathToString,
  stringToPath,
  getFieldAtPath,
} from './lib/SchemaShape.js';

export { inferShape, inferShapeFromInstance } from './lib/inferShape.js';

export {
  registerSchema,
  getSchema,
  getRegisteredSchemaTypes,
} from './lib/SchemaRegistry.js';
