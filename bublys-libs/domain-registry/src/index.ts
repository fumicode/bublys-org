export {
  type DomainObjectConfig,
  type DomainRegistry,
  defineDomainObjects,
  toCasRegistry,
} from './lib/DomainRegistry.js';
export { DomainRegistryProvider } from './lib/DomainRegistryProvider.js';

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
