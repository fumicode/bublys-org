'use client';

/**
 * このバブリのオブジェクト型を「1箇所」で定義する。
 *
 * 1つの型に1エントリ書くだけで:
 *   - ドラッグ&ドロップ / アイコン（registerObjects 経由）
 *   - バブルのダブルクリック展開（url を app 層で登録すれば）
 *   - 世界線記録（serialize / localScope）
 * がすべて効く。
 *
 * 注: バブル URL（開く URL のスキーム）は app 層の関心事なので、ここ（libs）では持たない。
 * オブジェクトの正規 URL は app の registration/bubbleUrls.ts が registerObjectUrl で登録する。
 */
import React from "react";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PersonIcon from "@mui/icons-material/Person";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import GridOnIcon from "@mui/icons-material/GridOn";
import {
  Site,
  Employee,
  Machine,
  PlacementBoard,
  type PlacementBoardPlain,
} from "@bublys-org/construction-shift-puzzle-model";
import { defineObjects, makeObjectsProvider } from "./framework.js";
import { localScopeId } from "./commit.js";

/** オブジェクト型名 */
export const SITE_TYPE = "Site";
export const EMPLOYEE_TYPE = "Employee";
export const MACHINE_TYPE = "Machine";
export const PLACEMENT_BOARD_TYPE = "PlacementBoard";

/** 全社で1枚の配置表の固定ID（初回は単一ボード運用） */
export const MAIN_BOARD_ID = "main";

export const CONSTRUCTION_OBJECTS = defineObjects({
  Site: {
    class: Site,
    getId: (s: Site) => s.id,
    icon: React.createElement(LocationOnIcon, { fontSize: "small" }),
    // state が完全 plain（id, name）なので serialize 省略（state 規約）
  },
  Employee: {
    class: Employee,
    getId: (e: Employee) => e.id,
    icon: React.createElement(PersonIcon, { fontSize: "small" }),
  },
  Machine: {
    class: Machine,
    getId: (m: Machine) => m.id,
    icon: React.createElement(LocalShippingIcon, { fontSize: "small" }),
  },
  PlacementBoard: {
    class: PlacementBoard,
    getId: (b: PlacementBoard) => b.id,
    icon: React.createElement(GridOnIcon, { fontSize: "small" }),
    // 入れ子にインスタンス（Assignment[] / WorkingDay）を持つので codec を明示
    serialize: {
      toJSON: (b: PlacementBoard) => b.toPlain(),
      fromJSON: (j) => PlacementBoard.fromPlain(j as PlacementBoardPlain),
    },
    // 配置表ごとのローカル世界線（自分のスコープ）＝配置編集を時間移動できる
    localScope: (b: PlacementBoard) => localScopeId(PLACEMENT_BOARD_TYPE, b.id),
  },
});

/** 世界線対象オブジェクトをまとめた Provider（バブリ全体で1つ） */
export const ConstructionObjectsProvider = makeObjectsProvider(CONSTRUCTION_OBJECTS);
