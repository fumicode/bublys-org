/**
 * sekaisen-igo 固有のオブジェクト型をレジストリに登録する
 *
 * 型名は `IgoGame` ではなく `SekaisenIgoGame`。bublys-os 側が別スキームの
 * `IgoGame`（igo-game/:id）を登録しており、レジストリはモジュール単位のグローバルなので、
 * 同名にすると両方を読み込んだときにドラッグ型（type/igo-game）が衝突して
 * 受け入れ側がどちらの対局か区別できなくなる。
 */
import { registerObjectType } from "@bublys-org/bubbles-ui";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import React from "react";

registerObjectType(
  "SekaisenIgoGame",
  React.createElement(SportsEsportsIcon, { fontSize: "small" })
);
