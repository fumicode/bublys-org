import { ScheduleReport } from './ScheduleReport.js';

describe('ScheduleReport（シフト表完成レポート）の使い方', () => {
  const create = () =>
    ScheduleReport.create({
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
      contributionScores: [
        { staffId: 'staff-A', compromiseCount: 1, busyDayCount: 1, score: 3 },
        { staffId: 'staff-B', compromiseCount: 0, busyDayCount: 1, score: 1 },
      ],
    });

  test('id は勤務表×確定ノードで一意', () => {
    expect(create().id).toBe('schedule-A:node-1');
    expect(ScheduleReport.idOf('schedule-B', 'node-9')).toBe('schedule-B:node-9');
  });

  test('確定時に渡したデータをそのまま保持する', () => {
    const r = create();
    expect(r.compromises).toHaveLength(1);
    expect(r.busyDayContributions).toHaveLength(1);
    expect(r.contributionScores).toHaveLength(2);
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
    const restored = ScheduleReport.fromPlain(r.toPlain());
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

  test('重みは既定で妥協×2・繁忙日×1', () => {
    const base = create();
    expect(base.compromiseWeight).toBe(2);
    expect(base.busyDayWeight).toBe(1);
  });

  test('reweight で重みを変えると貢献度スコアが再計算される（不変）', () => {
    const base = create();
    // staff-A: 妥協1・繁忙日1, staff-B: 妥協0・繁忙日1
    const reweighted = base.reweight(1, 3);

    expect(reweighted.compromiseWeight).toBe(1);
    expect(reweighted.busyDayWeight).toBe(3);
    expect(reweighted.contributionScores).toEqual([
      { staffId: 'staff-A', compromiseCount: 1, busyDayCount: 1, score: 4 }, // 1*1+1*3
      { staffId: 'staff-B', compromiseCount: 0, busyDayCount: 1, score: 3 }, // 0*1+1*3
    ]);
    // 生データ（妥協・繁忙日の事実）は変わらない
    expect(reweighted.compromises).toEqual(base.compromises);
    expect(reweighted.busyDayContributions).toEqual(base.busyDayContributions);
    // 元は不変
    expect(base.compromiseWeight).toBe(2);
  });

  test('reweight は貢献度スコアの降順で並べ直す', () => {
    // 繁忙日の重みを上げると staff-B（繁忙日のみ）が staff-A を上回る場合がある
    const base = create();
    const reweighted = base.reweight(0, 5);

    expect(reweighted.contributionScores).toEqual([
      { staffId: 'staff-A', compromiseCount: 1, busyDayCount: 1, score: 5 },
      { staffId: 'staff-B', compromiseCount: 0, busyDayCount: 1, score: 5 },
    ]);
  });

  test('reweight に負の重みを渡すと 0 に丸める', () => {
    const reweighted = create().reweight(-1, -2);
    expect(reweighted.compromiseWeight).toBe(0);
    expect(reweighted.busyDayWeight).toBe(0);
    expect(reweighted.contributionScores.every((s) => s.score === 0)).toBe(true);
  });

  test('重みも toPlain / fromPlain でラウンドトリップできる', () => {
    const r = create().reweight(1, 3);
    const restored = ScheduleReport.fromPlain(r.toPlain());
    expect(restored.compromiseWeight).toBe(1);
    expect(restored.busyDayWeight).toBe(3);
  });

  test('fromPlain は重みが無い旧データを既定値で補う（後方互換）', () => {
    const plain = create().toPlain();
    // 旧データを模して重みフィールドを取り除く
    const legacyPlain = { ...plain } as Partial<typeof plain>;
    delete legacyPlain.compromiseWeight;
    delete legacyPlain.busyDayWeight;

    const restored = ScheduleReport.fromPlain(legacyPlain as typeof plain);
    expect(restored.compromiseWeight).toBe(2);
    expect(restored.busyDayWeight).toBe(1);
  });
});
