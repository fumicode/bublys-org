export { DomainSchema } from "./DomainSchema.js";
export type {
  DomainSchemaState,
  SchemaProperty,
  PropertyType,
} from "./DomainSchema.js";

export { MappingRule } from "./MappingRule.js";
export type {
  MappingRuleState,
  FieldMapping,
  ValueTransform,
} from "./MappingRule.js";

export { applyMappingRule, applyTransform } from "./transform.js";
export type { PlaneObjectLike } from "./transform.js";

export { suggestMappings } from "./suggest.js";

export { validateMapping } from "./validate.js";
export type { ValidationResult } from "./validate.js";

export { STAFF_SCHEMA } from "./schemas/staff-schema.js";
