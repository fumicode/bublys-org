/**
 * users バブリが自分で名乗る ── 型（アイコン）と、その中身の形（スキーマ）。
 *
 * ★ **名乗るのは持ち主。** 前は OS の `app/object-type-registration.ts` に
 *   全バブリぶんが手書きで並んでいた。持ち主でない所に申告があると、
 *   モデルに項目を足しても申告だけが古いまま残る（実測：タスクの担当者）。
 *   バブリを外して配っても、自分の型は自分で名乗れる。
 * ★ 読むのは `index.ts` からの**副作用の import** 1 回だけ（csv-importer と同じ形）。
 *
 * 型（`registerObjectType`）を登録しないと、宇宙やポケットが「知らない型」として
 * 受け取らない。形（`registerSchema`）を登録しないと、変換エディタが項目を出せない。
 */
import { registerObjectType, registerObjectTypes } from "@bublys-org/bubbles-ui";
import { registerSchema } from "@bublys-org/domain-registry/schema";
import React from "react";
import { UserIcon, UserGroupIcon } from "./ui/UserIcon.js";
import { USER_SHAPE } from "./domain/User.domain.js";
import { USER_GROUP_SHAPE } from "./domain/UserGroup.domain.js";

registerObjectType("User", React.createElement(UserIcon, { fontSize: "small" }));
registerObjectType("UserGroup", React.createElement(UserGroupIcon, { fontSize: "small" }));

/** 一覧として見たときの型（アイコンは要らない） */
registerObjectTypes(["Users", "UserGroups"]);

registerSchema("User", USER_SHAPE);
registerSchema("UserGroup", USER_GROUP_SHAPE);
