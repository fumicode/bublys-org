'use client';

import { FC, useRef } from "react";
import styled from "styled-components";
import { Alert, Button } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import TableChartIcon from "@mui/icons-material/TableChart";

export type ShiftExcelViewProps = {
  /** インポート可能か（勤務表が選択されているかなど） */
  canImport: boolean;
  /** エクスポート可能か */
  canExport: boolean;
  /** テンプレートエクスポートが可能か（行政版のみ） */
  canTemplateExport?: boolean;
  /** 処理中か */
  busy: boolean;
  /** メッセージ（成功・警告・エラー） */
  message: { kind: "info" | "warn" | "error"; text: string } | null;
  /** インポート結果のサマリ */
  importSummary: string | null;
  /** テンプレート更新の確認を表示するか */
  templateUpdatePrompt?: boolean;
  onImport: (file: File) => void;
  onExport: () => void;
  /** テンプレートExcelでエクスポート */
  onTemplateExport?: () => void;
  onDismissMessage: () => void;
  /** テンプレート更新を承認 */
  onConfirmTemplateUpdate?: () => void;
  /** テンプレート更新をスキップ */
  onSkipTemplateUpdate?: () => void;
};

export const ShiftExcelView: FC<ShiftExcelViewProps> = ({
  canImport,
  canExport,
  canTemplateExport,
  busy,
  message,
  importSummary,
  templateUpdatePrompt,
  onImport,
  onExport,
  onTemplateExport,
  onDismissMessage,
  onConfirmTemplateUpdate,
  onSkipTemplateUpdate,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = "";
    }
  };

  return (
    <StyledContainer>
      <h3 className="e-title">Excel 入出力</h3>

      <div className="e-section">
        <h4 className="e-section-title">インポート（取り込み）</h4>
        <p className="e-desc">
          Excel (.xlsx) のシフト希望表を読み込み、スタッフ一覧と希望データを取り込みます。
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <Button
          variant="outlined"
          startIcon={<UploadFileIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={!canImport || busy}
          size="small"
        >
          ファイルを選択して取り込む
        </Button>
      </div>

      {importSummary && (
        <Alert severity="success" className="e-summary" onClose={onDismissMessage}>
          {importSummary}
        </Alert>
      )}

      {templateUpdatePrompt && (
        <Alert severity="info" className="e-summary">
          <div className="e-template-prompt">
            <span>このファイルをエクスポート用テンプレートとして保存しますか？</span>
            <div className="e-buttons">
              <Button size="small" variant="contained" onClick={onConfirmTemplateUpdate}>
                保存する
              </Button>
              <Button size="small" variant="text" onClick={onSkipTemplateUpdate}>
                スキップ
              </Button>
            </div>
          </div>
        </Alert>
      )}

      <div className="e-section">
        <h4 className="e-section-title">エクスポート（出力）</h4>
        <p className="e-desc">
          現在の勤務表を Excel (.xlsx) ファイルとしてダウンロードします。
        </p>
        <div className="e-buttons">
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={onExport}
            disabled={!canExport || busy}
            size="small"
          >
            Excel をダウンロード
          </Button>
          {canTemplateExport && (
            <Button
              variant="outlined"
              startIcon={<TableChartIcon />}
              onClick={onTemplateExport}
              disabled={!canExport || busy}
              size="small"
            >
              集計付きテンプレート
            </Button>
          )}
        </div>
      </div>

      {message && (
        <Alert
          severity={message.kind === "warn" ? "warning" : message.kind}
          className="e-message"
          onClose={onDismissMessage}
        >
          {message.text}
        </Alert>
      )}
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  .e-title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
  }

  .e-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .e-section-title {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #555;
  }

  .e-desc {
    margin: 0;
    font-size: 12px;
    color: #888;
    line-height: 1.4;
  }

  .e-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .e-summary,
  .e-message {
    font-size: 12px;
  }

  .e-template-prompt {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
`;
