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
