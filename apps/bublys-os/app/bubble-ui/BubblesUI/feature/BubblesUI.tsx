import { FC, useEffect, useCallback } from "react";
import { useAppSelector, useAppDispatch, selectWindowSize, setWindowSize } from "@bublys-org/state-management";

import {
  selectBubblesProcessDPO,
  addBubble,
  deleteProcessBubble as deleteBubbleAction,
  layerDown as layerDownAction,
  layerUp as layerUpAction,
  updateBubble,
  popChildInProcess as popChildAction,
  joinSiblingInProcess as joinSiblingAction,
  relateBubbles,
  removeBubble,
  selectCoordinateSystem,
  setGlobalCoordinateSystem,
  selectSurfaceLeftTop,
  setSurfaceLeftTop,
} from "@bublys-org/bubbles-ui-state";

import { Bubble, createBubble, CoordinateSystem } from "@bublys-org/bubbles-ui";
import { PositionDebuggerProvider } from "../../PositionDebugger/feature/PositionDebugger";
import { BubblesContext } from "../domain/BubblesContext";
import { BubblesLayeredView } from "../ui/BubblesLayeredView";
import { Box, Button, Slider, Typography } from "@mui/material";
import IframeViewer from "../../IframeViewer/IframeViewer";
import "../domain/bubbleRoutes";

type BubblesUI = {
  additionalButton?: React.ReactNode;
};

export const BubblesUI: FC<BubblesUI> = ({ additionalButton }) => {
  const dispatch = useAppDispatch();
  const bubblesDPO = useAppSelector(selectBubblesProcessDPO);

   // ページサイズ管理
  const pageSize = useAppSelector(selectWindowSize);
  useEffect(() => {
    const update = () =>
      dispatch(
        setWindowSize({ width: window.innerWidth, height: window.innerHeight })
      );
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [dispatch]);

  // Redux を使ったアクションハンドラ
  const deleteBubble = (b: Bubble) => {
    dispatch(deleteBubbleAction(b.id));
    dispatch(removeBubble(b.id));
  };

  const layerDown = (b: Bubble) => {
    dispatch(layerDownAction(b.id));
  };

  const layerUp = (b: Bubble) => {
    dispatch(layerUpAction(b.id));
  };

  const onMove = (b: Bubble) => {
    const updated = b.moveTo({ x: 0, y: 0 });
    dispatch(updateBubble(updated.toJSON()));
  };

  const popChild = (b: Bubble, openerBubbleId:string): string => {
    dispatch(addBubble(b.toJSON()));
    dispatch(relateBubbles({openerId: openerBubbleId, openeeId: b.id}));

    dispatch(popChildAction(b.id));

    return b.id;
  };

  const joinSibling = (b: Bubble, openerBubbleId:string): string => {
    dispatch(addBubble(b.toJSON()));
    dispatch(relateBubbles({openerId: openerBubbleId, openeeId: b.id}));

    dispatch(joinSiblingAction(b.id));

    return b.id;
  };

  // openBubble 用ロジック
  const popChildOrJoinSibling = (
    name: string,
    openerBubbleId: string
  ): string => {
    const newBubble = createBubble(name);
    const surface = bubblesDPO.surface;
    if (surface?.[0]?.type === newBubble.type) {
      return joinSibling(newBubble, openerBubbleId);
    } else {
      return popChild(newBubble, openerBubbleId);
    }
  };

  // CoordinateSystem (Reduxから取得)
  const coordinateSystem = useAppSelector(selectCoordinateSystem);
  const surfaceLeftTop = useAppSelector(selectSurfaceLeftTop);

  // CoordinateSystemの更新ハンドラー（useCallbackで安定化）
  const handleCoordinateSystemReady = useCallback((cs: CoordinateSystem) => {
    dispatch(setGlobalCoordinateSystem(cs));
  }, [dispatch]);

  return (
    <>
      <BubblesContext.Provider
        value={{
          pageSize,
          bubbles: bubblesDPO.layers,
          coordinateSystem,
          openBubble: popChildOrJoinSibling,
          renameBubble: (id: string, newName: string) => {
            const existing = bubblesDPO.layers.flat().find((b) => b.id === id);
            if (!existing) {
              console.error(`Bubble with id ${id} not found`);
              return id;
            }
            const updated = existing.rename(newName);
            dispatch(updateBubble(updated.toJSON()));
            return id;
          },
        }}
      >
        <PositionDebuggerProvider isShown={true}>
          <IframeViewer>
            <BubblesLayeredView
              bubbles={bubblesDPO.layers}
              vanishingPoint={coordinateSystem.vanishingPoint}
              onBubbleClick={(name) => console.log("Bubble clicked: " + name)}
              onBubbleClose={deleteBubble}
              onBubbleMove={onMove}
              onBubbleLayerDown={layerDown}
              onBubbleLayerUp={layerUp}
              onCoordinateSystemReady={handleCoordinateSystemReady}
            />
          </IframeViewer>
        </PositionDebuggerProvider>
      </BubblesContext.Provider>

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
          value={coordinateSystem.vanishingPoint.x}
          min={-1000}
          max={2000}
          step={20}
          onChange={(_, v) => {
            dispatch(setGlobalCoordinateSystem({
              ...coordinateSystem,
              vanishingPoint: { ...coordinateSystem.vanishingPoint, x: v as number }
            }));
          }}
          valueLabelDisplay="auto"
        />
        <Typography gutterBottom>Vanishing Point Y</Typography>
        <Slider
          value={coordinateSystem.vanishingPoint.y}
          min={-1500}
          max={1500}
          step={20}
          onChange={(_, v) => {
            dispatch(setGlobalCoordinateSystem({
              ...coordinateSystem,
              vanishingPoint: { ...coordinateSystem.vanishingPoint, y: v as number }
            }));
          }}
          valueLabelDisplay="auto"
        />
        <Typography gutterBottom>Surface Left Top X</Typography>
        <Slider
          value={surfaceLeftTop.x}
          min={0}
          max={500}
          step={10}
          onChange={(_, v) => {
            dispatch(setSurfaceLeftTop({
              ...surfaceLeftTop,
              x: v as number
            }));
          }}
          valueLabelDisplay="auto"
        />
        <Typography gutterBottom>Surface Left Top Y</Typography>
        <Slider
          value={surfaceLeftTop.y}
          min={0}
          max={500}
          step={10}
          onChange={(_, v) => {
            dispatch(setSurfaceLeftTop({
              ...surfaceLeftTop,
              y: v as number
            }));
          }}
          valueLabelDisplay="auto"
        />
        {/* open user group bubble*/}
        <Button
          variant="outlined"
          onClick={() => popChildOrJoinSibling("user-groups", "root")}
        >
          Open User Groups Bubble
        </Button>
        <Button
          variant="outlined"
          onClick={() => popChildOrJoinSibling("memos", "root")}
        >
          Open Memos
        </Button>
        <Button
          variant="outlined"
          onClick={() => popChildOrJoinSibling("users", "root")}
        >
          Open Users
        </Button>
        {additionalButton}
      </Box>

    </>
  );
};
