"use client";

import { FC, useCallback, useContext, useMemo } from "react";
import { useCasScope } from "@bublys-org/world-line-graph";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { CsvSheet } from "@bublys-org/csv-importer-model";
import { CsvObjectListView } from "../ui/CsvObjectListView.js";
import { sheetScopeId, useCsvSheets } from "./CsvSheetProvider.js";

type CsvObjectListFeatureProps = {
  sheetId: string;
  bubbleId?: string;
};

export const CsvObjectListFeature: FC<CsvObjectListFeatureProps> = ({
  sheetId,
  bubbleId,
}) => {
  const { openBubble } = useContext(BubblesContext);
  const { getSheetMeta, setTitleColumn } = useCsvSheets();
  const scope = useCasScope(sheetScopeId(sheetId));
  const sheetShell = scope.getShell<CsvSheet>("csv-sheet", sheetId);
  const sheet = sheetShell?.object ?? null;
  const meta = getSheetMeta(sheetId);

  const objects = useMemo(
    () => sheet?.toPlaneObjects(meta?.titleColumnId) ?? [],
    [sheet, meta]
  );

  const handleChangeTitleColumn = useCallback(
    (columnId: string) => {
      setTitleColumn(sheetId, columnId);
    },
    [setTitleColumn, sheetId]
  );

  const handleSelectObject = useCallback(
    (objectId: string) => {
      if (bubbleId) {
        openBubble(`csv-importer/sheets/${sheetId}/objects/${objectId}`, bubbleId);
      }
    },
    [openBubble, sheetId, bubbleId]
  );

  const buildObjectUrl = useCallback(
    (objectId: string) => `csv-importer/sheets/${sheetId}/objects/${objectId}`,
    [sheetId]
  );

  if (!sheet) {
    return <div>シートが見つかりません</div>;
  }

  return (
    <CsvObjectListView
      sheetName={sheet.name}
      columns={sheet.columns}
      objects={objects}
      titleColumnId={meta?.titleColumnId}
      onChangeTitleColumn={handleChangeTitleColumn}
      onSelectObject={handleSelectObject}
      buildObjectUrl={buildObjectUrl}
    />
  );
};
