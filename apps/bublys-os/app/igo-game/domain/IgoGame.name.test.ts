/**
 * 対局の名前 ── **ユーザーが付けるもの**。
 * 種類（9路・対局）を名前の場所に書かない、が守られているかを見る。
 */
import { IgoGame_囲碁ゲーム } from './IgoGame';

describe('対局の名前', () => {
  it('作ったばかりの対局には名前が無い', () => {
    const game = IgoGame_囲碁ゲーム.create('g1');
    expect(game.hasName).toBe(false);
    expect(game.state.name).toBeUndefined();
  });

  it('名前が無いときは「無題」と言う（種類は言わない）', () => {
    const game = IgoGame_囲碁ゲーム.create('g1');
    expect(game.displayName).toBe('無題');
    expect(game.displayName).not.toContain('路');
  });

  it('名前を付けると、新しいインスタンスが返る（元は変わらない）', () => {
    const game = IgoGame_囲碁ゲーム.create('g1');
    const named = game.rename('定石の練習');
    expect(named).not.toBe(game);
    expect(named.displayName).toBe('定石の練習');
    expect(game.displayName).toBe('無題');
  });

  it('前後の空白は落とす。空にすれば名前は無くなる', () => {
    const named = IgoGame_囲碁ゲーム.create('g1').rename('  棋譜A  ');
    expect(named.state.name).toBe('棋譜A');
    const cleared = named.rename('   ');
    expect(cleared.hasName).toBe(false);
    expect(cleared.displayName).toBe('無題');
  });

  it('同じ名前を付け直しても、世界線を伸ばさない（同じインスタンスを返す）', () => {
    const named = IgoGame_囲碁ゲーム.create('g1').rename('棋譜A');
    expect(named.rename('棋譜A')).toBe(named);
    expect(named.rename(' 棋譜A ')).toBe(named);
  });

  it('名前は保存して読み戻せる', () => {
    const named = IgoGame_囲碁ゲーム.create('g1').rename('棋譜A');
    expect(IgoGame_囲碁ゲーム.fromJSON(named.toJSON()).displayName).toBe('棋譜A');
  });

  it('名前を付けても盤は変わらない', () => {
    const played = IgoGame_囲碁ゲーム.create('g1').placeStone(2, 2);
    const named = played.rename('棋譜A');
    expect(named.state.moveHistory).toEqual(played.state.moveHistory);
    expect(named.getStone(2, 2)).toBe('black');
  });
});
