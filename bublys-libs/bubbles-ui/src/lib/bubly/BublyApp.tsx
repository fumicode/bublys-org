'use client';
import { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { Box, IconButton, List, ListItemButton, ListItemIcon, Tooltip, Typography } from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import {
  useAppSelector,
  useAppDispatch,
  useAppStore,
  selectWindowSize,
  setWindowSize,
  selectPocketItems,
  addPocketItem,
  removePocketItem,
} from '@bublys-org/state-management';
import { CoordinateSystem, Layer } from '@bublys-org/bubbles-ui-util';
import { Bubble, createBubble } from '../Bubble.domain.js';
import { BubblesContext, type OpenBubbleOptions } from '../bubble-routing/BubbleRouting.js';
import { BubbleRefsProvider } from '../context/BubbleRefsContext.js';
import { measureViewport } from '../utils/measure-viewport.js';
import { measureOpenRegion } from '../utils/open-region.js';
import { isNarrowScreen, isSmallScreen, surfaceLeftTopFor } from '../utils/narrow-screen.js';
import {
  selectBubbleLayers,
  selectSurfaceBubbles,
  addBubble,
  deleteProcessBubble as deleteBubbleAction,
  layerDown as layerDownAction,
  layerUp as layerUpAction,
  popChildInProcess as popChildAction,
  popChildMaxInProcess,
  bringToFrontInProcess,
  joinSiblingInProcess as joinSiblingAction,
  relateBubbles,
  removeBubble,
  selectGlobalCoordinateSystem,
  setGlobalCoordinateSystem,
  selectSurfaceLeftTop,
  setSurfaceLeftTop,
  updateBubble,
  OpeningPosition,
  selectHasBubbleOfUrl,
  selectBubbleIdOfUrl,
} from '../state/index.js';
import { BubblesLayeredView, type BubblesLayeredViewProps } from '../ui/BubblesLayeredView.js';
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
  /**
   * **海を差し替える。** 渡すと、真ん中の置き場はこれになる（既定は旧い層の海）。
   *
   * ★ 新しい海（`@bublys-org/bubble-space-shell` の `BubbleSea`）は**この lib を使う側**なので、
   *   ここから呼ぶと輪になる ── だから器の側では受け取るだけにして、何を敷くかは使う側が決める。
   *   `ListSpace` のように「札を並べるのは外の海」という作りの泡は、新しい海でしか描けない。
   */
  sea?: React.ReactNode;
  /**
   * 口（サイドバーの項目・ポケットの札）を押したときの開き方を差し替える。
   * 渡さなければ旧い層に開く。新しい海を敷いたときは、その海の `openBubble` を渡す
   * ── でないと、押した泡が**見えない旧い海のほう**に開く。
   */
  onOpenUrl?: (url: string) => void;
  /** 岸（縁に寄せて離すと貼り付く）を使うか。既定は使う（{@link BubblesLayeredViewProps.isShowreEnabled}） */
  isShowreEnabled?: boolean;
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
  sea,
  onOpenUrl,
  isShowreEnabled,
}) => {
  const dispatch = useAppDispatch();
  const store = useAppStore();
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

  /**
   * ★ **小さい画面では、手前のバブルが画面を使い切る**（utils/narrow-screen.ts）。
   *   奥のレイヤーを覗かせる空きをやめる。メニューの帯は、幅が狭いときだけ下へ寝かせる
   *   （下の描画。横持ちは高さのほうが貴重なので脇のまま）。
   *   そのうえで、**いま表に出ているバブル**を見えている範囲いっぱいに広げる（Bubble.fillInto）。
   *   開いたとき・PC で置いた配置をスマホで開き直したとき・奥のバブルが表に出てきたときの
   *   どれも、この1つの規則で画面いっぱいになる。
   *   広い画面では触らない（海はスクロールでき、画面の外に置くのも使い方のうち）。
   */
  const small = isSmallScreen(pageSize);
  const narrow = isNarrowScreen(pageSize.width);
  useEffect(() => {
    if (pageSize.width === 0) return; // まだ測っていない
    dispatch(setSurfaceLeftTop(surfaceLeftTopFor(pageSize)));
    // 小さい／広いが切り替わったときだけ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, small]);
  useEffect(() => {
    if (!small) return;
    // 帯が下へ移った後の大きさで測りたいので、描画を 1 回待つ
    const frame = requestAnimationFrame(() => {
      const region = measureOpenRegion(surfaceLeftTop);
      if (!region) return;
      for (const b of surfaceBubbles) {
        const filled = b.fillInto(region);
        if (filled !== b) dispatch(updateBubble(filled.toJSON()));
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [small, narrow, pageSize, surfaceLeftTop, surfaceBubbles, dispatch]);

  // アクションハンドラ
  const deleteBubble = useCallback((b: Bubble) => {
    dispatch(deleteBubbleAction(b.id));
    dispatch(removeBubble(b.id));
  }, [dispatch]);

  const layerDown = useCallback((b: Bubble) => {
    dispatch(layerDownAction(b.id));
  }, [dispatch]);

  const layerUp = useCallback((b: Bubble) => {
    dispatch(layerUpAction(b.id));
  }, [dispatch]);

  const popChild = useCallback((
    b: Bubble,
    openerBubbleId: string,
    openingPosition: OpeningPosition = 'bubble-side-right',
    options?: OpenBubbleOptions
  ): string => {
    dispatch(addBubble(b.toJSON()));
    dispatch(relateBubbles({ openerId: openerBubbleId, openeeId: b.id }));
    dispatch(popChildAction({ bubbleId: b.id, openingPosition, droppedAt: options?.droppedAt }));
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
    openerBubbleId: string,
    options?: OpenBubbleOptions
  ): string => {
    dispatch(addBubble(b.toJSON()));
    dispatch(relateBubbles({ openerId: openerBubbleId, openeeId: b.id }));
    dispatch(joinSiblingAction({ bubbleId: b.id, droppedAt: options?.droppedAt }));
    return b.id;
  }, [dispatch]);

  const popChildOrJoinSibling = useCallback((
    name: string,
    openerBubbleId: string,
    openingPosition: OpeningPosition = 'bubble-side-right',
    options?: OpenBubbleOptions
  ): string => {
    const newBubble = createBubble(name);

    // 落として開くときも、レイヤーの決まりは他と同じ。
    // 同じ種類のバブルなら今のレイヤーに並べ、違う種類なら新しいレイヤーを作る。
    // 落とした操作が変えるのは「どこに置くか」だけで、「どのレイヤーか」は変えない。
    if (openingPosition === 'dropped-place') {
      return surfaceBubbles?.[0]?.type === newBubble.type
        ? joinSibling(newBubble, openerBubbleId, options)
        : popChild(newBubble, openerBubbleId, openingPosition, options);
    }

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
    isOpen: (url: string) => selectHasBubbleOfUrl(store.getState() as never, url),
    bringToFront: (url: string) => {
      const id = selectBubbleIdOfUrl(store.getState() as never, url);
      if (id) dispatch(bringToFrontInProcess(id));
    },
  }), [pageSize, surfaceLeftTop, globalCoordinateSystem, popChildOrJoinSibling, store, dispatch]);

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
    if (onOpenUrl) onOpenUrl(url);
    else popChildOrJoinSibling(url, 'root');
  }, [onOpenUrl, popChildOrJoinSibling]);

  const handlePocketRemove = useCallback((id: string) => {
    dispatch(removePocketItem(id));
  }, [dispatch]);

  // ポケットの口の置き場。小さい画面ではメニューの帯の中に収める
  // （バブルの上に浮かせると、画面いっぱいに広げたバブルの中身を隠す）。
  // 縦持ちは下の帯の右端、横持ちは脇の帯の下端。
  const pocketPlace = narrow
    ? { bottom: 6, right: 8 }
    : small
      ? { bottom: 6, left: 4 }
      : { bottom: 20, right: 80 };

  const handleMenuItemClick = (item: BublyMenuItem) => {
    const url = typeof item.url === 'function' ? item.url() : item.url;
    if (onOpenUrl) onOpenUrl(url);
    else popChildOrJoinSibling(url, 'root');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        // 狭い画面では、メニューの帯を下に寝かせる（帯を後ろに描くので column-reverse）
        flexDirection: narrow ? 'column-reverse' : 'row',
        width: '100%',
        // スマホのブラウザはアドレスバーの出入りで 100vh が画面より高くなるので、dvh を使う
        height: '100dvh',
      }}
    >
      {/* サイドバー（アイコンのみ、ホバーでラベル表示）。狭い画面では下の帯になる */}
      <Box
        sx={{
          ...(narrow
            // 右端はポケットの口を置く場所として空けておく（下の Pocket）
            ? { height: 52, borderTop: '1px solid rgba(255,255,255,0.1)', flexDirection: 'row', pr: 7 }
            : {
                width: 56,
                borderRight: '1px solid rgba(255,255,255,0.1)',
                flexDirection: 'column',
                // 小さい画面（横持ち）では、下端をポケットの口を置く場所として空けておく
                ...(small ? { pb: 7 } : {}),
              }),
          backgroundColor: 'rgba(30, 30, 40, 0.95)',
          display: 'flex',
          flexShrink: 0,
        }}
      >
        <Tooltip title={title} placement={narrow ? 'top' : 'right'} arrow>
          <Box
            sx={{
              p: 1.5,
              textAlign: 'center',
              ...(narrow
                ? { borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center' }
                : { borderBottom: '1px solid rgba(255,255,255,0.1)' }),
            }}
          >
            <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 'bold', fontSize: '0.7rem' }}>
              {title.slice(0, 2)}
            </Typography>
          </Box>
        </Tooltip>

        <List
          sx={{
            flex: 1,
            ...(narrow
              ? { display: 'flex', flexDirection: 'row', py: 0, px: 0.5, overflowX: 'auto' }
              : { py: 0.5, overflowY: 'auto' }),
          }}
        >
          {/*
            ★ **メニューはダブルクリックで開く。** 1 回のクリックで開くと、触ってみただけで
              バブルが増えていき、初めての人には「何かが勝手に出てきた」に見える。
              何が開くかはホバーの名前で分かるので、開くと決めたときだけ開く。
          */}
          {menuItems.map((item) => (
            <Tooltip key={item.label} title={`${item.label}（ダブルクリックで開く）`} placement={narrow ? 'top' : 'right'} arrow>
              <ListItemButton
                onDoubleClick={() => handleMenuItemClick(item)}
                sx={{
                  color: 'rgba(255,255,255,0.8)',
                  justifyContent: 'center',
                  px: 0,
                  minHeight: 48,
                  ...(narrow ? { minWidth: 48, flex: '0 0 auto' } : {}),
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

        {/*
          ★ **ほかのデモへ行く口は、ここには置かない。**
            この脇の帯はアイコン 1 列ぶんの幅しかないので、行き先を並べると
            名前が切れて「OS / シフ / 碁 / 学」としか読めない。
            行き先の一覧は OS の「他のデモ」の泡が持っている（`DemoSwitcher` は残す）。
          ★ 下に付くのは、そのバブリが渡した口（`sidebarFooter`）だけ。
            **上の並びと同じアイコン 1 つぶん**にする ── ここだけ字の入った箱にすると、
            幅に収まらずに切れる（実測：「キャッシュクリア」が読めなかった）。
        */}
        {sidebarFooter && (
          <Box
            sx={{
              ...(narrow
                ? { ml: 'auto', borderLeft: '1px solid rgba(255,255,255,0.1)', alignItems: 'center' }
                : { mt: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)' }),
              p: 0.5,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
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
        {sea ?? (
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
                  isShowreEnabled={isShowreEnabled}
                />
              </Box>
            </BubbleRefsProvider>
          </BubblesContext.Provider>
        )}
      </Box>

      {/* Pocket */}
      {isPocketOpen ? (
        <Box sx={{ position: 'fixed', ...pocketPlace, zIndex: 1000 }}>
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
            ...pocketPlace,
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
