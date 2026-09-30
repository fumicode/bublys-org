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
  type FieldRole,
  FIELD_ROLES,
  primitiveShape,
  enumShape,
  objectShape,
  arrayShape,
  recordShape,
  ELEMENT_SUFFIX,
  elementStep,
  isElementStep,
  arrayNameOf,
  shapeKindLabel,
  isLeafShape,
  walkLeafFields,
  pathToString,
  stringToPath,
  getFieldAtPath,
} from './lib/SchemaShape.js';

export { inferShape, inferShapeFromInstance } from './lib/inferShape.js';

/** 役から値を引く（`docs/bubly-composition.md` の 2 節） */
export {
  getRoleField,
  readRole,
  readRoleText,
  readRoleNumber,
  hasRole,
  readLatLng,
  objectRefShape,
  readPlaceRef,
  collectPlaces,
  collectByRole,
  type FoundPlace,
  type FoundObject,
} from './lib/roles.js';

export {
  registerSchema,
  getSchema,
  getRegisteredSchemaTypes,
} from './lib/SchemaRegistry.js';
