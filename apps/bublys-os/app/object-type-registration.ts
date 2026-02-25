/**
 * オブジェクト型の登録
 * アプリケーション起動時に bubbles-ui のレジストリに型を登録する
 */
import { registerObjectType, registerObjectTypes } from "@bublys-org/bubbles-ui";
import { UserIcon, UserGroupIcon } from "@bublys-org/users-libs";
import PersonIcon from "@mui/icons-material/Person";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import { MemoIcon } from "./world-line/Memo/ui/MemoIcon";
import React from "react";

// 登録済みフラグ
let registered = false;

/**
 * オブジェクト型をレジストリに登録する
 * アプリケーション起動時に一度だけ呼び出す
 */
export const registerAppObjectTypes = (): void => {
  if (registered) return;
  registered = true;

  // アイコン付き型
  registerObjectType('User', React.createElement(UserIcon, { fontSize: 'small' }));
  registerObjectType('UserGroup', React.createElement(UserGroupIcon, { fontSize: 'small' }));
  registerObjectType('Memo', React.createElement(MemoIcon));
  registerObjectType('Staff', React.createElement(PersonIcon, { fontSize: 'small' }));
  registerObjectType('StaffAvailability', React.createElement(EventAvailableIcon, { fontSize: 'small' }));
  registerObjectType('ShiftAssignment', React.createElement(InsertDriveFileIcon, { fontSize: 'small' }));

  // 複数形（リスト用、アイコンなし）
  registerObjectTypes(['Users', 'UserGroups', 'Memos']);
};
