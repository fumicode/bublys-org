import { CsvSheet, type CsvColumnState, type CsvRowState } from "@bublys-org/csv-importer-model";

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

/** CsvSheet → 2D配列（ヘッダー行 + データ行） */
export function csvSheetToValues(sheet: CsvSheet): string[][] {
  const header = sheet.columns.map((col) => col.name);
  const dataRows = sheet.rows.map((row) =>
    sheet.columns.map((col) => row.cells[col.id] ?? "")
  );
  return [header, ...dataRows];
}

/** 2D配列 → CsvSheet（既存シートのカラムID/行IDを可能な限り再利用） */
export function valuesToCsvSheet(values: string[][], existing: CsvSheet): CsvSheet {
  // 全行の最大列数を求める（スパースデータ対応）
  const maxCols = values.reduce((max, row) => Math.max(max, row.length), 0);

  if (values.length === 0 || maxCols === 0) {
    return new CsvSheet({
      ...existing.state,
      columns: [],
      rows: [],
      updatedAt: new Date().toISOString(),
    });
  }

  // 全行を最大列数にパディング
  const padded = values.map((row) => {
    const r = [...row];
    while (r.length < maxCols) r.push("");
    return r;
  });

  const headerRow = padded[0];

  // カラム: 空ヘッダーにはデフォルト名を付与、名前一致で既存IDを再利用
  const columns: CsvColumnState[] = headerRow.map((name, i) => {
    const colName = name || `列${i + 1}`;
    const existingCol = existing.columns.find((c) => c.name === colName);
    return existingCol ? { ...existingCol } : { id: crypto.randomUUID(), name: colName };
  });

  // データ行
  const rows: CsvRowState[] = padded.slice(1).map((rowValues, rowIdx) => {
    const existingRow = existing.rows[rowIdx];
    const cells: Record<string, string> = {};
    columns.forEach((col, colIdx) => {
      cells[col.id] = rowValues[colIdx];
    });
    return {
      id: existingRow?.id ?? crypto.randomUUID(),
      cells,
    };
  });

  return new CsvSheet({
    ...existing.state,
    columns,
    rows,
    updatedAt: new Date().toISOString(),
  });
}

/** スプレッドシートの最初のシート名を取得 */
async function getFirstSheetName(accessToken: string, spreadsheetId: string): Promise<string> {
  const response = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message ?? "Failed to get spreadsheet info");
  }
  const data = await response.json();
  return data.sheets?.[0]?.properties?.title ?? "Sheet1";
}

/** シート名を解決（指定があればそれを使い、なければAPIから取得） */
async function resolveRange(accessToken: string, spreadsheetId: string, sheetName?: string): Promise<string> {
  const name = sheetName ?? await getFirstSheetName(accessToken, spreadsheetId);
  return `'${name}'`;
}

/** スプレッドシートURLからIDを抽出 */
export function parseSpreadsheetUrl(url: string): string {
  // https://docs.google.com/spreadsheets/d/{spreadsheetId}/edit...
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  // IDが直接入力された場合
  if (/^[a-zA-Z0-9_-]+$/.test(url.trim())) return url.trim();
  throw new Error("無効なスプレッドシートURLです");
}

/** Google Sheetsに書き込み（全データ上書き） */
export async function pushToGoogleSheets(
  accessToken: string,
  spreadsheetId: string,
  sheet: CsvSheet,
  sheetName?: string,
): Promise<void> {
  const range = await resolveRange(accessToken, spreadsheetId, sheetName);

  // 既存データをクリア
  await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  // 新しいデータを書き込み
  const values = csvSheetToValues(sheet);
  const response = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message ?? "Push failed");
  }
}

/** Google Sheetsから読み込み */
export async function pullFromGoogleSheets(
  accessToken: string,
  spreadsheetId: string,
  existingSheet: CsvSheet,
  sheetName?: string,
): Promise<CsvSheet> {
  const range = await resolveRange(accessToken, spreadsheetId, sheetName);

  const response = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message ?? "Pull failed");
  }

  const data = await response.json();
  const values: string[][] = data.values ?? [];
  return valuesToCsvSheet(values, existingSheet);
}
