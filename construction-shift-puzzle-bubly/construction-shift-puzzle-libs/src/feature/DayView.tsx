'use client';

/**
 * DayView — ある1日の状態ビューの Redux コネクター。
 *
 * 配置表・現場・社員・機械を取得し、指定日の各現場の在場リソースと現場間距離を計算して
 * DaySiteMapView に渡す。現場に未配置の機械は本社（HQ）の円にまとめて表示する。
 */
import { FC, useMemo } from "react";
import {
  PlacementBoard,
  Site,
  Employee,
  Machine,
  ResourceRef,
  WorkingDay,
} from "@bublys-org/construction-shift-puzzle-model";
import { DaySiteMapView, type DayCircle, type DayDistance } from "../ui/DaySiteMapView.js";
import { useObjects, useObject } from "../objects/repository.js";
import { useSeedConstructionData } from "../objects/seed.js";
import {
  SITE_TYPE,
  EMPLOYEE_TYPE,
  MACHINE_TYPE,
  PLACEMENT_BOARD_TYPE,
  MAIN_BOARD_ID,
} from "../objects/constructionObjects.js";

/** 本社の地図上の位置（現場の座標系に合わせた km 相当） */
const HQ_POSITION = { x: -1.6, y: 1.6 };

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

type DayViewProps = {
  dayKey: string;
  boardId?: string;
};

export const DayView: FC<DayViewProps> = ({ dayKey, boardId = MAIN_BOARD_ID }) => {
  useSeedConstructionData();
  const sites = useObjects<Site>(SITE_TYPE);
  const employees = useObjects<Employee>(EMPLOYEE_TYPE);
  const machines = useObjects<Machine>(MACHINE_TYPE);
  const board = useObject<PlacementBoard>(PLACEMENT_BOARD_TYPE, boardId);

  const day = WorkingDay.fromKey(dayKey);
  const dayLabel = `${day.label}（${WEEKDAY_JA[day.weekday]}）`;

  const { circles, distances } = useMemo(() => {
    const empName = new Map(employees.map((e) => [e.id, e.name]));
    const macName = new Map(machines.map((m) => [m.id, m.name]));
    const nameOf = (ref: ResourceRef) =>
      (ref.isMachine ? macName.get(ref.id) : empName.get(ref.id)) ?? ref.id;

    const siteCircles: DayCircle[] = sites.map((s) => {
      const refs = board ? board.resourcesOn(s.id, day) : [];
      return {
        id: s.id,
        name: s.name,
        kind: "site",
        x: s.position.x,
        y: s.position.y,
        employees: refs.filter((r) => r.isEmployee).map(nameOf),
        machines: refs.filter((r) => r.isMachine).map(nameOf),
      };
    });

    // 本社（現場に未配置の機械）
    const machineRefs = machines.map((m) => ResourceRef.machine(m.id));
    const freeMachines = board ? board.freeResourcesOn(day, machineRefs) : [];
    const hq: DayCircle = {
      id: "__hq__",
      name: "本社",
      kind: "hq",
      x: HQ_POSITION.x,
      y: HQ_POSITION.y,
      employees: [],
      machines: freeMachines.map((r) => macName.get(r.id) ?? r.id),
    };

    // 現場どうしの距離（現場間のみ）
    const dist: DayDistance[] = [];
    for (let i = 0; i < sites.length; i++) {
      for (let j = i + 1; j < sites.length; j++) {
        dist.push({ fromId: sites[i].id, toId: sites[j].id, km: sites[i].distanceTo(sites[j]) });
      }
    }

    return { circles: [...siteCircles, hq], distances: dist };
  }, [sites, employees, machines, board, dayKey]);

  return <DaySiteMapView dayLabel={dayLabel} circles={circles} distances={distances} />;
};
