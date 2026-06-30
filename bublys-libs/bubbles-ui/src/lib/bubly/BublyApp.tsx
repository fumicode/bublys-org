'use client';
import { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { Box, IconButton, List, ListItemButton, ListItemIcon, Tooltip, Typography } from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import {
  useAppSelector,
  useAppDispatch,
  selectWindowSize,
  setWindowSize,
  selectPocketItems,
  addPocketItem,
  removePocketItem,
} from '@bublys-org/state-management';
import { CoordinateSystem, Layer } from '@bublys-org/bubbles-ui-util';
import { Bubble, createBubble } from '../Bubble.domain.js';
import { BubblesContext } from '../bubble-routing/BubbleRouting.js';
import { BubbleRefsProvider } from '../context/BubbleRefsContext.js';
import { measureViewport } from '../utils/measure-viewport.js';
import {
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
  OpeningPosition,
} from '../state/index.js';
import { BubblesLayeredView } from '../ui/BubblesLayeredView.js';
import { PocketView } from '../pocket/PocketView.js';
import { DragDataType } from '../utils/drag-types.js';
import { BublyMenuItem } from './BublyTypes.js';

/**
 * BublyApp のプロパティ
 */
export type BublyAppProps = {
  /** サイドバーに表示するタイトル */
  title: string;
  /** サイドバーに表示するサブタイトル（オプション） */
  subtitle?: string;
  /** サイドバーのメニュー項目 */
  menuItems: BublyMenuItem[];
  /** サイドバーのフッター（オプション） */
  sidebarFooter?: React.ReactNode;
  /**
   * このバブリの「夜空」色。バブル表示エリアの背景に塗られる。
   * 任意の CSS color 文字列。未指定なら透明（白背景）。
   * bublys-os にネストされたときも UniverseBubbleView 経由で同じ色が使われる想定。
   */
  backdropColor?: string;
};

/**
 * Bubly スタンドアロンアプリ用の共通UIシェル
 * サイドバー + バブル表示エリアを提供する
 */
export const BublyApp: FC<BublyAppProps> = ({
  title,
  subtitle,
  menuItems,
  sidebarFooter,
  backdropColor,
}) => {
  const dispatch = useAppDispatch();
  const bubbleLayers = useAppSelector(selectBubbleLayers);
  const surfaceBubbles = useAppSelector(selectSurfaceBubbles);

  // ページサイズ管理
  const pageSize = useAppSelector(selectWindowSize);
  useEffect(() => {
    const update = () =>
      dispatch(
        setWindowSize({ width: window.innerWidth, height: window.innerHeight })
      );
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [dispatch]);

  // CoordinateSystem
  const globalCoordinateSystem = useAppSelector(selectGlobalCoordinateSystem);
  const surfaceLeftTop = useAppSelector(selectSurfaceLeftTop);

  // アクションハンドラ
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

  const popChild = useCallback((
    b: Bubble,
    openerBubbleId: string,
    openingPosition: OpeningPosition = 'right-side'
  ): string => {
    dispatch(addBubble(b.toJSON()));
    dispatch(relateBubbles({ openerId: openerBubbleId, openeeId: b.id }));
    dispatch(popChildAction({ bubbleId: b.id, openingPosition }));
    return b.id;
  }, [dispatch]);

  // 可視 surface 領域の「下部」に、左右いっぱいのストリップとして開く（世界線ビュー等）。
  // UniverseView の popChildViewPortBelow と同じ振る舞いに揃える（最大化ではなく下部ストリップ）。
  const popChildViewPortBelow = useCallback((b: Bubble, openerBubbleId: string): string => {
    const viewport = measureViewport();
    const surfaceLayer = new Layer(0, surfaceLeftTop, globalCoordinateSystem.vanishingPoint);
    const visible = viewport?.visibleRegion() ?? {
      origin: { x: 0, y: 0 },
      size: { width: 0, height: 0 },
    };

    const availableWidth = visible.size.width - surfaceLayer.surfaceOrigin.x;
    const availableHeight = visible.size.height - surfaceLayer.surfaceOrigin.y;
    const height = Math.round(availableHeight * 0.45);
    const newPosition = {
      x: visible.origin.x,
      y: visible.origin.y + (availableHeight - height),
    };

    const resizedBubble = b.resizeTo({ width: availableWidth, height });
    const movedBubble = resizedBubble.moveTo(newPosition);

    dispatch(addBubble(movedBubble.toJSON()));
    dispatch(relateBubbles({ openerId: openerBubbleId, openeeId: movedBubble.id }));
    // popChildMaxInProcess を再利用（前面化＋アニメのみ。再配置リスナーは走らない）。
    dispatch(popChildMaxInProcess(b.id));

    return b.id;
  }, [dispatch, surfaceLeftTop, globalCoordinateSystem]);

  const joinSibling = useCallback((
    b: Bubble,
    openerBubbleId: string
  ): string => {
    dispatch(addBubble(b.toJSON()));
    dispatch(relateBubbles({ openerId: openerBubbleId, openeeId: b.id }));
    dispatch(joinSiblingAction(b.id));
    return b.id;
  }, [dispatch]);

  const popChildOrJoinSibling = useCallback((
    name: string,
    openerBubbleId: string,
    openingPosition: OpeningPosition = 'right-side'
  ): string => {
    const newBubble = createBubble(name);

    const isNameEndWithHistory = /\/history$/.test(name);

    if (isNameEndWithHistory) {
      return popChildViewPortBelow(newBubble, openerBubbleId);
    }

    if (surfaceBubbles?.[0]?.type === newBubble.type) {
      return joinSibling(newBubble, openerBubbleId);
    } else {
      return popChild(newBubble, openerBubbleId, openingPosition);
    }
  }, [surfaceBubbles, popChild, popChildViewPortBelow, joinSibling]);

  const handleCoordinateSystemReady = useCallback((cs: CoordinateSystem) => {
    dispatch(setGlobalCoordinateSystem(cs.toData()));
  }, [dispatch]);

  const bubblesContextValue = useMemo(() => ({
    pageSize,
    surfaceLeftTop,
    coordinateSystem: globalCoordinateSystem,
    openBubble: popChildOrJoinSibling,
  }), [pageSize, surfaceLeftTop, globalCoordinateSystem, popChildOrJoinSibling]);

  // Pocket
  const [isPocketOpen, setIsPocketOpen] = useState(false);
  const pocketItems = useAppSelector(selectPocketItems);

  const handlePocketDrop = useCallback((url: string, type: DragDataType, label?: string, objectId?: string) => {
    dispatch(addPocketItem({
      id: crypto.randomUUID(),
      url,
      type,
      objectId,
      label,
      addedAt: Date.now(),
    }));
  }, [dispatch]);

  const handlePocketItemClick = useCallback((url: string) => {
    popChildOrJoinSibling(url, 'root');
  }, [popChildOrJoinSibling]);

  const handlePocketRemove = useCallback((id: string) => {
    dispatch(removePocketItem(id));
  }, [dispatch]);

  const handleMenuItemClick = (item: BublyMenuItem) => {
    const url = typeof item.url === 'function' ? item.url() : item.url;
    popChildOrJoinSibling(url, 'root');
  };

  return (
    <Box sx={{ display: 'flex', width: '100%', height: '100vh' }}>
      {/* サイドバー（アイコンのみ、ホバーでラベル表示） */}
      <Box
        sx={{
          width: 56,
          backgroundColor: 'rgba(30, 30, 40, 0.95)',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <Tooltip title={title} placement="right" arrow>
          <Box sx={{ p: 1.5, borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
            <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 'bold', fontSize: '0.7rem' }}>
              {title.slice(0, 2)}
            </Typography>
          </Box>
        </Tooltip>

        <List sx={{ flex: 1, py: 0.5 }}>
          {menuItems.map((item) => (
            <Tooltip key={item.label} title={item.label} placement="right" arrow>
              <ListItemButton
                onClick={() => handleMenuItemClick(item)}
                sx={{
                  color: 'rgba(255,255,255,0.8)',
                  justifyContent: 'center',
                  px: 0,
                  minHeight: 48,
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'rgba(255,255,255,0.6)', minWidth: 0, justifyContent: 'center' }}>
                  {item.icon}
                </ListItemIcon>
              </ListItemButton>
            </Tooltip>
          ))}
        </List>

        {/* フッター */}
        {sidebarFooter && (
          <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {sidebarFooter}
          </Box>
        )}
      </Box>

      {/* メインエリア（バブル表示）。backdropColor がこの bubly の「夜空」。
          OS にネストされたときの UniverseBubbleView シェル色と同じ色を使う想定。 */}
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          background: backdropColor ?? 'transparent',
        }}
      >
        <BubblesContext.Provider value={bubblesContextValue}>
          <BubbleRefsProvider>
            <Box sx={{ width: '100%', height: '100%' }}>
              <BubblesLayeredView
                bubbleLayers={bubbleLayers}
                vanishingPoint={globalCoordinateSystem.vanishingPoint}
                onBubbleClose={deleteBubble}
                onBubbleLayerDown={layerDown}
                onBubbleLayerUp={layerUp}
                onCoordinateSystemReady={handleCoordinateSystemReady}
              />
            </Box>
          </BubbleRefsProvider>
        </BubblesContext.Provider>
      </Box>

      {/* Pocket */}
      {isPocketOpen ? (
        <Box sx={{ position: 'fixed', bottom: 20, right: 80, zIndex: 1000 }}>
          <PocketView
            items={pocketItems}
            onRemove={handlePocketRemove}
            onDrop={handlePocketDrop}
            onItemClick={handlePocketItemClick}
            onClose={() => setIsPocketOpen(false)}
          />
        </Box>
      ) : (
        <IconButton
          sx={{
            position: 'fixed',
            bottom: 20,
            right: 80,
            zIndex: 1000,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
    </Box>
  );
};
