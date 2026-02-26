// ========== State Types ==========

export type CsvColumnState = {
  readonly id: string;
  readonly name: string;
};

export type CsvRowState = {
  readonly id: string;
  readonly cells: Record<string, string>; // columnId → value
};

export type CsvSheetState = {
  readonly id: string;
  readonly name: string;
  readonly columns: CsvColumnState[];
  readonly rows: CsvRowState[];
  readonly createdAt: string;
  readonly updatedAt: string;
};

// ========== Domain Model ==========

export class CsvSheet {
  constructor(readonly state: CsvSheetState) {}

  // --- Getters ---

  get id(): string {
    return this.state.id;
  }
  get name(): string {
    return this.state.name;
  }
  get columns(): CsvColumnState[] {
    return this.state.columns;
  }
  get rows(): CsvRowState[] {
    return this.state.rows;
  }

  // --- Factory ---

  static create(name: string, columnNames: string[]): CsvSheet {
    const now = new Date().toISOString();
    const columns: CsvColumnState[] = columnNames.map((colName) => ({
      id: crypto.randomUUID(),
      name: colName,
    }));
    return new CsvSheet({
      id: crypto.randomUUID(),
      name,
      columns,
      rows: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromCsvText(name: string, csvText: string): CsvSheet {
    const lines = parseCsvLines(csvText);
    if (lines.length === 0) {
      return CsvSheet.create(name, []);
    }

    const now = new Date().toISOString();
    const headerRow = lines[0];
    const columns: CsvColumnState[] = headerRow.map((colName) => ({
      id: crypto.randomUUID(),
      name: colName.trim(),
    }));

    const rows: CsvRowState[] = lines.slice(1).map((line) => {
      const cells: Record<string, string> = {};
      columns.forEach((col, i) => {
        cells[col.id] = i < line.length ? line[i].trim() : "";
      });
      return { id: crypto.randomUUID(), cells };
    });

    return new CsvSheet({
      id: crypto.randomUUID(),
      name,
      columns,
      rows,
      createdAt: now,
      updatedAt: now,
    });
  }

  // --- Column Operations ---

  addColumn(name: string): CsvSheet {
    const newCol: CsvColumnState = { id: crypto.randomUUID(), name };
    const rows = this.state.rows.map((row) => ({
      ...row,
      cells: { ...row.cells, [newCol.id]: "" },
    }));
    return this.withUpdatedState({
      columns: [...this.state.columns, newCol],
      rows,
    });
  }

  renameColumn(columnId: string, name: string): CsvSheet {
    const columns = this.state.columns.map((col) =>
      col.id === columnId ? { ...col, name } : col
    );
    return this.withUpdatedState({ columns });
  }

  deleteColumn(columnId: string): CsvSheet {
    const columns = this.state.columns.filter((col) => col.id !== columnId);
    const rows = this.state.rows.map((row) => {
      const { [columnId]: _, ...rest } = row.cells;
      return { ...row, cells: rest };
    });
    return this.withUpdatedState({ columns, rows });
  }

  // --- Row Operations ---

  addRow(): CsvSheet {
    const cells: Record<string, string> = {};
    this.state.columns.forEach((col) => {
      cells[col.id] = "";
    });
    const newRow: CsvRowState = { id: crypto.randomUUID(), cells };
    return this.withUpdatedState({
      rows: [...this.state.rows, newRow],
    });
  }

  deleteRow(rowId: string): CsvSheet {
    const rows = this.state.rows.filter((row) => row.id !== rowId);
    return this.withUpdatedState({ rows });
  }

  updateCell(rowId: string, columnId: string, value: string): CsvSheet {
    const rows = this.state.rows.map((row) =>
      row.id === rowId
        ? { ...row, cells: { ...row.cells, [columnId]: value } }
        : row
    );
    return this.withUpdatedState({ rows });
  }

  // --- Rename ---

  rename(name: string): CsvSheet {
    return this.withUpdatedState({ name });
  }

  // --- Export ---

  toCsvText(): string {
    const header = this.state.columns.map((col) => escapeCsvField(col.name)).join(",");
    const dataRows = this.state.rows.map((row) =>
      this.state.columns
        .map((col) => escapeCsvField(row.cells[col.id] ?? ""))
        .join(",")
    );
    return [header, ...dataRows].join("\n");
  }

  // --- Serialization ---

  toJSON(): CsvSheetState {
    return this.state;
  }

  static fromJSON(json: CsvSheetState): CsvSheet {
    return new CsvSheet(json);
  }

  // --- Private ---

  private withUpdatedState(partial: Partial<CsvSheetState>): CsvSheet {
    return new CsvSheet({
      ...this.state,
      ...partial,
      updatedAt: new Date().toISOString(),
    });
  }
}

// ========== CSV Parsing Helpers ==========

/** CSV行をパースする（ダブルクオート対応） */
function parseCsvLines(text: string): string[][] {
  const result: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          // エスケープされた引用符
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(current);
        current = "";
      } else if (ch === "\n") {
        row.push(current);
        current = "";
        if (row.some((cell) => cell !== "")) {
          result.push(row);
        }
        row = [];
      } else if (ch === "\r") {
        // skip
      } else {
        current += ch;
      }
    }
  }

  // 最後のフィールド
  row.push(current);
  if (row.some((cell) => cell !== "")) {
    result.push(row);
  }

  return result;
}

/** CSVフィールドをエスケープ */
function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
