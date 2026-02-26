"use client";

import { FC, useMemo } from "react";
import { useCasScope } from "@bublys-org/world-line-graph";
import { CsvSheet } from "@bublys-org/csv-importer-model";
import { CsvObjectDetailView } from "../ui/CsvObjectDetailView.js";
import { sheetScopeId, useCsvSheets } from "./CsvSheetProvider.js";

type CsvObjectDetailFeatureProps = {
  sheetId: string;
  rowId: string;
};

export const CsvObjectDetailFeature: FC<CsvObjectDetailFeatureProps> = ({
  sheetId,
  rowId,
}) => {
  const { getSheetMeta } = useCsvSheets();
  const scope = useCasScope(sheetScopeId(sheetId));
  const sheetShell = scope.getShell<CsvSheet>("csv-sheet", sheetId);
  const sheet = sheetShell?.object ?? null;
  const meta = getSheetMeta(sheetId);

  const planeObject = useMemo(
    () => sheet?.toPlaneObject(rowId, meta?.titleColumnId),
    [sheet, rowId, meta]
  );

  if (!planeObject) {
    return <div>オブジェクトが見つかりません</div>;
  }

  return <CsvObjectDetailView object={planeObject} />;
};
