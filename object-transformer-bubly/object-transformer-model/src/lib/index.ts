export { DomainSchema } from "./DomainSchema.js";
export type { DomainSchemaState } from "./DomainSchema.js";

export { MappingRule } from "./MappingRule.js";
export type {
  MappingRuleState,
  FieldMapping,
  ValueTransform,
} from "./MappingRule.js";

export {
  applyMappingRule,
  applyTransform,
  getAtPath,
  setAtPath,
} from "./transform.js";
export type { PlaneObjectLike } from "./transform.js";

export { suggestMappings } from "./suggest.js";
export type { SourceLeaf } from "./suggest.js";

export { validateMapping } from "./validate.js";
export type { ValidationResult } from "./validate.js";

// 再エクスポート: domain-registry のスキーマ共通型を model からも触れるように
export type {
  SchemaShape,
  SchemaField,
  PrimitiveKind,
} from "@bublys-org/domain-registry/schema";
export {
  primitiveShape,
  enumShape,
  objectShape,
  arrayShape,
  walkLeafFields,
  pathToString,
  stringToPath,
  isLeafShape,
  shapeKindLabel,
  inferShape,
  inferShapeFromInstance,
  registerSchema,
  getSchema,
} from "@bublys-org/domain-registry/schema";
