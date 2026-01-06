import { FC, useEffect, useCallback, useState } from "react";
import { useAppSelector, useAppDispatch, selectWindowSize, setWindowSize, addPocketItem } from "@bublys-org/state-management";
import { useShellManager } from "@bublys-org/object-shell";

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
  OpeningPosition,
} from "@bublys-org/bubbles-ui-state";

import { Bubble, createBubble, CoordinateSystem } from "@bublys-org/bubbles-ui";
import { PositionDebuggerProvider } from "../../PositionDebugger/feature/PositionDebugger";
import { BubblesContext } from "../domain/BubblesContext";
import { BubbleRefsProvider } from "../domain/BubbleRefsContext";
import { BubblesLayeredView } from "../ui/BubblesLayeredView";
import { Box, Button, Slider, Typography, IconButton } from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import CloseIcon from "@mui/icons-material/Close";
import EventNoteIcon from "@mui/icons-material/EventNote";
import AssignmentIcon from "@mui/icons-material/Assignment";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
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
  const shellManager = useShellManager();

  // パネルの開閉状態
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  const [isPocketOpen, setIsPocketOpen] = useState(false);
  const [isGakkaiShiftPanelOpen, setIsGakkaiShiftPanelOpen] = useState(false);
  const [isTaskManagementPanelOpen, setIsTaskManagementPanelOpen] = useState(false);
  const [isIgoGamePanelOpen, setIsIgoGamePanelOpen] = useState(false);

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

    // Bubble削除 → Shell削除
    // URL: object-shells/{shellType}/{shellId} の形式から Shell ID を抽出
    const match = b.url.match(/^object-shells\/([^/]+)\/(.+)$/);
    if (match) {
      const [, shellType, shellId] = match;
      console.log('[BubblesUI] Deleting shell:', { shellId, shellType });
      shellManager.removeShell(shellId);
    }
  };

  const layerDown = (b: Bubble) => {
    dispatch(layerDownAction(b.id));
  };

  const layerUp = (b: Bubble) => {
    dispatch(layerUpAction(b.id));
  };


  const popChild = (
    b: Bubble,
    openerBubbleId: string,
    openingPosition: OpeningPosition = "bubble-side"
  ): string => {
    dispatch(addBubble(b.toJSON()));
    dispatch(relateBubbles({openerId: openerBubbleId, openeeId: b.id}));

    dispatch(popChildAction({ bubbleId: b.id, openingPosition }));

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
    openerBubbleId: string,
    openingPosition: OpeningPosition = "bubble-side"
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
      return popChild(newBubble, openerBubbleId, openingPosition);
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
        <BubbleRefsProvider>
          <PositionDebuggerProvider isShown={false}>
            <IframeViewer>
              <BubblesLayeredView
              bubbles={bubblesDPO.layers}
              vanishingPoint={globalCoordinateSystem.vanishingPoint}
              onBubbleClick={(name) => console.log("Bubble clicked: " + name)}
              onBubbleClose={deleteBubble}
              onBubbleResize={(bubble) => console.log("Bubble resized: " + bubble.url, bubble.size)}
              onBubbleLayerDown={layerDown}
              onBubbleLayerUp={layerUp}
              onCoordinateSystemReady={handleCoordinateSystemReady}
              />
            </IframeViewer>
          </PositionDebuggerProvider>
        </BubbleRefsProvider>
      </BubblesContext.Provider>

      {/* Igo Game Panel */}
      {isIgoGamePanelOpen ? (
        <Box
          sx={{
            position: "fixed",
            bottom: 20,
            right: 450,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            padding: 2,
            borderRadius: 1,
            zIndex: 1000,
            width: 180,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">囲碁バブリ</Typography>
            <IconButton size="small" onClick={() => setIsIgoGamePanelOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Button
            variant="contained"
            onClick={() => popChildOrJoinSibling(`igo-game/${crypto.randomUUID()}`, "root")}
            fullWidth
            sx={{ backgroundColor: "#dcb35c", "&:hover": { backgroundColor: "#c9a24e" } }}
          >
            対局開始
          </Button>
        </Box>
      ) : (
        <IconButton
          sx={{
            position: "fixed",
            bottom: 20,
            right: 450,
            zIndex: 1000,
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.9)",
            },
          }}
          onClick={() => setIsIgoGamePanelOpen(true)}
        >
          <SportsEsportsIcon />
        </IconButton>
      )}

      {/* Pocket */}
      {isPocketOpen ? (
        <Box
          sx={{
            position: "fixed",
            bottom: 20,
            right: 560,
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
            right: 560,
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

      {/* Task Management Panel */}
      {isTaskManagementPanelOpen ? (
        <Box
          sx={{
            position: "fixed",
            bottom: 20,
            right: 620,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            padding: 2,
            borderRadius: 1,
            zIndex: 1000,
            width: 180,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">タスク管理</Typography>
            <IconButton size="small" onClick={() => setIsTaskManagementPanelOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Button
            variant="contained"
            onClick={() => popChildOrJoinSibling("task-management/tasks", "root")}
            fullWidth
            sx={{ mb: 1 }}
          >
            タスク一覧
          </Button>
        </Box>
      ) : (
        <IconButton
          sx={{
            position: "fixed",
            bottom: 20,
            right: 620,
            zIndex: 1000,
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.9)",
            },
          }}
          onClick={() => setIsTaskManagementPanelOpen(true)}
        >
          <AssignmentIcon />
        </IconButton>
      )}

      {/* Gakkai Shift Panel */}
      {isGakkaiShiftPanelOpen ? (
        <Box
          sx={{
            position: "fixed",
            bottom: 20,
            right: 340,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            padding: 2,
            borderRadius: 1,
            zIndex: 1000,
            width: 200,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">学会シフト</Typography>
            <IconButton size="small" onClick={() => setIsGakkaiShiftPanelOpen(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Button
            variant="outlined"
            onClick={() => popChildOrJoinSibling("gakkai-shift/staffs", "root")}
            fullWidth
            sx={{ mb: 1 }}
          >
            スタッフ一覧
          </Button>
          <Button
            variant="contained"
            onClick={() => popChildOrJoinSibling("gakkai-shift/shift-plans", "root")}
            fullWidth
            sx={{ mb: 1 }}
          >
            シフト配置表
          </Button>
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
          onClick={() => setIsGakkaiShiftPanelOpen(true)}
        >
          <EventNoteIcon />
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
