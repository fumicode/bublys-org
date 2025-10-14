import { FC, useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@bublys-org/state-management";

import {
  selectBubbles,
  deleteBubble as deleteBubbleAction,
  layerDown as layerDownAction,
  layerUp as layerUpAction,
  moveTo,
  popChild as popChildAction,
  joinSibling as joinSiblingAction,
  renameBubble as renameBubbleAction,
} from "@bublys-org/bubbles-ui-state"

import { Bubble, BubblesProcess } from "@bublys-org/bubbles-ui";
import { Point2 } from "@bublys-org/bubbles-ui";
import { PositionDebuggerProvider } from "../../PositionDebugger/feature/PositionDebugger";
import { BubblesContext } from "../domain/BubblesContext";
import { BubblesLayeredView } from "../ui/BubblesLayeredView";
import SmartRect from "../domain/01_SmartRect";
import { Box, Button, Slider, Typography } from "@mui/material";

// 文字列から1対1の一意な色を生成。
function getColorHueFromString(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 360);
}

// ドメイン Bubble インスタンスを生成
const createBubble = (name: string, pos?: Point2): Bubble => {
  const colorHue = getColorHueFromString(name);
  const type =
    name === "user-groups"
      ? "user-groups"
      : name.startsWith("user-groups/")
      ? "user-group"
      : "normal";
  return new Bubble({ name, colorHue, type, position: pos });
};

type BubblesUI = {
  additionalButton?: React.ReactNode;
};

export const BubblesUI: FC<BubblesUI> = ({ additionalButton }) => {
  const dispatch = useAppDispatch();
  const bubblesProcess: BubblesProcess = useAppSelector(selectBubbles);

  // ページサイズ管理
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>();
  useEffect(() => {
    const rect = document.body.getBoundingClientRect();
    setPageSize({ width: rect.width, height: rect.height });
  }, []);

  // Redux を使ったアクションハンドラ
  const deleteBubble = (b: Bubble) => {
    dispatch(deleteBubbleAction(b.id));
  };
  const layerDown = (b: Bubble) => {
    dispatch(layerDownAction(b.id));
  };
  const layerUp = (b: Bubble) => {
    dispatch(layerUpAction(b.id));
  };
  const onMove = (b: Bubble) => {
    dispatch(moveTo({ id: b.id, position: { x: 300, y: 300 } }));
  };
  const popChild = (b: Bubble): string => {
    dispatch(popChildAction(b));
    return b.id;
  };
  const joinSibling = (b: Bubble): string => {
    dispatch(joinSiblingAction(b));
    return b.id;
  };

  // openBubble 用ロジック
  const popChildOrJoinSibling = (
    name: string,
    openerRect?: SmartRect
  ): string => {
    const newBubble = createBubble(name);
    const surface = bubblesProcess.surface;
    if (surface?.[0]?.type === newBubble.type) {
      return joinSibling(newBubble);
    } else {
      return popChild(newBubble);
    }
  };

  // 消失点
  const [vanishingPoint, setVanishingPoint] = useState<Point2>({
    x: -10,
    y: 1000,
  });

  return (
    <>
      <PositionDebuggerProvider isShown={false}>
        <BubblesContext.Provider
          value={{
            pageSize,
            bubbles: bubblesProcess,
            openBubble: popChildOrJoinSibling,
            renameBubble: (id: string, newName: string) => {
              dispatch(renameBubbleAction({ id, newName }));
              return id;
            },
          }}
        >
          <BubblesLayeredView
            bubbles={bubblesProcess}
            vanishingPoint={vanishingPoint}
            onBubbleClick={(name) => console.log("Bubble clicked: " + name)}
            onBubbleClose={deleteBubble}
            onBubbleMove={onMove}
            onBubbleLayerDown={layerDown}
            onBubbleLayerUp={layerUp}
          />
        </BubblesContext.Provider>
      </PositionDebuggerProvider>
      <Box
        sx={{
          position: "fixed",
          bottom: 20,
          right: 20,
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          padding: 2,
          borderRadius: 1,
          zIndex: 1000,
          width: 300,
        }}
      >
        <Typography gutterBottom>Vanishing Point X</Typography>
        <Slider
          value={vanishingPoint.x}
          min={-1000}
          max={2000}
          step={20}
          onChange={(_, v) =>
            setVanishingPoint((prev) => ({ ...prev, x: v as number }))
          }
          valueLabelDisplay="auto"
        />
        <Typography gutterBottom>Vanishing Point Y</Typography>
        <Slider
          value={vanishingPoint.y}
          min={-1500}
          max={1500}
          step={20}
          onChange={(_, v) =>
            setVanishingPoint((prev) => ({ ...prev, y: v as number }))
          }
          valueLabelDisplay="auto"
        />
        {/* open user group bubble*/}
        <Button
          variant="outlined"
          onClick={() => popChildOrJoinSibling("user-groups")}
        >
          Open User Groups Bubble
        </Button>
        {additionalButton}
      </Box>

    </>
  );
};
