/**
 * オブジェクト型の登録
 * アプリケーション起動時に bubbles-ui のレジストリに型を登録する
 */
import { registerObjectTypes } from "@bublys-org/bubbles-ui";

// アプリケーション固有のオブジェクト型
const APP_OBJECT_TYPES = [
  'User',
  'UserGroup',
  'Memo',
  'Staff',
  'StaffAvailability',
  'ShiftAssignment',
  // 複数形（リスト用）
  'Users',
  'UserGroups',
  'Memos',
];

// 登録済みフラグ
let registered = false;

/**
 * オブジェクト型をレジストリに登録する
 * アプリケーション起動時に一度だけ呼び出す
 */
export const registerAppObjectTypes = (): void => {
  if (registered) return;
  registered = true;
  registerObjectTypes(APP_OBJECT_TYPES);
};
