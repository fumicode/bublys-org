import { CsvSheet } from "./CsvSheet";

describe("CsvSheet", () => {
  describe("create", () => {
    it("空のシートを作成できる", () => {
      const sheet = CsvSheet.create("テスト", ["名前", "メール"]);
      expect(sheet.name).toBe("テスト");
      expect(sheet.columns).toHaveLength(2);
      expect(sheet.columns[0].name).toBe("名前");
      expect(sheet.columns[1].name).toBe("メール");
      expect(sheet.rows).toHaveLength(0);
    });
  });

  describe("fromCsvText", () => {
    it("CSVテキストからシートを作成できる", () => {
      const csv = "名前,メール,年齢\n田中,tanaka@example.com,30\n鈴木,suzuki@example.com,25";
      const sheet = CsvSheet.fromCsvText("インポート", csv);

      expect(sheet.name).toBe("インポート");
      expect(sheet.columns).toHaveLength(3);
      expect(sheet.columns[0].name).toBe("名前");
      expect(sheet.columns[1].name).toBe("メール");
      expect(sheet.columns[2].name).toBe("年齢");

      expect(sheet.rows).toHaveLength(2);
      const firstRow = sheet.rows[0];
      expect(firstRow.cells[sheet.columns[0].id]).toBe("田中");
      expect(firstRow.cells[sheet.columns[1].id]).toBe("tanaka@example.com");
      expect(firstRow.cells[sheet.columns[2].id]).toBe("30");
    });

    it("ダブルクオートで囲まれたフィールドを処理できる", () => {
      const csv = '名前,説明\n田中,"カンマ,を含む"\n鈴木,"引用符""を含む"';
      const sheet = CsvSheet.fromCsvText("テスト", csv);

      expect(sheet.rows).toHaveLength(2);
      expect(sheet.rows[0].cells[sheet.columns[1].id]).toBe("カンマ,を含む");
      expect(sheet.rows[1].cells[sheet.columns[1].id]).toBe('引用符"を含む');
    });

    it("空のCSVテキストで空のシートを作成する", () => {
      const sheet = CsvSheet.fromCsvText("空", "");
      expect(sheet.columns).toHaveLength(0);
      expect(sheet.rows).toHaveLength(0);
    });

    it("CRLFの改行コードを処理できる", () => {
      const csv = "名前,メール\r\n田中,tanaka@example.com\r\n鈴木,suzuki@example.com";
      const sheet = CsvSheet.fromCsvText("CRLF", csv);
      expect(sheet.rows).toHaveLength(2);
    });
  });

  describe("column operations", () => {
    let sheet: CsvSheet;

    beforeEach(() => {
      sheet = CsvSheet.fromCsvText("テスト", "名前,メール\n田中,tanaka@example.com");
    });

    it("カラムを追加できる", () => {
      const updated = sheet.addColumn("電話");
      expect(updated.columns).toHaveLength(3);
      expect(updated.columns[2].name).toBe("電話");
      // 既存行に空セルが追加される
      expect(updated.rows[0].cells[updated.columns[2].id]).toBe("");
    });

    it("カラムをリネームできる", () => {
      const colId = sheet.columns[0].id;
      const updated = sheet.renameColumn(colId, "氏名");
      expect(updated.columns[0].name).toBe("氏名");
      // データは変わらない
      expect(updated.rows[0].cells[colId]).toBe("田中");
    });

    it("カラムを削除できる", () => {
      const colId = sheet.columns[0].id;
      const updated = sheet.deleteColumn(colId);
      expect(updated.columns).toHaveLength(1);
      expect(updated.columns[0].name).toBe("メール");
      // 行から該当カラムのデータが削除される
      expect(updated.rows[0].cells[colId]).toBeUndefined();
    });
  });

  describe("row operations", () => {
    let sheet: CsvSheet;

    beforeEach(() => {
      sheet = CsvSheet.fromCsvText("テスト", "名前,メール\n田中,tanaka@example.com");
    });

    it("空行を追加できる", () => {
      const updated = sheet.addRow();
      expect(updated.rows).toHaveLength(2);
      expect(updated.rows[1].cells[sheet.columns[0].id]).toBe("");
      expect(updated.rows[1].cells[sheet.columns[1].id]).toBe("");
    });

    it("行を削除できる", () => {
      const rowId = sheet.rows[0].id;
      const updated = sheet.deleteRow(rowId);
      expect(updated.rows).toHaveLength(0);
    });

    it("セルを更新できる", () => {
      const rowId = sheet.rows[0].id;
      const colId = sheet.columns[0].id;
      const updated = sheet.updateCell(rowId, colId, "佐藤");
      expect(updated.rows[0].cells[colId]).toBe("佐藤");
      // 元のシートは変更されない（不変性）
      expect(sheet.rows[0].cells[colId]).toBe("田中");
    });
  });

  describe("rename", () => {
    it("シート名を変更できる", () => {
      const sheet = CsvSheet.create("旧名", ["A"]);
      const updated = sheet.rename("新名");
      expect(updated.name).toBe("新名");
      expect(sheet.name).toBe("旧名");
    });
  });

  describe("toCsvText", () => {
    it("CSVテキストにエクスポートできる", () => {
      const csv = "名前,メール\n田中,tanaka@example.com\n鈴木,suzuki@example.com";
      const sheet = CsvSheet.fromCsvText("テスト", csv);
      const exported = sheet.toCsvText();
      expect(exported).toBe(csv);
    });

    it("特殊文字をエスケープしてエクスポートする", () => {
      const sheet = CsvSheet.create("テスト", ["名前", "説明"]);
      const withRow = sheet.addRow();
      const updated = withRow
        .updateCell(withRow.rows[0].id, withRow.columns[0].id, "田中")
        .updateCell(withRow.rows[0].id, withRow.columns[1].id, 'カンマ,を含む');
      const exported = updated.toCsvText();
      expect(exported).toContain('"カンマ,を含む"');
    });
  });

  describe("serialization", () => {
    it("toJSON/fromJSONでラウンドトリップできる", () => {
      const sheet = CsvSheet.fromCsvText("テスト", "名前,メール\n田中,tanaka@example.com");
      const json = sheet.toJSON();
      const restored = CsvSheet.fromJSON(json);
      expect(restored.name).toBe(sheet.name);
      expect(restored.columns).toEqual(sheet.columns);
      expect(restored.rows).toEqual(sheet.rows);
      expect(restored.state.createdAt).toBe(sheet.state.createdAt);
    });
  });

  describe("immutability", () => {
    it("操作は新しいインスタンスを返す", () => {
      const sheet = CsvSheet.create("テスト", ["A"]);
      const withRow = sheet.addRow();
      const withCol = sheet.addColumn("B");
      expect(withRow).not.toBe(sheet);
      expect(withCol).not.toBe(sheet);
      expect(sheet.rows).toHaveLength(0);
      expect(sheet.columns).toHaveLength(1);
    });
  });
});
