/**
 * オブジェクト型の登録
 * アプリケーション起動時に bubbles-ui のレジストリに型を登録する
 */
import { registerObjectType, registerObjectTypes } from "@bublys-org/bubbles-ui";
import {
  registerSchema,
  objectShape,
  primitiveShape,
  arrayShape,
  enumShape,
} from "@bublys-org/domain-registry";
import { UserIcon, UserGroupIcon } from "@bublys-org/users-libs";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { MemoIcon } from "./world-line/Memo/ui/MemoIcon";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
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
  registerObjectType('IgoGame', React.createElement(SportsEsportsIcon, { fontSize: 'small', sx: { color: '#dcb35c' } }));
  registerObjectType('Task', React.createElement(AssignmentIcon, { fontSize: 'small' }));
  // Staff は hotel-shift-puzzle-libs が自己登録する（objects/hotelObjects.tsx）ので、ここでは登録しない
  registerObjectType('StaffAvailability', React.createElement(EventAvailableIcon, { fontSize: 'small' }));
  registerObjectType('ShiftAssignment', React.createElement(InsertDriveFileIcon, { fontSize: 'small' }));

  // 複数形（リスト用、アイコンなし）
  registerObjectTypes(['Users', 'UserGroups', 'Memos']);

  // ドメインスキーマ（object-transformer 等が「型の中身」を引くために使う）
  registerSchema(
    'User',
    objectShape([
      { name: 'id', shape: primitiveShape('string'), required: true, label: 'ID' },
      { name: 'name', shape: primitiveShape('string'), required: true, label: '名前' },
      { name: 'birthday', shape: primitiveShape('string'), required: true, label: '誕生日' },
    ])
  );
  registerSchema(
    'UserGroup',
    objectShape([
      { name: 'id', shape: primitiveShape('string'), required: true, label: 'ID' },
      { name: 'name', shape: primitiveShape('string'), required: true, label: 'グループ名' },
      {
        name: 'userIds',
        shape: arrayShape(primitiveShape('string')),
        required: true,
        label: 'メンバー ID 一覧',
      },
    ])
  );
  registerSchema(
    'Task',
    objectShape([
      { name: 'id', shape: primitiveShape('string'), required: true, label: 'ID' },
      { name: 'title', shape: primitiveShape('string'), required: true, label: 'タイトル' },
      { name: 'description', shape: primitiveShape('string'), required: false, label: '説明' },
      {
        name: 'status',
        shape: enumShape(['todo', 'doing', 'done']),
        required: true,
        label: 'ステータス',
      },
      { name: 'createdAt', shape: primitiveShape('string'), required: true, label: '作成日時' },
      { name: 'updatedAt', shape: primitiveShape('string'), required: true, label: '更新日時' },
    ])
  );
  registerSchema(
    'Memo',
    objectShape([
      { name: 'id', shape: primitiveShape('string'), required: true, label: 'ID' },
      {
        name: 'lines',
        shape: arrayShape(primitiveShape('string')),
        required: true,
        label: 'ブロック順序（ID 配列）',
      },
      // 注: blocks は Record<blockId, MemoBlock> の動的マップなので現行 SchemaShape では表現不可
      //     配列/オブジェクトいずれとも合わないため一旦省略（将来 record kind を導入したら追加）
    ])
  );
};
