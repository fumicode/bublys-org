'use client';

/**
 * PlacementBoardGridView — 配置表グリッド（縦=現場・横=日付、ガント風）
 *
 * 純粋プレゼンテーショナル（Redux を触らず props のみ）。
 *   - 行: 現場（先頭列は現場名）、右側は日付の横軸トラック
 *   - 実割り当て: 期間バー（社員=青系・機械=橙系）。左右端ドラッグで伸縮、本体ドラッグで移動、×で削除。
 *   - 機械希望（未達）: 淡く不安定なグラデーションのアニメーションのバー。達成されると消える（実割り当てに置き換わる）。
 *   - リソースのドロップ（HTML5 DnD）: 社員/機械バブルからトラックへドロップ→その日を開始日に1日 span を作る。
 *       希望モード中の機械ドロップは希望バーを作る。既存の未達希望に一致する機械をドロップすると期間を採用して達成。
 *
 * バーの伸縮/移動は HTML5 DnD ではなく pointer 操作（保護モードや dataTransfer に依存しない）。
 * ドロップだけ HTML5 DnD（dragover は types で受理、getData は drop 時のみ）。
 */
import { FC, useMemo, useState, useRef, useEffect, useCallback, DragEvent, PointerEvent } from "react";
import styled from "styled-components";
import PersonIcon from "@mui/icons-material/Person";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CloseIcon from "@mui/icons-material/Close";
import {
  parseDragPayload,
  getDragType,
  getObjectType,
  getObjectUrl,
  setDragPayload,
  extractIdFromUrl,
  urlProps,
} from "@bublys-org/bubbles-ui";
import {
  PlacementBoard,
  ResourceRef,
  Site,
  Employee,
  Machine,
  MachineRequest,
  WorkingDay,
} from "@bublys-org/construction-shift-puzzle-model";

const SITE_COL_W = 160;
const DAY_COL_W = 96;
const LANE_H = 26;
const LANE_GAP = 4;
const TRACK_PAD = 4;
const ACCEPT_TYPES = [getDragType("Employee"), getDragType("Machine")];
const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

export type PlacementBoardGridViewProps = {
  board: PlacementBoard;
  sites: Site[];
  employees: Employee[];
  machines: Machine[];
  machineRequests: MachineRequest[];
  /** 希望モード（ON 中の機械ドロップは希望バーを作る） */
  wishMode: boolean;
  onAssignSpan: (ref: ResourceRef, siteId: string, fromKey: string, toKey: string) => void;
  onResize: (assignmentId: string, fromKey: string, toKey: string) => void;
  onMove: (assignmentId: string, siteId: string, fromKey: string, toKey: string) => void;
  onUnassign: (assignmentId: string) => void;
  onCreateWish: (machineId: string, siteId: string, fromKey: string, toKey: string) => void;
  onResizeWish: (wishId: string, fromKey: string, toKey: string) => void;
  onFulfillWish: (wish: MachineRequest) => void;
  onRemoveWish: (wishId: string) => void;
  /** 日ヘッダのダブルクリックでその日の状態ビューを開く */
  onOpenDay?: (dayKey: string) => void;
  /**
   * 日の状態ビューの URL ビルダー（app 層から注入）。
   * 日ヘッダに data-url を付け、origin-side で開いたリンクバブルの起点にする。
   */
  dayBubbleUrl?: (dayKey: string) => string;
};

type DragKind = "resize-left" | "resize-right" | "move";
type DragState = {
  itemType: "assign" | "wish";
  id: string;
  kind: DragKind;
  startClientX: number;
  origFromIdx: number;
  origToIdx: number;
  origSiteId: string;
  // preview
  fromIdx: number;
  toIdx: number;
  siteId: string;
};

export const PlacementBoardGridView: FC<PlacementBoardGridViewProps> = (props) => {
  const {
    board,
    sites,
    employees,
    machines,
    machineRequests,
    wishMode,
    onAssignSpan,
    onResize,
    onMove,
    onUnassign,
    onCreateWish,
    onResizeWish,
    onFulfillWish,
    onRemoveWish,
    onOpenDay,
    dayBubbleUrl,
  } = props;

  const days = useMemo(() => board.days(), [board]);
  const colCount = days.length;

  const idxOf = useMemo(() => {
    const m = new Map<string, number>();
    days.forEach((d, i) => m.set(d.key, i));
    return (key: string) => m.get(key) ?? 0;
  }, [days]);

  const labelOf = useMemo(() => {
    const m = new Map<string, { name: string; isMachine: boolean }>();
    for (const e of employees) m.set(`employee:${e.id}`, { name: e.name, isMachine: false });
    for (const mac of machines) m.set(`machine:${mac.id}`, { name: mac.name, isMachine: true });
    return m;
  }, [employees, machines]);

  const machineName = useMemo(() => {
    const m = new Map<string, string>();
    for (const mac of machines) m.set(mac.id, mac.name);
    return m;
  }, [machines]);

  // 本社（現場に未配置の機械）＝空き期間を span バーで表す（現場行と同じ範囲表現）
  const hqLayout = useMemo(() => {
    const raw: { machineId: string; name: string; fromIdx: number; toIdx: number }[] = [];
    for (const m of machines) {
      const ref = ResourceRef.machine(m.id);
      for (const span of board.freeSpans(ref)) {
        raw.push({
          machineId: m.id,
          name: m.name,
          fromIdx: idxOf(span.from.key),
          toIdx: idxOf(span.to.key),
        });
      }
    }
    raw.sort((a, b) => a.fromIdx - b.fromIdx || a.toIdx - b.toIdx);
    const laneEnds: number[] = [];
    const items = raw.map((it) => {
      let lane = laneEnds.findIndex((end) => end < it.fromIdx);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(it.toIdx);
      } else {
        laneEnds[lane] = it.toIdx;
      }
      return { ...it, lane };
    });
    return { items, laneCount: Math.max(1, laneEnds.length) };
  }, [board, machines, idxOf]);

  // 本社チップのドラッグ開始（現場トラックへドロップすると配備＝割り当て）
  const hqDragStart = (e: DragEvent, machineId: string, name: string) => {
    const url = getObjectUrl("Machine", machineId) ?? "";
    setDragPayload(
      e,
      { type: getDragType("Machine"), url, label: name, objectId: machineId },
      { effectAllowed: "copy" }
    );
  };

  // 重複配置セット: `${refKey}\n${dayKey}`
  const conflictSet = useMemo(() => {
    const s = new Set<string>();
    for (const c of board.conflicts()) s.add(`${c.ref.key}\n${c.day.key}`);
    return s;
  }, [board]);

  // 達成済み希望の判定
  const isFulfilled = useCallback(
    (w: MachineRequest) =>
      board.coversResource(ResourceRef.machine(w.machineId), w.siteId, w.range()),
    [board]
  );

  // 現場ごとの未達希望
  const wishesBySite = useMemo(() => {
    const m = new Map<string, MachineRequest[]>();
    for (const w of machineRequests) {
      if (isFulfilled(w)) continue;
      const arr = m.get(w.siteId) ?? [];
      arr.push(w);
      m.set(w.siteId, arr);
    }
    return m;
  }, [machineRequests, isFulfilled]);

  // --- pointer によるバー伸縮/移動 ---
  const [drag, setDrag] = useState<DragState | null>(null);
  const trackRefs = useRef(new Map<string, HTMLDivElement>());

  const siteAtY = useCallback((clientY: number): string | null => {
    for (const [siteId, el] of trackRefs.current) {
      const r = el.getBoundingClientRect();
      if (clientY >= r.top && clientY <= r.bottom) return siteId;
    }
    return null;
  }, []);

  useEffect(() => {
    if (!drag) return;
    const onMoveEvt = (e: globalThis.PointerEvent) => {
      const delta = Math.round((e.clientX - drag.startClientX) / DAY_COL_W);
      setDrag((d) => {
        if (!d) return d;
        let { fromIdx, toIdx, siteId } = d;
        if (d.kind === "resize-right") {
          toIdx = Math.min(Math.max(d.origToIdx + delta, d.origFromIdx), colCount - 1);
          fromIdx = d.origFromIdx;
        } else if (d.kind === "resize-left") {
          fromIdx = Math.max(Math.min(d.origFromIdx + delta, d.origToIdx), 0);
          toIdx = d.origToIdx;
        } else {
          const len = d.origToIdx - d.origFromIdx;
          let f = d.origFromIdx + delta;
          f = Math.min(Math.max(f, 0), colCount - 1 - len);
          fromIdx = f;
          toIdx = f + len;
          siteId = siteAtY(e.clientY) ?? d.siteId;
        }
        return { ...d, fromIdx, toIdx, siteId };
      });
    };
    const onUp = () => {
      setDrag((d) => {
        if (d) commitDrag(d);
        return null;
      });
    };
    window.addEventListener("pointermove", onMoveEvt);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMoveEvt);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null, colCount]);

  const commitDrag = (d: DragState) => {
    const fromKey = days[d.fromIdx].key;
    const toKey = days[d.toIdx].key;
    if (d.itemType === "assign") {
      if (d.kind === "move" && d.siteId !== d.origSiteId) {
        onMove(d.id, d.siteId, fromKey, toKey);
      } else if (d.kind === "move") {
        onMove(d.id, d.origSiteId, fromKey, toKey);
      } else {
        onResize(d.id, fromKey, toKey);
      }
    } else {
      // 希望は伸縮のみ（移動は現状同現場内でのシフト）
      onResizeWish(d.id, fromKey, toKey);
    }
  };

  const startDrag = (
    e: PointerEvent,
    itemType: "assign" | "wish",
    id: string,
    kind: DragKind,
    fromIdx: number,
    toIdx: number,
    siteId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag({
      itemType,
      id,
      kind,
      startClientX: e.clientX,
      origFromIdx: fromIdx,
      origToIdx: toIdx,
      origSiteId: siteId,
      fromIdx,
      toIdx,
      siteId,
    });
  };

  // --- HTML5 ドロップ ---
  const handleDragOver = (e: DragEvent) => {
    const types = Array.from(e.dataTransfer.types);
    if (!ACCEPT_TYPES.some((t) => types.includes(t))) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, siteId: string) => {
    const payload = parseDragPayload(e, { acceptTypes: ACCEPT_TYPES });
    if (!payload) return;
    e.preventDefault();
    e.stopPropagation();
    const kind = getObjectType(payload.type); // 'employee' | 'machine'
    const id = payload.objectId ?? extractIdFromUrl(payload.url);
    if (!id || !kind) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const idx = Math.min(Math.max(Math.floor((e.clientX - rect.left) / DAY_COL_W), 0), colCount - 1);
    const dayKey = days[idx].key;

    if (kind === "machine") {
      // 既存の未達希望（同機械・同現場・その日を含む）に落としたら期間を採用して達成
      const wish = (wishesBySite.get(siteId) ?? []).find(
        (w) => w.machineId === id && w.range().contains(WorkingDay.fromKey(dayKey))
      );
      if (wish && !wishMode) {
        onFulfillWish(wish);
        return;
      }
      if (wishMode) {
        onCreateWish(id, siteId, dayKey, dayKey);
        return;
      }
      onAssignSpan(ResourceRef.machine(id), siteId, dayKey, dayKey);
      return;
    }
    // 社員は希望対象外。常に割り当て。
    onAssignSpan(ResourceRef.employee(id), siteId, dayKey, dayKey);
  };

  // --- レイアウト計算 ---
  type Item =
    | { itemType: "assign"; id: string; ref: ResourceRef; fromIdx: number; toIdx: number; lane: number }
    | { itemType: "wish"; id: string; machineId: string; fromIdx: number; toIdx: number; lane: number };
  // ユニオンの各メンバに分配して lane を除く（Omit だと判別ユニオンが潰れるため）
  type RawItem = Item extends infer T ? (T extends Item ? Omit<T, "lane"> : never) : never;

  /** 1バンド分を貪欲レーンパッキングし、lane に laneOffset を足す。使用レーン数も返す */
  const packBand = (
    band: RawItem[],
    laneOffset: number
  ): { items: Item[]; laneCount: number } => {
    band.sort((a, b) => a.fromIdx - b.fromIdx || a.toIdx - b.toIdx);
    const laneEnds: number[] = [];
    const items = band.map((it) => {
      let lane = laneEnds.findIndex((end) => end < it.fromIdx);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(it.toIdx);
      } else {
        laneEnds[lane] = it.toIdx;
      }
      return { ...it, lane: lane + laneOffset } as Item;
    });
    return { items, laneCount: laneEnds.length };
  };

  const isMachineItem = (it: RawItem): boolean =>
    it.itemType === "wish" || (it.itemType === "assign" && it.ref.isMachine);

  const buildItems = (
    siteId: string
  ): { items: Item[]; laneCount: number; peopleLanes: number } => {
    // 人（上段）と機械＋機械希望（下段）に分けて集める
    const people: RawItem[] = [];
    const machinesBand: RawItem[] = [];
    for (const a of board.assignmentsForSite(siteId)) {
      const it: RawItem = {
        itemType: "assign",
        id: a.id,
        ref: a.ref,
        fromIdx: idxOf(a.range.from.key),
        toIdx: idxOf(a.range.to.key),
      } as RawItem;
      (a.ref.isMachine ? machinesBand : people).push(it);
    }
    for (const w of wishesBySite.get(siteId) ?? []) {
      const r = w.range();
      machinesBand.push({
        itemType: "wish",
        id: w.id,
        machineId: w.machineId,
        fromIdx: idxOf(r.from.key),
        toIdx: idxOf(r.to.key),
      } as RawItem);
    }

    const applyPreview = (arr: RawItem[]) =>
      arr.map((it) =>
        drag && drag.id === it.id ? { ...it, fromIdx: drag.fromIdx, toIdx: drag.toIdx } : it
      );
    let people2 = applyPreview(people);
    let machines2 = applyPreview(machinesBand);

    // このトラックへ移動プレビュー中の別現場アイテム（＝割り当て）を、種別に応じたバンドへ入れる
    const alreadyHere =
      people2.some((it) => it.id === drag?.id) || machines2.some((it) => it.id === drag?.id);
    if (drag && drag.kind === "move" && drag.siteId === siteId && !alreadyHere) {
      const moving = findItemById(drag.id);
      if (moving) {
        const previewed = { ...moving, fromIdx: drag.fromIdx, toIdx: drag.toIdx };
        if (isMachineItem(previewed)) machines2 = [...machines2, previewed];
        else people2 = [...people2, previewed];
      }
    }

    const peoplePacked = packBand(people2, 0);
    const machinesPacked = packBand(machines2, peoplePacked.laneCount);
    const laneCount = Math.max(1, peoplePacked.laneCount + machinesPacked.laneCount);
    return {
      items: [...peoplePacked.items, ...machinesPacked.items],
      laneCount,
      peopleLanes: peoplePacked.laneCount,
    };
  };

  const findItemById = (id: string): RawItem | null => {
    for (const a of board.assignments) {
      if (a.id === id)
        return {
          itemType: "assign",
          id: a.id,
          ref: a.ref,
          fromIdx: idxOf(a.range.from.key),
          toIdx: idxOf(a.range.to.key),
        } as RawItem;
    }
    return null;
  };

  const trackWidth = colCount * DAY_COL_W;

  return (
    <StyledWrap>
      <div className="e-scroll">
        {/* ヘッダ */}
        <div className="e-headrow">
          <div className="e-corner" style={{ width: SITE_COL_W }}>
            現場 \ 日付
          </div>
          <div className="e-headtrack" style={{ width: trackWidth }}>
            {days.map((d, i) => {
              const wd = d.weekday;
              return (
                <div
                  key={d.key}
                  className={`e-dayhead${wd === 0 ? " e-sun" : ""}${wd === 6 ? " e-sat" : ""}${onOpenDay ? " e-clickable" : ""}`}
                  style={{ left: i * DAY_COL_W, width: DAY_COL_W }}
                  onDoubleClick={onOpenDay ? () => onOpenDay(d.key) : undefined}
                  title={onOpenDay ? "ダブルクリックでこの日の状態を表示" : undefined}
                  {...(dayBubbleUrl ? urlProps(dayBubbleUrl(d.key)) : {})}
                >
                  <div className="e-daylabel">{d.label}</div>
                  <div className="e-weekday">{WEEKDAY_JA[wd]}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 現場行 */}
        {sites.length === 0 ? (
          <div className="e-empty">現場がありません（「現場」メニューから追加してください）</div>
        ) : (
          sites.map((site) => {
            const { items, laneCount, peopleLanes } = buildItems(site.id);
            const trackHeight = laneCount * LANE_H + (laneCount - 1) * LANE_GAP + TRACK_PAD * 2;
            // 人（上段）と機械（下段）の境界線の y。両バンドが存在するときだけ引く
            const showDivider = peopleLanes > 0 && peopleLanes < laneCount;
            const dividerTop =
              TRACK_PAD + peopleLanes * LANE_H + (peopleLanes - 0.5) * LANE_GAP;
            return (
              <div className="e-siterow" key={site.id}>
                <div className="e-sitehead" style={{ width: SITE_COL_W }} title={site.name}>
                  {site.name}
                </div>
                <div
                  className="e-track"
                  style={{ width: trackWidth, height: trackHeight }}
                  ref={(el) => {
                    if (el) trackRefs.current.set(site.id, el);
                    else trackRefs.current.delete(site.id);
                  }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, site.id)}
                >
                  {/* 日ごとの縦罫と週末色 */}
                  {days.map((d, i) => (
                    <div
                      key={d.key}
                      className={`e-daycol${d.weekday === 0 ? " e-sun" : ""}${d.weekday === 6 ? " e-sat" : ""}`}
                      style={{ left: i * DAY_COL_W, width: DAY_COL_W }}
                    />
                  ))}

                  {/* 人（上段）と機械（下段）の境界線 */}
                  {showDivider && (
                    <div className="e-banddivider" style={{ top: dividerTop, width: trackWidth }} />
                  )}

                  {/* バー */}
                  {items.map((it) => {
                    const left = it.fromIdx * DAY_COL_W + 2;
                    const width = (it.toIdx - it.fromIdx + 1) * DAY_COL_W - 4;
                    const top = TRACK_PAD + it.lane * (LANE_H + LANE_GAP);
                    if (it.itemType === "wish") {
                      const name = machineName.get(it.machineId) ?? it.machineId;
                      return (
                        <div
                          key={`w-${it.id}`}
                          className="e-bar e-wish"
                          style={{ left, width, top, height: LANE_H }}
                          title={`${name}（希望）`}
                        >
                          <span
                            className="e-handle e-left"
                            onPointerDown={(e) =>
                              startDrag(e, "wish", it.id, "resize-left", it.fromIdx, it.toIdx, site.id)
                            }
                          />
                          <span className="e-barbody">
                            <LocalShippingIcon className="e-baricon" />
                            <span className="e-barname">{name}（希望）</span>
                            <CloseIcon className="e-barx" onPointerDown={(e) => e.stopPropagation()} onClick={() => onRemoveWish(it.id)} />
                          </span>
                          <span
                            className="e-handle e-right"
                            onPointerDown={(e) =>
                              startDrag(e, "wish", it.id, "resize-right", it.fromIdx, it.toIdx, site.id)
                            }
                          />
                        </div>
                      );
                    }
                    const info = labelOf.get(it.ref.key);
                    const name = info?.name ?? it.ref.id;
                    // 期間内に重複配置日があるか
                    let conflicted = false;
                    for (let i = it.fromIdx; i <= it.toIdx; i++) {
                      if (conflictSet.has(`${it.ref.key}\n${days[i].key}`)) {
                        conflicted = true;
                        break;
                      }
                    }
                    return (
                      <div
                        key={`a-${it.id}`}
                        className={`e-bar ${info?.isMachine ? "e-machine" : "e-employee"}${conflicted ? " e-conflict" : ""}`}
                        style={{ left, width, top, height: LANE_H }}
                        title={conflicted ? `${name}（重複配置）` : name}
                      >
                        <span
                          className="e-handle e-left"
                          onPointerDown={(e) =>
                            startDrag(e, "assign", it.id, "resize-left", it.fromIdx, it.toIdx, site.id)
                          }
                        />
                        <span
                          className="e-barbody e-movable"
                          onPointerDown={(e) =>
                            startDrag(e, "assign", it.id, "move", it.fromIdx, it.toIdx, site.id)
                          }
                        >
                          {info?.isMachine ? (
                            <LocalShippingIcon className="e-baricon" />
                          ) : (
                            <PersonIcon className="e-baricon" />
                          )}
                          <span className="e-barname">{name}</span>
                          <CloseIcon
                            className="e-barx"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => onUnassign(it.id)}
                          />
                        </span>
                        <span
                          className="e-handle e-right"
                          onPointerDown={(e) =>
                            startDrag(e, "assign", it.id, "resize-right", it.fromIdx, it.toIdx, site.id)
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {/* 本社行（現場に未配置の機械＝空き）。一番下に置く。空き期間を span バーで表す。 */}
        <div className="e-siterow e-hqrow">
          <div className="e-sitehead e-hqhead" style={{ width: SITE_COL_W }} title="現場に配置されていない機械">
            🏢 本社
          </div>
          <div
            className="e-track e-hqtrack"
            style={{
              width: trackWidth,
              height:
                hqLayout.laneCount * LANE_H +
                (hqLayout.laneCount - 1) * LANE_GAP +
                TRACK_PAD * 2,
            }}
          >
            {days.map((d, i) => (
              <div
                key={d.key}
                className={`e-daycol${d.weekday === 0 ? " e-sun" : ""}${d.weekday === 6 ? " e-sat" : ""}`}
                style={{ left: i * DAY_COL_W, width: DAY_COL_W }}
              />
            ))}
            {hqLayout.items.map((it) => {
              const left = it.fromIdx * DAY_COL_W + 2;
              const width = (it.toIdx - it.fromIdx + 1) * DAY_COL_W - 4;
              const top = TRACK_PAD + it.lane * (LANE_H + LANE_GAP);
              return (
                <div
                  key={`${it.machineId}-${it.fromIdx}`}
                  className="e-bar e-hqbar"
                  style={{ left, width, top, height: LANE_H }}
                  draggable
                  onDragStart={(e) => hqDragStart(e, it.machineId, it.name)}
                  title={`${it.name}（本社・ドラッグで現場へ配備）`}
                >
                  <span className="e-barbody">
                    <LocalShippingIcon className="e-baricon" />
                    <span className="e-barname">{it.name}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </StyledWrap>
  );
};

const StyledWrap = styled.div`
  padding: 4px;

  .e-scroll {
    overflow-x: auto;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    background: #fff;
    width: 100%;
  }

  .e-headrow,
  .e-siterow {
    display: flex;
    min-width: max-content;
  }

  .e-corner,
  .e-sitehead {
    flex: 0 0 auto;
    box-sizing: border-box;
    border-right: 1px solid #e6e6e6;
    border-bottom: 1px solid #eee;
    position: sticky;
    left: 0;
    z-index: 3;
    background: #f7f9fc;
  }
  .e-corner {
    font-size: 0.75em;
    color: #888;
    padding: 6px 8px;
    display: flex;
    align-items: flex-end;
  }
  .e-sitehead {
    font-weight: bold;
    font-size: 0.85em;
    padding: 6px 8px;
    display: flex;
    align-items: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .e-headtrack {
    position: relative;
    height: 34px;
    border-bottom: 1px solid #eee;
    flex: 0 0 auto;

    .e-dayhead {
      position: absolute;
      top: 0;
      height: 100%;
      box-sizing: border-box;
      border-right: 1px solid #f0f0f0;
      text-align: center;
      padding-top: 3px;
      .e-daylabel { font-weight: bold; font-size: 0.82em; }
      .e-weekday { font-size: 0.68em; color: #aaa; }
      &.e-sun .e-daylabel, &.e-sun .e-weekday { color: #d32f2f; }
      &.e-sat .e-daylabel, &.e-sat .e-weekday { color: #1976d2; }
      &.e-clickable { cursor: pointer; }
      &.e-clickable:hover { background: #eef2f8; }
    }
  }

  /* 本社行 */
  .e-hqrow {
    .e-hqhead {
      background: #eceff1;
      color: #455a64;
    }
    .e-hqtrack {
      background: #fafbfc;
    }
  }
  .e-bar.e-hqbar {
    background: #eceff1;
    color: #455a64;
    border: 1px solid #cfd8dc;
    cursor: grab;
    .e-barbody { cursor: grab; }
  }

  .e-track {
    position: relative;
    flex: 0 0 auto;
    border-bottom: 1px solid #eee;

    .e-daycol {
      position: absolute;
      top: 0;
      height: 100%;
      box-sizing: border-box;
      border-right: 1px solid #f2f2f2;
      &.e-sun { background: rgba(211, 47, 47, 0.04); }
      &.e-sat { background: rgba(25, 118, 210, 0.04); }
    }

    /* 人（上段）と機械（下段）の境界 */
    .e-banddivider {
      position: absolute;
      left: 0;
      height: 0;
      border-top: 1px dashed #d8d8d8;
      pointer-events: none;
      z-index: 1;
    }
  }

  .e-empty {
    padding: 20px;
    text-align: center;
    color: #888;
  }

  .e-bar {
    position: absolute;
    box-sizing: border-box;
    display: flex;
    align-items: stretch;
    border-radius: 6px;
    font-size: 0.74em;
    overflow: hidden;
    user-select: none;

    .e-barbody {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 3px;
      padding: 0 4px;
      &.e-movable { cursor: grab; }
    }
    .e-baricon { font-size: 14px; flex-shrink: 0; }
    .e-barname {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .e-barx {
      font-size: 14px;
      cursor: pointer;
      opacity: 0.5;
      flex-shrink: 0;
      &:hover { opacity: 1; color: #d32f2f; }
    }
    .e-handle {
      flex: 0 0 6px;
      cursor: ew-resize;
      background: rgba(0, 0, 0, 0.08);
    }
    &:hover .e-handle { background: rgba(0, 0, 0, 0.18); }

    &.e-employee {
      background: #e8f0fe;
      color: #1a3c6e;
      border: 1px solid #7aa7f0;
    }
    &.e-machine {
      background: #fff3e0;
      color: #7a4a00;
      border: 1px solid #ffb74d;
    }
    &.e-conflict {
      border-color: #d32f2f;
      box-shadow: 0 0 0 1px #d32f2f inset;
    }
  }

  /* 機械希望（未達）: 淡く不安定なグラデーションのアニメーション */
  .e-bar.e-wish {
    color: #7a4a00;
    border: 1px dashed rgba(255, 152, 0, 0.6);
    background: linear-gradient(
      90deg,
      rgba(255, 152, 0, 0.06),
      rgba(255, 152, 0, 0.30),
      rgba(255, 193, 7, 0.12),
      rgba(255, 152, 0, 0.30),
      rgba(255, 152, 0, 0.06)
    );
    background-size: 300% 100%;
    animation: wishFlow 3.6s ease-in-out infinite, wishPulse 2.3s ease-in-out infinite;

    .e-barname { font-style: italic; opacity: 0.85; }
    .e-handle { background: rgba(255, 152, 0, 0.18); }
  }

  @keyframes wishFlow {
    0% { background-position: 0% 0; }
    50% { background-position: 100% 0; }
    100% { background-position: 0% 0; }
  }
  @keyframes wishPulse {
    0%, 100% { opacity: 0.55; }
    50% { opacity: 0.92; }
  }
`;
