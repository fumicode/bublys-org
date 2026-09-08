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
import React from "react";

/** シート（表そのもの） */
registerObjectType("CsvSheet", React.createElement(TableChartIcon, { fontSize: "small" }));

/** シートの1行を1オブジェクトとして見たもの */
registerObjectType("CsvObject", React.createElement(DataObjectIcon, { fontSize: "small" }));
