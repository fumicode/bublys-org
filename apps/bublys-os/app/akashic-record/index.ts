/**
 * AkashicRecord
 * bublysのオブジェクト保存基盤
 */

// Domain
export {
  AkashicRecord,
  getAkashicRecord,
  resetAkashicRecord,
  type AkashicRecordEvent,
  type AkashicRecordListener,
} from './domain/AkashicRecord';

// Feature (React)
export {
  AkashicRecordProvider,
  useAkashicRecord,
  useShellSync,
  useRestoreFromAkashicRecord,
} from './feature/AkashicRecordProvider';

// Re-export from hash-world-line for convenience
export { loadState } from '../hash-world-line/feature/IndexedDBStore';
export type { StateSnapshot } from '../hash-world-line/domain/StateSnapshot';
