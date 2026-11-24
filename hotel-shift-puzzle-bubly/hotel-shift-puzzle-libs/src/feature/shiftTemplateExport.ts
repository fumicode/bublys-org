/**
 * テンプレートExcelエクスポート (#259) — B案
 *
 * バンドルされた .xlsx テンプレートを読み込み、データセルのみを埋めて出力する。
 * 数式・スタイル・セル結合はテンプレートがすべて持っている。
 * fflate で zip レベルの XML 操作を行い、スタイルを完全に保持する。
 */

import { unzipSync, zipSync } from "fflate";
import * as XLSX from "xlsx";
import { downloadExcel } from "./excelIO.js";
import {
  GOVERNMENT_SYMBOL_MAPPING,
  type FormatInput,
  type SymbolMapping,
  type WorkingDay,
} from "@bublys-org/hotel-shift-puzzle-model";
import { GOVERNMENT_TEMPLATE_BASE64 } from "./governmentTemplateData.js";

// ========== テンプレートレイアウト定数（0始まり） ==========

const TITLE_ROW = 0;
const TITLE_COL = 1;

const ROKUYO_ROW = 2;
const DAY_ROW = 3;
const WEEKDAY_ROW = 4;
const DATA_START_ROW = 5;

const REIWA_COL = 1;
const MONTH_COL = 3;
const DAY_START_COL = 4;
const DAY_COUNT = 28;

const TOTAL_STAFF_ROWS = 19;
const NUMBER_COL = 1;
const SUB_NUMBER_COL = 2;
const NAME_COL = 3;

const HOLIDAY_COUNT_COL = 34; // AI

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

// ========== 六曜の短縮 ==========

const ROKUYO_SHORT: Record<string, string> = {
  大安: "大",
  友引: "友",
  先勝: "先勝",
  先負: "先負",
  赤口: "赤",
  仏滅: "仏",
};

function shortenRokuyo(label: string): string {
  return ROKUYO_SHORT[label] ?? label;
}

// ========== XML セル操作 ==========

type CellMod =
  | { type: "string"; value: string }
  | { type: "number"; value: number }
  | { type: "empty" };

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cellRef(row: number, col: number): string {
  return XLSX.utils.encode_cell({ r: row, c: col });
}

function modifyCells(xml: string, mods: Map<string, CellMod>): string {
  return xml.replace(
    /<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>[\s\S]*?<\/c>)/g,
    (match, ref: string, attrs: string) => {
      const mod = mods.get(ref);
      if (!mod) return match;

      const styleMatch = attrs.match(/\s+s="(\d+)"/);
      const styleAttr = styleMatch ? ` s="${styleMatch[1]}"` : "";

      switch (mod.type) {
        case "number":
          return `<c r="${ref}"${styleAttr}><v>${mod.value}</v></c>`;
        case "empty":
          return `<c r="${ref}"${styleAttr}/>`;
        case "string":
          return `<c r="${ref}"${styleAttr} t="inlineStr"><is><t>${escapeXml(mod.value)}</t></is></c>`;
      }
    },
  );
}

// ========== セル値の決定 ==========

function cellValueFor(
  staffId: string,
  dayKey: string,
  input: FormatInput,
  mapping: SymbolMapping,
): string {
  const DAY_OFF = "day-off";
  const shiftValue = input.shiftValueOf(staffId, dayKey);

  if (shiftValue === DAY_OFF) {
    const reason = input.dayOffReasonOf(staffId, dayKey);
    if (reason) {
      return mapping.symbolForWish(`day-off:${reason}`) ?? reason;
    }
    return "";
  }

  if (shiftValue !== null) {
    const shiftName = input.shiftNameOf?.(shiftValue);
    const optionKey = shiftName ? `work:${shiftName}` : undefined;
    return (optionKey && mapping.symbolForWish(optionKey)) ?? shiftValue;
  }

  const dayOffReason = input.dayOffReasonOf(staffId, dayKey);
  if (dayOffReason) {
    return mapping.symbolForWish(`day-off:${dayOffReason}`) ?? dayOffReason;
  }

  return "";
}

// ========== データ埋め込みマップの構築 ==========

function buildModifications(
  input: FormatInput,
  options: TemplateExportOptions,
): Map<string, CellMod> {
  const { mapping = GOVERNMENT_SYMBOL_MAPPING } = options;
  const { days, staffRows } = input;
  const mods = new Map<string, CellMod>();
  const dayCount = Math.min(days.length, DAY_COUNT);

  // タイトル（B1）
  mods.set(cellRef(TITLE_ROW, TITLE_COL), {
    type: "string",
    value: input.title,
  });

  // 令和・月表記（B4, D4）— C4（令和年数）はテンプレートが持つので触らない
  mods.set(cellRef(DAY_ROW, REIWA_COL), { type: "string", value: "R" });
  const startMonth = days[0].month;
  const endMonth = days[days.length - 1].month;
  mods.set(cellRef(DAY_ROW, MONTH_COL), {
    type: "string",
    value:
      startMonth === endMonth
        ? `${startMonth}月`
        : `${startMonth}-${endMonth}月`,
  });

  // 月間休暇日数（AI4）
  if (options.holidayCount !== undefined) {
    mods.set(cellRef(DAY_ROW, HOLIDAY_COUNT_COL), {
      type: "number",
      value: options.holidayCount,
    });
  }

  // 日付・曜日・六曜（28日分）
  for (let di = 0; di < DAY_COUNT; di++) {
    const col = DAY_START_COL + di;

    if (di < dayCount) {
      mods.set(cellRef(DAY_ROW, col), {
        type: "number",
        value: days[di].day,
      });
      mods.set(cellRef(WEEKDAY_ROW, col), {
        type: "string",
        value: WEEKDAY_LABELS[days[di].weekday],
      });
      if (options.rokuyoOf) {
        const note = options.rokuyoOf(days[di]);
        mods.set(
          cellRef(ROKUYO_ROW, col),
          note
            ? { type: "string", value: shortenRokuyo(note.label) }
            : { type: "empty" },
        );
      }
    } else {
      mods.set(cellRef(ROKUYO_ROW, col), { type: "empty" });
      mods.set(cellRef(DAY_ROW, col), { type: "empty" });
      mods.set(cellRef(WEEKDAY_ROW, col), { type: "empty" });
    }
  }

  // スタッフデータ（19行）
  for (let si = 0; si < TOTAL_STAFF_ROWS; si++) {
    const row = DATA_START_ROW + si;
    const staff = si < staffRows.length ? staffRows[si] : undefined;

    mods.set(
      cellRef(row, NUMBER_COL),
      staff?.rowNumber !== undefined
        ? { type: "number", value: staff.rowNumber }
        : { type: "empty" },
    );
    mods.set(
      cellRef(row, SUB_NUMBER_COL),
      staff?.subNumber !== undefined
        ? { type: "number", value: staff.subNumber }
        : { type: "empty" },
    );
    mods.set(
      cellRef(row, NAME_COL),
      staff ? { type: "string", value: staff.name } : { type: "empty" },
    );

    for (let di = 0; di < DAY_COUNT; di++) {
      const col = DAY_START_COL + di;
      if (staff && di < dayCount) {
        const val = cellValueFor(staff.staffId, days[di].key, input, mapping);
        mods.set(
          cellRef(row, col),
          val !== "" ? { type: "string", value: val } : { type: "empty" },
        );
      } else {
        mods.set(cellRef(row, col), { type: "empty" });
      }
    }
  }

  return mods;
}

// ========== base64 デコード ==========

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ========== 公開 API ==========

export type TemplateExportOptions = {
  mapping?: SymbolMapping;
  filename?: string;
  rokuyoOf?: (day: WorkingDay) => { label: string } | undefined;
  holidayCount?: number;
  /** 差し替え用テンプレート。指定されればバンドル版の代わりに使う */
  templateData?: ArrayBuffer;
};

/**
 * テンプレート .xlsx にデータを埋め込み ArrayBuffer を返す。
 * スタイル・数式・セル結合はテンプレートから完全に保持される。
 */
export function exportShiftFromTemplate(
  input: FormatInput,
  options: TemplateExportOptions = {},
): ArrayBuffer {
  const templateBytes = options.templateData
    ? new Uint8Array(options.templateData)
    : base64ToUint8Array(GOVERNMENT_TEMPLATE_BASE64);
  const zip = unzipSync(templateBytes);

  const sheetXml = new TextDecoder().decode(zip["xl/worksheets/sheet1.xml"]);
  const mods = buildModifications(input, options);
  const modifiedXml = modifyCells(sheetXml, mods);

  zip["xl/worksheets/sheet1.xml"] = new TextEncoder().encode(modifiedXml);

  const result = zipSync(zip);
  return result.buffer;
}

/**
 * テンプレートWorkbookを生成しFormatInputのデータを埋め込む。
 * テスト用にWorkbookを直接返す公開関数。
 */
export function buildTemplateWorkbook(
  input: FormatInput,
  options: TemplateExportOptions = {},
): XLSX.WorkBook {
  const buffer = exportShiftFromTemplate(input, options);
  return XLSX.read(buffer, { type: "array" });
}

/**
 * テンプレートExcelを生成し、ブラウザでダウンロードする。
 */
export function downloadShiftFromTemplate(
  input: FormatInput,
  options: TemplateExportOptions = {},
): void {
  const buffer = exportShiftFromTemplate(input, options);
  const filename = options.filename ?? buildDefaultFilename(input.title);
  downloadExcel(buffer, filename);
}

function buildDefaultFilename(title: string): string {
  const safe = title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
  return `${safe}_テンプレート.xlsx`;
}
