/**
 * サンプルデータ（現場・社員・機械・配置表）。
 * 初回起動時に seed される。
 */
import {
  Site,
  Employee,
  Machine,
  MachineKind,
  PlacementBoard,
  WorkingDay,
} from "@bublys-org/construction-shift-puzzle-model";
import { MAIN_BOARD_ID } from "../objects/constructionObjects.js";

export function createSampleSites(): Site[] {
  return [
    new Site({ id: "site-a", name: "A現場（駅前ビル）" }),
    new Site({ id: "site-b", name: "B現場（河川護岸）" }),
    new Site({ id: "site-c", name: "C現場（造成）" }),
  ];
}

export function createSampleEmployees(): Employee[] {
  return [
    new Employee({ id: "emp-1", name: "田中", role: "職長" }),
    new Employee({ id: "emp-2", name: "佐藤", role: "オペレーター" }),
    new Employee({ id: "emp-3", name: "鈴木", role: "作業員" }),
    new Employee({ id: "emp-4", name: "高橋", role: "作業員" }),
  ];
}

export function createSampleMachines(): Machine[] {
  return [
    new Machine({ id: "mac-1", name: "ダンプ1号", kind: MachineKind.Truck }),
    new Machine({ id: "mac-2", name: "ユンボ1号", kind: MachineKind.Excavator }),
    new Machine({ id: "mac-3", name: "ラフタークレーン", kind: MachineKind.Crane }),
  ];
}

/** 空の配置表（全社1枚。1週間分の窓） */
export function createSampleBoard(): PlacementBoard {
  return PlacementBoard.create({
    id: MAIN_BOARD_ID,
    from: WorkingDay.of(2026, 8, 1),
    to: WorkingDay.of(2026, 8, 7),
  });
}
