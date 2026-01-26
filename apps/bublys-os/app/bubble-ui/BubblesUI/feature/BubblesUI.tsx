import { FC, useEffect, useCallback, useState, useMemo } from "react";
import { useAppSelector, useAppDispatch, selectWindowSize, setWindowSize, addPocketItem } from "@bublys-org/state-management";
import { useShellManager } from "@bublys-org/object-shell";

import {
  Bubble,
  createBubble,
  CoordinateSystem,
  BubblesContext,
  BubbleRefsProvider,
  selectBubbleLayers,
  selectSurfaceBubbles,
  addBubble,
  deleteProcessBubble as deleteBubbleAction,
  layerDown as layerDownAction,
  layerUp as layerUpAction,
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
  DragDataType,
} from "@bublys-org/bubbles-ui";
import { PositionDebuggerProvider } from "@bublys-org/bubbles-ui/debug";
import { BubblesLayeredView } from "../ui/BubblesLayeredView";
import { Box, Slider, Typography, IconButton } from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import CloseIcon from "@mui/icons-material/Close";
import { Sidebar } from "../ui/Sidebar";
import "../domain/bubbleRoutes";
import { PocketView } from "../../Pocket/ui/PocketView";

type BubblesUI = {
  additionalButton?: React.ReactNode;
};

export const BubblesUI: FC<BubblesUI> = ({ additionalButton }) => {
  const dispatch = useAppDispatch();
  // レイヤー構造（IDの配列のみ）- 各バブルは自分でReduxから取得
  const bubbleLayers = useAppSelector(selectBubbleLayers);
  // surface判定用（popChild/joinSibling判定のみに使用）
  const surfaceBubbles = useAppSelector(selectSurfaceBubbles);
  const shellManager = useShellManager();

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

  // CoordinateSystem (Reduxから取得、createSelectorでメモ化済み)
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


  const popChild = useCallback((
    b: Bubble,
    openerBubbleId: string,
    openingPosition: OpeningPosition = "bubble-side"
  ): string => {
    dispatch(addBubble(b.toJSON()));
    dispatch(relateBubbles({openerId: openerBubbleId, openeeId: b.id}));

    dispatch(popChildAction({ bubbleId: b.id, openingPosition }));

    return b.id;
  }, [dispatch]);

  const popChildMax = useCallback((b: Bubble, openerBubbleId:string): string => {
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
  }, [dispatch, pageSize, globalCoordinateSystem, surfaceLeftTop]);


  const joinSibling = useCallback((
    b: Bubble,
    openerBubbleId: string
  ): string => {
    dispatch(addBubble(b.toJSON()));
    dispatch(relateBubbles({openerId: openerBubbleId, openeeId: b.id}));

    dispatch(joinSiblingAction(b.id));

    return b.id;
  }, [dispatch]);

  // openBubble 用ロジック（useCallbackでメモ化）
  const popChildOrJoinSibling = useCallback((
    name: string,
    openerBubbleId: string,
    openingPosition: OpeningPosition = "bubble-side"
  ): string => {
    const newBubble = createBubble(name);

    //nameの最後がhistoryであるかどうかをチェック
    const isNameEndWithHistory = /\/history$/.test(name);

    if(isNameEndWithHistory) {
      return popChildMax(newBubble, openerBubbleId);
    }

    if (surfaceBubbles?.[0]?.type === newBubble.type) {
      return joinSibling(newBubble, openerBubbleId);
    } else {
      return popChild(newBubble, openerBubbleId, openingPosition);
    }
  }, [surfaceBubbles, popChild, popChildMax, joinSibling]);

  // CoordinateSystemの更新ハンドラー（useCallbackで安定化）
  const handleCoordinateSystemReady = useCallback((cs: CoordinateSystem) => {
    dispatch(setGlobalCoordinateSystem(cs.toData()));
  }, [dispatch]);

  // BubblesContextの値をメモ化（不要な再レンダリング防止）
  const bubblesContextValue = useMemo(() => ({
    pageSize,
    surfaceLeftTop,
    coordinateSystem: globalCoordinateSystem,
    openBubble: popChildOrJoinSibling,
  }), [pageSize, surfaceLeftTop, globalCoordinateSystem, popChildOrJoinSibling]);

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
  const handlePocketItemClick = useCallback((url: string) => {
    popChildOrJoinSibling(url, "root");
  }, [popChildOrJoinSibling]);

  // Sidebarからのアイテムクリックハンドラー
  const handleSidebarItemClick = useCallback((url: string) => {
    popChildOrJoinSibling(url, "root");
  }, [popChildOrJoinSibling]);

  return (
    <Box sx={{ display: "flex", width: "100%", height: "100vh" }}>
      {/* Left Sidebar */}
      <Sidebar onItemClick={handleSidebarItemClick} />

      {/* Main Bubbles Area */}
      <Box sx={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <BubblesContext.Provider value={bubblesContextValue}>
          <BubbleRefsProvider>
            <PositionDebuggerProvider isShown={true}>
              <Box sx={{ width: '100%', height: '100%' }}>
                <BubblesLayeredView
                  bubbleLayers={bubbleLayers}
                  vanishingPoint={globalCoordinateSystem.vanishingPoint}
                  onBubbleClick={(name) => console.log("Bubble clicked: " + name)}
                  onBubbleClose={deleteBubble}
                  onBubbleResize={(bubble) => console.log("Bubble resized: " + bubble.url, bubble.size)}
                  onBubbleLayerDown={layerDown}
                  onBubbleLayerUp={layerUp}
                  onCoordinateSystemReady={handleCoordinateSystemReady}
                />
              </Box>
            </PositionDebuggerProvider>
          </BubbleRefsProvider>
        </BubblesContext.Provider>
      </Box>

      {/* Pocket */}
      {isPocketOpen ? (
        <Box
          sx={{
            position: "fixed",
            bottom: 20,
            right: 80,
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
            right: 80,
            zIndex: 1000,
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.9)",
            },
          }}
          onClick={() => setIsPocketOpen(true)}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsPocketOpen(true);
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <Inventory2Icon />
        </IconButton>
      )}

      {/* Control Panel - 右上に配置 */}
      {isControlPanelOpen ? (
        <Box
          sx={{
            position: "fixed",
            top: 20,
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
          {additionalButton}
        </Box>
      ) : (
        <IconButton
          sx={{
            position: "fixed",
            top: 20,
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
    </Box>
  );
};
