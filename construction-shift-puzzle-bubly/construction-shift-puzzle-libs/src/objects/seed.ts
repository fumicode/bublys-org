'use client';

/**
 * サンプルデータの初回投入。
 *
 * 全オブジェクトは共有のアプリ全体スコープに載るため:
 *   - 複数バブルが個別に seed すると二重投入になりうる → モジュールフラグで一度だけ
 *   - 複数の add を同期で呼ぶと各 grow が stale graph から派生して上書きし合う
 *     → addObjects で「1回の grow」にまとめて投入する
 * 永続データがあれば（length>0）その型は投入しない。
 */
import { useEffect } from "react";
import { useCasScope } from "@bublys-org/world-line-graph";
import {
  Site,
  Employee,
  Machine,
  PlacementBoard,
  MachineRequest,
} from "@bublys-org/construction-shift-puzzle-model";
import { useObjects, APP_SCOPE_ID } from "./repository.js";
import {
  SITE_TYPE,
  EMPLOYEE_TYPE,
  MACHINE_TYPE,
  PLACEMENT_BOARD_TYPE,
  MACHINE_REQUEST_TYPE,
} from "./constructionObjects.js";
import {
  createSampleSites,
  createSampleEmployees,
  createSampleMachines,
  createSampleBoard,
  createSampleMachineRequests,
} from "../data/sampleData.js";

let seeded = false;

export function useSeedConstructionData(): void {
  const scope = useCasScope(APP_SCOPE_ID);
  const sites = useObjects<Site>(SITE_TYPE);
  const employees = useObjects<Employee>(EMPLOYEE_TYPE);
  const machines = useObjects<Machine>(MACHINE_TYPE);
  const boards = useObjects<PlacementBoard>(PLACEMENT_BOARD_TYPE);
  const requests = useObjects<MachineRequest>(MACHINE_REQUEST_TYPE);

  useEffect(() => {
    if (seeded) return;
    seeded = true;

    const items: { type: string; object: unknown }[] = [];
    if (sites.length === 0) {
      items.push(...createSampleSites().map((o) => ({ type: SITE_TYPE, object: o })));
    }
    if (employees.length === 0) {
      items.push(
        ...createSampleEmployees().map((o) => ({ type: EMPLOYEE_TYPE, object: o }))
      );
    }
    if (machines.length === 0) {
      items.push(
        ...createSampleMachines().map((o) => ({ type: MACHINE_TYPE, object: o }))
      );
    }
    if (boards.length === 0) {
      items.push({ type: PLACEMENT_BOARD_TYPE, object: createSampleBoard() });
    }
    if (requests.length === 0) {
      items.push(
        ...createSampleMachineRequests().map((o) => ({ type: MACHINE_REQUEST_TYPE, object: o }))
      );
    }
    if (items.length > 0) scope.addObjects(items); // 1回の grow でまとめて投入
    // 初回マウント時に一度だけ
  }, []);
}
