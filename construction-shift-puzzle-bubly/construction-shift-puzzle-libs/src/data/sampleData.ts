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
  MachineRequest,
  WorkingDay,
} from "@bublys-org/construction-shift-puzzle-model";
import { MAIN_BOARD_ID } from "../objects/constructionObjects.js";

export function createSampleSites(): Site[] {
  return [
    new Site({ id: "site-a", name: "A現場（駅前ビル）", position: { x: 0, y: 0 } }),
    new Site({ id: "site-b", name: "B現場（河川護岸）", position: { x: 3.2, y: 1.5 } }),
    new Site({ id: "site-c", name: "C現場（造成）", position: { x: 1.0, y: 3.4 } }),
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
  const machines: Machine[] = [];

  // ダンプ 1〜8番
  for (let n = 1; n <= 8; n++) {
    machines.push(new Machine({ id: `dump-${n}`, name: `ダンプ${n}番`, kind: MachineKind.Dump }));
  }
  // バックホー 0.2 ×3 / 0.45 ×3
  for (let i = 1; i <= 3; i++) {
    machines.push(new Machine({ id: `bh02-${i}`, name: `バックホー0.2 (${i})`, kind: MachineKind.Backhoe }));
  }
  for (let i = 1; i <= 3; i++) {
    machines.push(new Machine({ id: `bh045-${i}`, name: `バックホー0.45 (${i})`, kind: MachineKind.Backhoe }));
  }
  // 水中ポンプ ×3
  for (let i = 1; i <= 3; i++) {
    machines.push(new Machine({ id: `pump-${i}`, name: `水中ポンプ (${i})`, kind: MachineKind.Pump }));
  }
  // 特殊ローラー ×3
  for (let i = 1; i <= 3; i++) {
    machines.push(new Machine({ id: `roller-${i}`, name: `特殊ローラー (${i})`, kind: MachineKind.Roller }));
  }

  return machines;
}

/** 空の配置表（全社1枚。1週間分の窓） */
export function createSampleBoard(): PlacementBoard {
  return PlacementBoard.create({
    id: MAIN_BOARD_ID,
    from: WorkingDay.of(2026, 8, 1),
    to: WorkingDay.of(2026, 8, 7),
  });
}

/** サンプルの機械希望（B現場が 8/3〜8/5 にバックホー0.45 を使いたい） */
export function createSampleMachineRequests(): MachineRequest[] {
  return [
    MachineRequest.create({
      id: "req-1",
      siteId: "site-b",
      machineId: "bh045-1", // バックホー0.45 (1)
      from: WorkingDay.of(2026, 8, 3),
      to: WorkingDay.of(2026, 8, 5),
    }),
  ];
}
