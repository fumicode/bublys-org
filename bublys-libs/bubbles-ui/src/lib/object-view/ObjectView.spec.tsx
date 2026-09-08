/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { ObjectView } from './ObjectView.js';
import { BubblesContext } from '../bubble-routing/BubbleRouting.js';
import { CurrentBubbleContext } from '../context/CurrentBubbleContext.js';
import { CoordinateSystem } from '@bublys-org/bubbles-ui-util';

/**
 * ObjectView の約束（オブジェクトを表す・ドラッグできる・ダブルクリックで開く）のうち、
 * 「開く」の条件をここで固定する。
 *
 * とくに canOpenBubble —— URL があるだけでは開けず、openingPosition か
 * registerObjectBubble が要る —— は、書き忘れると「黙って開かない」になり画面を見るまで
 * 気づけない。仕様としてテストで留めておく。
 */
const OPENER = 'opener-bubble-id';

const renderWithContext = (ui: React.ReactElement) => {
  const openBubble = jest.fn(() => 'new-bubble-id');
  render(
    <BubblesContext.Provider
      value={{
        surfaceLeftTop: { x: 0, y: 0 },
        coordinateSystem: CoordinateSystem.GLOBAL,
        openBubble,
      }}
    >
      <CurrentBubbleContext.Provider value={OPENER}>{ui}</CurrentBubbleContext.Provider>
    </BubblesContext.Provider>
  );
  return { openBubble };
};

describe('ObjectView が「開く」のはいつか', () => {
  it('openingPosition があればダブルクリックで1回だけ開く', () => {
    const { openBubble } = renderWithContext(
      <ObjectView url="users/1" openingPosition="bubble-side-right" draggable={false}>
        <span>佐藤</span>
      </ObjectView>
    );
    fireEvent.doubleClick(screen.getByText('佐藤'));
    expect(openBubble).toHaveBeenCalledTimes(1);
    expect(openBubble).toHaveBeenCalledWith('users/1', OPENER, 'bubble-side-right');
  });

  it('単クリックでは開かない', () => {
    const { openBubble } = renderWithContext(
      <ObjectView url="users/1" openingPosition="bubble-side-right" draggable={false}>
        <span>佐藤</span>
      </ObjectView>
    );
    fireEvent.click(screen.getByText('佐藤'));
    expect(openBubble).not.toHaveBeenCalled();
  });

  it('Enter でもダブルクリックと同じく開く（role=button を名乗っているので）', () => {
    const { openBubble } = renderWithContext(
      <ObjectView url="users/1" openingPosition="bubble-side-right" draggable={false}>
        <span>佐藤</span>
      </ObjectView>
    );
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(openBubble).toHaveBeenCalledTimes(1);
  });

  it('openingPosition も型登録も無ければ、URL があっても開かない', () => {
    const { openBubble } = renderWithContext(
      <ObjectView url="users/1" draggable={false}>
        <span>佐藤</span>
      </ObjectView>
    );
    fireEvent.doubleClick(screen.getByText('佐藤'));
    expect(openBubble).not.toHaveBeenCalled();
  });

  it('入れ子のときは内側が勝つ（外側は開かない）', () => {
    const { openBubble } = renderWithContext(
      <ObjectView url="schedules/1" openingPosition="bubble-side-right" draggable={false}>
        <span>
          外側
          <ObjectView url="users/1" openingPosition="origin-side" draggable={false}>
            <span>内側</span>
          </ObjectView>
        </span>
      </ObjectView>
    );
    fireEvent.doubleClick(screen.getByText('内側'));
    expect(openBubble).toHaveBeenCalledTimes(1);
    expect(openBubble).toHaveBeenCalledWith('users/1', OPENER, 'origin-side');
  });

  it('onClick は単クリックでだけ走り、開く動作とは独立している', () => {
    const onClick = jest.fn();
    const { openBubble } = renderWithContext(
      <ObjectView url="users/1" openingPosition="bubble-side-right" draggable={false} onClick={onClick}>
        <span>佐藤</span>
      </ObjectView>
    );
    fireEvent.click(screen.getByText('佐藤'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(openBubble).not.toHaveBeenCalled();
  });

  /**
   * 泡の膜は「掴める・開ける」の合図。見た目そのものは jsdom で確かめられないので、
   * 「膜を出すと言っているか（data-film）」と「ObjectView だと名乗っているか」を押さえる。
   * 出たら必ず何かできる、が崩れていないことの回帰テスト。
   */
  describe('泡の膜', () => {
    const surfaceOf = (text: string) =>
      screen.getByText(text).closest('[data-object-view]') as HTMLElement;

    it('ObjectView は DOM 上でも ObjectView だと名乗る', () => {
      renderWithContext(
        <ObjectView type="User" url="users/1" openingPosition="bubble-side-right">
          <span>佐藤</span>
        </ObjectView>
      );
      expect(surfaceOf('佐藤')).not.toBeNull();
    });

    it('開けるなら膜を出す', () => {
      renderWithContext(
        <ObjectView url="users/1" openingPosition="bubble-side-right" draggable={false}>
          <span>佐藤</span>
        </ObjectView>
      );
      expect(surfaceOf('佐藤').dataset.film).toBe('on');
    });

    it('掴めるだけでも膜を出す', () => {
      renderWithContext(
        <ObjectView type="User" url="users/1">
          <span>佐藤</span>
        </ObjectView>
      );
      expect(surfaceOf('佐藤').dataset.film).toBe('on');
    });

    it('掴めも開けもしないなら膜を出さない', () => {
      renderWithContext(
        <ObjectView url="users/1" draggable={false}>
          <span>佐藤</span>
        </ObjectView>
      );
      expect(surfaceOf('佐藤').dataset.film).toBe('off');
    });

    it('draggable でも型が無ければ「掴める」とは言わない', () => {
      renderWithContext(
        <ObjectView url="users/1" draggable>
          <span>佐藤</span>
        </ObjectView>
      );
      // ドラッグのペイロードは型が無いと載らない。開けもしないので膜は出ない
      expect(surfaceOf('佐藤').dataset.film).toBe('off');
    });
  });
});