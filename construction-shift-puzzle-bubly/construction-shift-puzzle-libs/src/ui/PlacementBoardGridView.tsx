'use client';

/**
 * PlacementBoardGridView — 配置表グリッド（縦=現場・横=日付）
 *
 * 単一の CSS Grid で表全体を描く純粋プレゼンテーショナル。Redux は触らず props のみ。
 *   - 行: 現場（先頭列は現場名）
 *   - 列: 日付
 *   - セル: その現場×その日に配置されたリソース（社員/機械）のチップ群
 *   - 配置方法:
 *       (a) 社員/機械バブルからチップを **ドラッグ&ドロップ**（HTML5 DnD / bubbles-ui）
 *       (b) セルの「＋」ボタンからピッカーで選ぶ（フォールバック）
 *       (c) セル内チップを別セルへドラッグして **移動**
 *   - 重複配置（同一リソースが同日に複数現場）はチップを赤く強調する
 */
import { FC, useMemo, useState, MouseEvent, DragEvent } from "react";
import styled from "styled-components";
import AddIcon from "@mui/icons-material/Add";
import PersonIcon from "@mui/icons-material/Person";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import CloseIcon from "@mui/icons-material/Close";
import { Menu, MenuItem, ListSubheader } from "@mui/material";
import {
  parseDragPayload,
  getDragType,
  getObjectType,
  getObjectUrl,
  setDragPayload,
  extractIdFromUrl,
} from "@bublys-org/bubbles-ui";
import {
  PlacementBoard,
  ResourceRef,
  Site,
  Employee,
  Machine,
  WorkingDay,
} from "@bublys-org/construction-shift-puzzle-model";

/** セル間移動用の独自 dataTransfer キー（移動元の現場・日付を載せる） */
const SOURCE_KEY = "text/construction-source";

/** ドロップで受理するドラッグ型（社員・機械） */
const ACCEPT_TYPES = [getDragType("Employee"), getDragType("Machine")];

export type DropSource = { siteId: string; dayKey: string };

type PlacementBoardGridViewProps = {
  board: PlacementBoard;
  sites: Site[];
  employees: Employee[];
  machines: Machine[];
  /** ピッカー/ドロップで新規配置 */
  onAssign: (ref: ResourceRef, siteId: string, dayKey: string) => void;
  onUnassign: (ref: ResourceRef, siteId: string, dayKey: string) => void;
  /** ドロップ配置（source があればセル間移動、無ければ新規配置） */
  onDropResource: (
    ref: ResourceRef,
    siteId: string,
    dayKey: string,
    source?: DropSource
  ) => void;
};

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

export const PlacementBoardGridView: FC<PlacementBoardGridViewProps> = ({
  board,
  sites,
  employees,
  machines,
  onAssign,
  onUnassign,
  onDropResource,
}) => {
  const days = useMemo(() => board.days(), [board]);

  // refKey -> 表示名・種別
  const labelOf = useMemo(() => {
    const m = new Map<string, { name: string; isMachine: boolean }>();
    for (const e of employees) m.set(`employee:${e.id}`, { name: e.name, isMachine: false });
    for (const mac of machines) m.set(`machine:${mac.id}`, { name: mac.name, isMachine: true });
    return m;
  }, [employees, machines]);

  const allRefs = useMemo(
    () => [
      ...employees.map((e) => ResourceRef.employee(e.id)),
      ...machines.map((mac) => ResourceRef.machine(mac.id)),
    ],
    [employees, machines]
  );

  // 重複配置セット: `${refKey}\n${dayKey}`
  const conflictSet = useMemo(() => {
    const set = new Set<string>();
    for (const c of board.conflicts()) set.add(`${c.ref.key}\n${c.day.key}`);
    return set;
  }, [board]);

  const [picker, setPicker] = useState<{
    anchor: HTMLElement;
    siteId: string;
    dayKey: string;
  } | null>(null);

  const openPicker = (e: MouseEvent<HTMLElement>, siteId: string, dayKey: string) =>
    setPicker({ anchor: e.currentTarget, siteId, dayKey });
  const closePicker = () => setPicker(null);

  const gridTemplateColumns = `160px repeat(${days.length}, minmax(96px, 1fr))`;

  const pickerCandidates = useMemo(() => {
    if (!picker) return { employees: [] as ResourceRef[], machines: [] as ResourceRef[] };
    const here = new Set(
      board.resourcesOn(picker.siteId, dayFromKey(days, picker.dayKey)!).map((r) => r.key)
    );
    const notHere = allRefs.filter((r) => !here.has(r.key));
    return {
      employees: notHere.filter((r) => r.isEmployee),
      machines: notHere.filter((r) => r.isMachine),
    };
  }, [picker, board, days, allRefs]);

  return (
    <StyledGridWrap>
      <div className="e-grid" style={{ gridTemplateColumns }}>
        <div className="e-corner">現場 \ 日付</div>
        {days.map((d) => {
          const wd = d.weekday;
          return (
            <div
              key={d.key}
              className={`e-dayhead${wd === 0 ? " e-sun" : ""}${wd === 6 ? " e-sat" : ""}`}
            >
              <div className="e-daylabel">{d.label}</div>
              <div className="e-weekday">{WEEKDAY_JA[wd]}</div>
            </div>
          );
        })}

        {sites.length === 0 ? (
          <div className="e-empty" style={{ gridColumn: `1 / ${days.length + 2}` }}>
            現場がありません（「現場」メニューから追加してください）
          </div>
        ) : (
          sites.map((site) => (
            <RowFragment
              key={site.id}
              site={site}
              days={days}
              board={board}
              labelOf={labelOf}
              conflictSet={conflictSet}
              onOpenPicker={openPicker}
              onUnassign={onUnassign}
              onDropResource={onDropResource}
            />
          ))
        )}
      </div>

      <Menu anchorEl={picker?.anchor ?? null} open={!!picker} onClose={closePicker}>
        {picker &&
          pickerCandidates.employees.length === 0 &&
          pickerCandidates.machines.length === 0 && (
            <MenuItem disabled>配置できるリソースがありません</MenuItem>
          )}
        {picker && pickerCandidates.employees.length > 0 && <ListSubheader>社員</ListSubheader>}
        {picker &&
          pickerCandidates.employees.map((r) => (
            <MenuItem
              key={r.key}
              onClick={() => {
                onAssign(r, picker.siteId, picker.dayKey);
                closePicker();
              }}
            >
              <PersonIcon fontSize="small" style={{ marginRight: 6 }} />
              {labelOf.get(r.key)?.name ?? r.id}
            </MenuItem>
          ))}
        {picker && pickerCandidates.machines.length > 0 && <ListSubheader>機械</ListSubheader>}
        {picker &&
          pickerCandidates.machines.map((r) => (
            <MenuItem
              key={r.key}
              onClick={() => {
                onAssign(r, picker.siteId, picker.dayKey);
                closePicker();
              }}
            >
              <LocalShippingIcon fontSize="small" style={{ marginRight: 6 }} />
              {labelOf.get(r.key)?.name ?? r.id}
            </MenuItem>
          ))}
      </Menu>
    </StyledGridWrap>
  );
};

/** 1現場分の行（見出しセル＋各日セル）。grid の直接の子にするため Fragment で並べる */
const RowFragment: FC<{
  site: Site;
  days: WorkingDay[];
  board: PlacementBoard;
  labelOf: Map<string, { name: string; isMachine: boolean }>;
  conflictSet: Set<string>;
  onOpenPicker: (e: MouseEvent<HTMLElement>, siteId: string, dayKey: string) => void;
  onUnassign: (ref: ResourceRef, siteId: string, dayKey: string) => void;
  onDropResource: (ref: ResourceRef, siteId: string, dayKey: string, source?: DropSource) => void;
}> = ({ site, days, board, labelOf, conflictSet, onOpenPicker, onUnassign, onDropResource }) => {
  return (
    <>
      <div className="e-sitehead" title={site.name}>
        {site.name}
      </div>
      {days.map((d) => (
        <DropCell
          key={`${site.id}\n${d.key}`}
          site={site}
          day={d}
          board={board}
          labelOf={labelOf}
          conflictSet={conflictSet}
          onOpenPicker={onOpenPicker}
          onUnassign={onUnassign}
          onDropResource={onDropResource}
        />
      ))}
    </>
  );
};

/** 1セル（現場×日）。ドロップ先。チップはドラッグ移動元。 */
const DropCell: FC<{
  site: Site;
  day: WorkingDay;
  board: PlacementBoard;
  labelOf: Map<string, { name: string; isMachine: boolean }>;
  conflictSet: Set<string>;
  onOpenPicker: (e: MouseEvent<HTMLElement>, siteId: string, dayKey: string) => void;
  onUnassign: (ref: ResourceRef, siteId: string, dayKey: string) => void;
  onDropResource: (ref: ResourceRef, siteId: string, dayKey: string, source?: DropSource) => void;
}> = ({ site, day, board, labelOf, conflictSet, onOpenPicker, onUnassign, onDropResource }) => {
  const [isOver, setIsOver] = useState(false);
  const refs = board.resourcesOn(site.id, day);

  // dragover 中は HTML5 の保護モードで dataTransfer.getData() が空を返すため、
  // parseDragPayload（getData 依存）は使えない。受理判定は types だけで行い、
  // 実データ（url/objectId/source）の読み取りは drop 時のみ行う。
  const handleDragOver = (e: DragEvent) => {
    const types = Array.from(e.dataTransfer.types);
    if (!ACCEPT_TYPES.some((t) => types.includes(t))) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!isOver) setIsOver(true);
  };

  const handleDrop = (e: DragEvent) => {
    setIsOver(false);
    const payload = parseDragPayload(e, { acceptTypes: ACCEPT_TYPES });
    if (!payload) return;
    e.preventDefault();
    e.stopPropagation();
    const kind = getObjectType(payload.type); // 'employee' | 'machine'
    const id = payload.objectId ?? extractIdFromUrl(payload.url);
    if (!id || !kind) return;
    const ref = kind === "machine" ? ResourceRef.machine(id) : ResourceRef.employee(id);
    const raw = e.dataTransfer.getData(SOURCE_KEY);
    const source = raw
      ? { siteId: raw.split("\n")[0], dayKey: raw.split("\n")[1] }
      : undefined;
    onDropResource(ref, site.id, day.key, source);
  };

  const handleChipDragStart = (e: DragEvent, r: ResourceRef, name: string) => {
    const typeName = r.isMachine ? "Machine" : "Employee";
    const url = getObjectUrl(typeName, r.id) ?? "";
    setDragPayload(
      e,
      { type: getDragType(typeName), url, label: name, objectId: r.id },
      { effectAllowed: "copyMove" }
    );
    e.dataTransfer.setData(SOURCE_KEY, `${site.id}\n${day.key}`);
  };

  return (
    <div
      className={`e-cell${isOver ? " e-over" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
    >
      {refs.map((r) => {
        const info = labelOf.get(r.key);
        const conflicted = conflictSet.has(`${r.key}\n${day.key}`);
        const name = info?.name ?? r.id;
        return (
          <span
            key={r.key}
            className={`e-chip${info?.isMachine ? " e-machine" : ""}${conflicted ? " e-conflict" : ""}`}
            title={conflicted ? `${name}（重複配置）` : name}
            draggable
            onDragStart={(e) => handleChipDragStart(e, r, name)}
          >
            {info?.isMachine ? (
              <LocalShippingIcon className="e-chipicon" />
            ) : (
              <PersonIcon className="e-chipicon" />
            )}
            <span className="e-chipname">{name}</span>
            <CloseIcon className="e-chipx" onClick={() => onUnassign(r, site.id, day.key)} />
          </span>
        );
      })}
      <button
        type="button"
        className="e-add"
        aria-label="リソースを配置"
        onClick={(e) => onOpenPicker(e, site.id, day.key)}
      >
        <AddIcon className="e-addicon" />
      </button>
    </div>
  );
};

/** days から dayKey に一致する WorkingDay を引く */
function dayFromKey(days: WorkingDay[], key: string) {
  return days.find((d) => d.key === key);
}

const StyledGridWrap = styled.div`
  overflow-x: auto;
  padding: 4px;

  .e-grid {
    display: grid;
    min-width: max-content;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    overflow: hidden;
    background: #fff;
  }

  .e-corner,
  .e-dayhead,
  .e-sitehead,
  .e-cell {
    border-right: 1px solid #eee;
    border-bottom: 1px solid #eee;
  }

  .e-corner {
    background: #fafafa;
    font-size: 0.75em;
    color: #888;
    padding: 6px 8px;
    position: sticky;
    left: 0;
    z-index: 2;
  }

  .e-dayhead {
    background: #fafafa;
    text-align: center;
    padding: 4px 2px;

    .e-daylabel { font-weight: bold; font-size: 0.85em; }
    .e-weekday { font-size: 0.7em; color: #999; }
    &.e-sun .e-daylabel, &.e-sun .e-weekday { color: #d32f2f; }
    &.e-sat .e-daylabel, &.e-sat .e-weekday { color: #1976d2; }
  }

  .e-sitehead {
    background: #f5f7fa;
    font-weight: bold;
    font-size: 0.85em;
    padding: 6px 8px;
    display: flex;
    align-items: center;
    position: sticky;
    left: 0;
    z-index: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .e-empty {
    padding: 20px;
    text-align: center;
    color: #888;
    grid-column: 1 / -1;
  }

  .e-cell {
    min-height: 44px;
    padding: 3px;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 3px;
    transition: background-color 0.1s, box-shadow 0.1s;

    &:hover .e-add { opacity: 1; }
    &.e-over {
      background: #e3f2fd;
      box-shadow: 0 0 0 2px #1976d2 inset;
    }
  }

  .e-chip {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    max-width: 100%;
    background: #e8f0fe;
    color: #1a3c6e;
    border: 1px solid #c5d8f7;
    border-radius: 10px;
    padding: 1px 5px;
    font-size: 0.72em;
    line-height: 1.4;
    cursor: grab;

    &.e-machine {
      background: #fff3e0;
      color: #7a4a00;
      border-color: #ffcc80;
    }
    &.e-conflict {
      border-color: #d32f2f;
      box-shadow: 0 0 0 1px #d32f2f inset;
    }

    .e-chipicon { font-size: 13px; }
    .e-chipname {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 72px;
    }
    .e-chipx {
      font-size: 13px;
      cursor: pointer;
      color: #99a;
      &:hover { color: #d32f2f; }
    }
  }

  .e-add {
    opacity: 0;
    transition: opacity 0.12s;
    border: 1px dashed #c0c0c0;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    color: #9e9e9e;
    padding: 0 2px;
    display: inline-flex;
    align-items: center;

    &:hover { color: #1976d2; border-color: #1976d2; }
    .e-addicon { font-size: 15px; }
  }
`;
