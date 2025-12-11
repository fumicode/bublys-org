import { FC, useEffect, useCallback, useState } from "react";
import { useAppSelector, useAppDispatch, selectWindowSize, setWindowSize, addPocketItem } from "@bublys-org/state-management";

import {
  selectBubblesProcessDPO,
  addBubble,
  deleteProcessBubble as deleteBubbleAction,
  layerDown as layerDownAction,
  layerUp as layerUpAction,
  updateBubble,
  popChildInProcess as popChildAction,
  popChildMaxInProcess,
  joinSiblingInProcess as joinSiblingAction,
  relateBubbles,
  removeBubble,
  selectGlobalCoordinateSystem,
  setGlobalCoordinateSystem,
  selectSurfaceLeftTop,
  setSurfaceLeftTop,
} from "@bublys-org/bubbles-ui-state";

import { Bubble, createBubble, CoordinateSystem } from "@bublys-org/bubbles-ui";
import { PositionDebuggerProvider } from "../../PositionDebugger/feature/PositionDebugger";
import { BubblesContext } from "../domain/BubblesContext";
import { BubblesLayeredView } from "../ui/BubblesLayeredView";
import { Box, Button, Slider, Typography, IconButton } from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import CloseIcon from "@mui/icons-material/Close";
import IframeViewer from "../../IframeViewer/IframeViewer";
import "../domain/bubbleRoutes";
import { PocketView } from "../../Pocket/ui/PocketView";
import { DragDataType } from "../../utils/drag-types";

type BubblesUI = {
  additionalButton?: React.ReactNode;
};

export const BubblesUI: FC<BubblesUI> = ({ additionalButton }) => {
  const dispatch = useAppDispatch();
  const bubblesDPO = useAppSelector(selectBubblesProcessDPO);

  // パネルの開閉状態
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  const [isPocketOpen, setIsPocketOpen] = useState(false);

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

  // CoordinateSystem (Reduxから取得)
  const globalCoordinateSystem = useAppSelector(selectGlobalCoordinateSystem);
  const surfaceLeftTop = useAppSelector(selectSurfaceLeftTop);

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


  const popChild = (b: Bubble, openerBubbleId:string): string => {
    dispatch(addBubble(b.toJSON()));
    dispatch(relateBubbles({openerId: openerBubbleId, openeeId: b.id}));

    dispatch(popChildAction(b.id));

    return b.id;
  };

  const popChildMax = (b: Bubble, openerBubbleId:string): string => {
    // 利用可能なスペース（グローバル座標系）
    const availableWidth = pageSize.width - globalCoordinateSystem.offset.x - surfaceLeftTop.x;
    const availableHeight = pageSize.height - globalCoordinateSystem.offset.y - surfaceLeftTop.y;


    // サイズと位置を設定
    const resizedBubble = b.resizeTo({ width: availableWidth, height: availableHeight });
    const movedBubble = resizedBubble.moveTo({ x: 0, y: 0 });

    dispatch(addBubble(movedBubble.toJSON()));
    dispatch(relateBubbles({openerId: openerBubbleId, openeeId: movedBubble.id}));

    dispatch(popChildMaxInProcess(b.id));

    return b.id;
  }


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


    //nameの最後がhistoryであるかどうかをチェック
    const isNameEndWithHistory = /\/history$/.test(name);

    
    if(isNameEndWithHistory) {
      return popChildMax(newBubble, openerBubbleId);
    }

    if (surface?.[0]?.type === newBubble.type) {
      return joinSibling(newBubble, openerBubbleId);
    } else {
      return popChild(newBubble, openerBubbleId);
    }
  };

  // CoordinateSystemの更新ハンドラー（useCallbackで安定化）
  const handleCoordinateSystemReady = useCallback((cs: CoordinateSystem) => {
    dispatch(setGlobalCoordinateSystem(cs));
  }, [dispatch]);

  // Pocketのドロップハンドラー
  const handlePocketDrop = (url: string, type: DragDataType, label?: string) => {
    dispatch(addPocketItem({
      id: crypto.randomUUID(),
      url,
      type,
      label,
      addedAt: Date.now(),
    }));
  };

  // Pocketアイテムのクリックハンドラー
  const handlePocketItemClick = (url: string) => {
    popChildOrJoinSibling(url, "root");
  };

  return (
    <>
      <BubblesContext.Provider
        value={{
          pageSize,
          surfaceLeftTop,
          bubbles: bubblesDPO.layers,
          coordinateSystem: globalCoordinateSystem,
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
        <PositionDebuggerProvider isShown={false}>
          <IframeViewer>
            <BubblesLayeredView
              bubbles={bubblesDPO.layers}
              vanishingPoint={globalCoordinateSystem.vanishingPoint}
              onBubbleClick={(name) => console.log("Bubble clicked: " + name)}
              onBubbleClose={deleteBubble}
              onBubbleResize={(bubble) => console.log("Bubble resized: " + bubble.name, bubble.size)}
              onBubbleLayerDown={layerDown}
              onBubbleLayerUp={layerUp}
              onCoordinateSystemReady={handleCoordinateSystemReady}
            />
          </IframeViewer>
        </PositionDebuggerProvider>
      </BubblesContext.Provider>

      {/* Pocket */}
      {isPocketOpen ? (
        <Box
          sx={{
            position: "fixed",
            bottom: 20,
            right: 340,
            zIndex: 1000,
          }}
        >
          <PocketView
            onDrop={handlePocketDrop}
            onItemClick={handlePocketItemClick}
            onClose={() => setIsPocketOpen(false)}
          />
        </Box>
      ) : (
        <IconButton
          sx={{
            position: "fixed",
            bottom: 20,
            right: 340,
            zIndex: 1000,
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.9)",
            },
          }}
          onClick={() => setIsPocketOpen(true)}
        >
          <Inventory2Icon />
        </IconButton>
      )}

      {/* Control Panel */}
      {isControlPanelOpen ? (
        <Box
          sx={{
            position: "fixed",
            bottom: 20,
            right: 20,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            padding: 2,
            borderRadius: 1,
            zIndex: 1000,
            width: 300,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">コントロール</Typography>
            <IconButton size="small" onClick={() => setIsControlPanelOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Typography gutterBottom>Vanishing Point X</Typography>
          <Slider
            value={globalCoordinateSystem.vanishingPoint.x}
            min={-1000}
            max={2000}
            step={20}
            onChange={(_, v) => {
              dispatch(setGlobalCoordinateSystem({
                ...globalCoordinateSystem,
                vanishingPoint: { ...globalCoordinateSystem.vanishingPoint, x: v as number }
              }));
            }}
            valueLabelDisplay="auto"
          />
          <Typography gutterBottom>Vanishing Point Y</Typography>
          <Slider
            value={globalCoordinateSystem.vanishingPoint.y}
            min={-1500}
            max={1500}
            step={20}
            onChange={(_, v) => {
              dispatch(setGlobalCoordinateSystem({
                ...globalCoordinateSystem,
                vanishingPoint: { ...globalCoordinateSystem.vanishingPoint, y: v as number }
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
            fullWidth
            sx={{ mt: 1, mb: 1 }}
          >
            Open User Groups Bubble
          </Button>
          <Button
            variant="outlined"
            onClick={() => popChildOrJoinSibling("memos", "root")}
            fullWidth
            sx={{ mb: 1 }}
          >
            Open Memos
          </Button>
          <Button
            variant="outlined"
            onClick={() => popChildOrJoinSibling("users", "root")}
            fullWidth
            sx={{ mb: 1 }}
          >
            Open Users
          </Button>
          {additionalButton}
        </Box>
      ) : (
        <IconButton
          sx={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 1000,
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.9)",
            },
          }}
          onClick={() => setIsControlPanelOpen(true)}
        >
          <TuneIcon />
        </IconButton>
      )}

    </>
  );
};
