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
import { CoordinateSystem } from '@bublys-org/bubbles-ui-util';
import { Bubble, createBubble } from '../Bubble.domain.js';
import { BubblesContext } from '../bubble-routing/BubbleRouting.js';
import { BubbleRefsProvider } from '../context/BubbleRefsContext.js';
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
};

/**
 * Bubly スタンドアロンアプリ用の共通UIシェル
 * サイドバー + バブル表示エリアを提供する
 */
export const BublyApp: FC<BublyAppProps> = ({
  title,
  subtitle,
  menuItems,
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
    openingPosition: OpeningPosition = 'bubble-side'
  ): string => {
    dispatch(addBubble(b.toJSON()));
    dispatch(relateBubbles({ openerId: openerBubbleId, openeeId: b.id }));
    dispatch(popChildAction({ bubbleId: b.id, openingPosition }));
    return b.id;
  }, [dispatch]);

  const popChildMax = useCallback((b: Bubble, openerBubbleId: string): string => {
    const availableWidth = pageSize.width - globalCoordinateSystem.offset.x - surfaceLeftTop.x;
    const availableHeight = pageSize.height - globalCoordinateSystem.offset.y - surfaceLeftTop.y;

    const resizedBubble = b.resizeTo({ width: availableWidth, height: availableHeight });
    const movedBubble = resizedBubble.moveTo({ x: 0, y: 0 });

    dispatch(addBubble(movedBubble.toJSON()));
    dispatch(relateBubbles({ openerId: openerBubbleId, openeeId: movedBubble.id }));
    dispatch(popChildMaxInProcess(b.id));

    return b.id;
  }, [dispatch, pageSize, globalCoordinateSystem, surfaceLeftTop]);

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
    openingPosition: OpeningPosition = 'bubble-side'
  ): string => {
    const newBubble = createBubble(name);

    const isNameEndWithHistory = /\/history$/.test(name);

    if (isNameEndWithHistory) {
      return popChildMax(newBubble, openerBubbleId);
    }

    if (surfaceBubbles?.[0]?.type === newBubble.type) {
      return joinSibling(newBubble, openerBubbleId);
    } else {
      return popChild(newBubble, openerBubbleId, openingPosition);
    }
  }, [surfaceBubbles, popChild, popChildMax, joinSibling]);

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
      </Box>

      {/* メインエリア（バブル表示） */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
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
