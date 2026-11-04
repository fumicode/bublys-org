import { ConfirmedSchedule } from './ConfirmedSchedule.js';

describe('ConfirmedSchedule（確定版と振り返り）の使い方', () => {
  const create = () =>
    ConfirmedSchedule.create({
      scheduleId: 'schedule-A',
      worldLineNodeId: 'node-1',
      year: 2026,
      month: 6,
      storeId: 'store-1',
      compromises: [
        {
          staffId: 'staff-A',
          label: '希望',
          dayKeys: ['2026-06-01'],
          message: '希望と異なる割当です（希望: 早番○ ／ 割当: 休み）',
        },
      ],
      busyDayContributions: [
        { dayKey: '2026-06-10', requiredCount: 5, workedStaffIds: ['staff-A', 'staff-B'] },
      ],
      stars: [
        { staffId: 'staff-A', compromiseCount: 1, busyDayCount: 1, score: 3 },
        { staffId: 'staff-B', compromiseCount: 0, busyDayCount: 1, score: 1 },
      ],
    });

  test('id は店舗×月で一意（どの勤務表・どの版かには依らない）', () => {
    expect(create().id).toBe('store-1:2026-06');
    expect(ConfirmedSchedule.idFor('store-2', 2026, 12)).toBe('store-2:2026-12');
    expect(create().version).toEqual({ scheduleId: 'schedule-A', worldLineNodeId: 'node-1' });
  });

  test('確定時に渡したデータをそのまま保持する', () => {
    const r = create();
    expect(r.compromises).toHaveLength(1);
    expect(r.busyDayContributions).toHaveLength(1);
    expect(r.stars).toHaveLength(2);
  });

  test('starsOf はそのスタッフの★を返す（行が無ければ 0）', () => {
    const r = create();
    expect(r.starsOf('staff-A')).toBe(3);
    expect(r.starsOf('staff-B')).toBe(1);
    expect(r.starsOf('staff-Z')).toBe(0);
  });

  test('★を「貢献度スコア」と呼んでいた頃の保存形（contributionScores）も読める', () => {
    const { stars, ...rest } = create().toPlain();
    const restored = ConfirmedSchedule.fromPlain({ ...rest, contributionScores: stars });
    expect(restored.starsOf('staff-A')).toBe(3);
    expect(restored.toPlain()).not.toHaveProperty('contributionScores');
  });

  describe('precedingIdFor（引き継ぐのは同じ店舗の前月の確定版）', () => {
    test('同じ店舗の、ちょうど1か月前', () => {
      expect(ConfirmedSchedule.precedingIdFor({ storeId: 'store-1', year: 2026, month: 7 })).toBe(
        create().id
      );
    });

    test('1月の前月は前年12月', () => {
      expect(ConfirmedSchedule.precedingIdFor({ storeId: 'store-1', year: 2027, month: 1 })).toBe(
        'store-1:2026-12'
      );
    });
  });

  describe('confirm（確定版は店舗×月で1つ。確定し直すと置き換わる）', () => {
    const params = (scheduleId: string, worldLineNodeId: string) => ({
      scheduleId,
      worldLineNodeId,
      year: 2026,
      month: 6,
      storeId: 'store-1',
      compromises: [],
      busyDayContributions: [],
      stars: [{ staffId: 'staff-A', compromiseCount: 1, busyDayCount: 2, score: 4 }],
      confirmedAt: 2000,
    });

    test('確定版が無ければ、そのまま新しく作る', () => {
      const r = ConfirmedSchedule.confirm(params('schedule-A', 'node-1'));
      expect(r.id).toBe('store-1:2026-06');
      expect(r.isVersion({ scheduleId: 'schedule-A', worldLineNodeId: 'node-1' })).toBe(true);
    });

    test('置き換えると版と振り返りは新しくなり、手で書いた部分は引き継ぐ', () => {
      const current = create()
        .rename('6月（本番）')
        .setNote('staff-A', '来月は休みを優先')
        .reweight(3, 1);
      // 別の勤務表で確定し直す
      const next = ConfirmedSchedule.confirm(params('schedule-B', 'node-7'), current);

      expect(next.id).toBe(current.id);
      expect(next.isVersion({ scheduleId: 'schedule-B', worldLineNodeId: 'node-7' })).toBe(true);
      expect(next.isVersion(current.version)).toBe(false);
      expect(next.confirmedAt).toBe(2000);
      expect(next.compromises).toEqual([]);
      expect(next.title).toBe('6月（本番）');
      expect(next.noteFor('staff-A')).toBe('来月は休みを優先');
      // スコアは引き継いだ重みで出し直す（譲歩1×3 + 繁忙日2×1）
      expect(next.compromiseWeight).toBe(3);
      expect(next.starsOf('staff-A')).toBe(5);
    });

    test('別の店舗・月の確定版は置き換えられない', () => {
      const other = ConfirmedSchedule.confirm({ ...params('schedule-A', 'node-1'), month: 7 });
      expect(() => ConfirmedSchedule.confirm(params('schedule-A', 'node-1'), other)).toThrow();
    });
  });

  test('配慮メモは既定で空、setNote で設定できる（不変）', () => {
    const base = create();
    expect(base.noteFor('staff-A')).toBe('');

    const noted = base.setNote('staff-A', '来月は休み希望を優先してあげたい');
    expect(noted.noteFor('staff-A')).toBe('来月は休み希望を優先してあげたい');
    // 元は不変
    expect(base.noteFor('staff-A')).toBe('');
  });

  test('setNote に空文字を渡すとメモを消す', () => {
    const noted = create().setNote('staff-A', 'メモ');
    const cleared = noted.setNote('staff-A', '   ');
    expect(cleared.noteFor('staff-A')).toBe('');
    expect(cleared.toPlain().considerationNotes).toEqual({});
  });

  test('toPlain / fromPlain でラウンドトリップできる', () => {
    const r = create().setNote('staff-B', '繁忙日に強い');
    const restored = ConfirmedSchedule.fromPlain(r.toPlain());
    expect(restored.toPlain()).toEqual(r.toPlain());
    expect(() => JSON.stringify(r.toPlain())).not.toThrow();
  });

  test('タイトルは既定で "{year}年{month}月"、rename で変更できる（不変）', () => {
    const base = create();
    expect(base.title).toBe('2026年6月');

    const renamed = base.rename('6月案A');
    expect(renamed.title).toBe('6月案A');
    // 元は不変
    expect(base.title).toBe('2026年6月');
  });

  test('rename に空文字を渡すと既定のタイトルに戻る', () => {
    const renamed = create().rename('6月案A').rename('   ');
    expect(renamed.title).toBe('2026年6月');
  });

  test('重みは既定で譲歩×2・繁忙日×1', () => {
    const base = create();
    expect(base.compromiseWeight).toBe(2);
    expect(base.busyDayWeight).toBe(1);
  });

  test('reweight で重みを変えると★が再計算される（不変）', () => {
    const base = create();
    // staff-A: 譲歩1・繁忙日1, staff-B: 譲歩0・繁忙日1
    const reweighted = base.reweight(1, 3);

    expect(reweighted.compromiseWeight).toBe(1);
    expect(reweighted.busyDayWeight).toBe(3);
    expect(reweighted.stars).toEqual([
      { staffId: 'staff-A', compromiseCount: 1, busyDayCount: 1, score: 4 }, // 1*1+1*3
      { staffId: 'staff-B', compromiseCount: 0, busyDayCount: 1, score: 3 }, // 0*1+1*3
    ]);
    // 生データ（譲歩・繁忙日の事実）は変わらない
    expect(reweighted.compromises).toEqual(base.compromises);
    expect(reweighted.busyDayContributions).toEqual(base.busyDayContributions);
    // 元は不変
    expect(base.compromiseWeight).toBe(2);
  });

  test('reweight は★の降順で並べ直す', () => {
    // 繁忙日の重みを上げると staff-B（繁忙日のみ）が staff-A を上回る場合がある
    const base = create();
    const reweighted = base.reweight(0, 5);

    expect(reweighted.stars).toEqual([
      { staffId: 'staff-A', compromiseCount: 1, busyDayCount: 1, score: 5 },
      { staffId: 'staff-B', compromiseCount: 0, busyDayCount: 1, score: 5 },
    ]);
  });

  test('reweight に負の重みを渡すと 0 に丸める', () => {
    const reweighted = create().reweight(-1, -2);
    expect(reweighted.compromiseWeight).toBe(0);
    expect(reweighted.busyDayWeight).toBe(0);
    expect(reweighted.stars.every((s) => s.score === 0)).toBe(true);
  });

  test('重みも toPlain / fromPlain でラウンドトリップできる', () => {
    const r = create().reweight(1, 3);
    const restored = ConfirmedSchedule.fromPlain(r.toPlain());
    expect(restored.compromiseWeight).toBe(1);
    expect(restored.busyDayWeight).toBe(3);
  });

  test('fromPlain は重みが無い旧データを既定値で補う（後方互換）', () => {
    const plain = create().toPlain();
    // 旧データを模して重みフィールドを取り除く
    const legacyPlain = { ...plain } as Partial<typeof plain>;
    delete legacyPlain.compromiseWeight;
    delete legacyPlain.busyDayWeight;

    const restored = ConfirmedSchedule.fromPlain(legacyPlain as typeof plain);
    expect(restored.compromiseWeight).toBe(2);
    expect(restored.busyDayWeight).toBe(1);
  });

  test('確定時刻を持てる。toPlain / fromPlain で残り、古い記録には無い', () => {
    const report = ConfirmedSchedule.create({
      scheduleId: 's', worldLineNodeId: 'n', year: 2026, month: 6, storeId: 'store-1',
      compromises: [], busyDayContributions: [], stars: [],
      confirmedAt: 1700000000000,
    });
    expect(ConfirmedSchedule.fromPlain(report.toPlain()).confirmedAt).toBe(1700000000000);
    expect(create().confirmedAt).toBeUndefined();
    expect('confirmedAt' in create().toPlain()).toBe(false);
  });

});
