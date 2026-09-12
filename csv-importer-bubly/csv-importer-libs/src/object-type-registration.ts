/**
 * csv-importer 固有のオブジェクト型をレジストリに登録する
 *
 * 登録しないと ObjectView からドラッグはできても、宇宙やポケットが
 * 「知らない型」として受け取らない（受け入れ側は登録済みの型しか見ない）。
 * ObjectView に type を書いたら、必ずここにも登録すること。
 */
import { registerObjectType } from "@bublys-org/bubbles-ui";
import TableChartIcon from "@mui/icons-material/TableChart";
import DataObjectIcon from "@mui/icons-material/DataObject";
import ViewListIcon from "@mui/icons-material/ViewList";
import PublicIcon from "@mui/icons-material/Public";
import React from "react";

/** シート（表そのもの） */
registerObjectType("CsvSheet", React.createElement(TableChartIcon, { fontSize: "small" }));

/** シートの1行を1オブジェクトとして見たもの */
registerObjectType("CsvObject", React.createElement(DataObjectIcon, { fontSize: "small" }));

// 世界線に保存される集約ではないが、画面の上ではひとつの「もの」として振る舞うビュー。
// ObjectView の約束（ドラッグでき、ダブルクリックでバブルが開く）を満たすには型名が要る。

/** シートを「オブジェクトの一覧」として見たビュー */
registerObjectType("CsvObjectList", React.createElement(ViewListIcon, { fontSize: "small" }));

/** シートの世界線ビュー */
registerObjectType("CsvSheetWorldLine", React.createElement(PublicIcon, { fontSize: "small" }));
