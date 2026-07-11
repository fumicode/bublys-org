import { ScheduleConstraints } from './ScheduleConstraints.js';

describe('ScheduleConstraints の参考レポート紐づけ（linkReport/unlinkReport）', () => {
  const create = () =>
    new ScheduleConstraints({ scheduleId: 'schedule-A', leaderRules: [] });

  test('既定は紐づけ無し', () => {
    expect(create().linkedReportIds).toEqual([]);
  });

  test('linkReport で紐づけを追加できる（不変）', () => {
    const base = create();
    const linked = base.linkReport('report-1');
    expect(linked.linkedReportIds).toEqual(['report-1']);
    // 元は不変
    expect(base.linkedReportIds).toEqual([]);
  });

  test('同じレポートを重複して紐づけない', () => {
    const linked = create().linkReport('report-1').linkReport('report-1');
    expect(linked.linkedReportIds).toEqual(['report-1']);
  });

  test('複数のレポートを紐づけられる', () => {
    const linked = create().linkReport('report-1').linkReport('report-2');
    expect(linked.linkedReportIds).toEqual(['report-1', 'report-2']);
  });

  test('unlinkReport で紐づけを解除できる（不変）', () => {
    const linked = create().linkReport('report-1').linkReport('report-2');
    const unlinked = linked.unlinkReport('report-1');
    expect(unlinked.linkedReportIds).toEqual(['report-2']);
    // 元は不変
    expect(linked.linkedReportIds).toEqual(['report-1', 'report-2']);
  });

  test('紐づいていないレポートを解除しても何も起きない', () => {
    const linked = create().linkReport('report-1');
    expect(linked.unlinkReport('report-9').linkedReportIds).toEqual(['report-1']);
  });

  test('toPlain / fromPlain でラウンドトリップできる', () => {
    const linked = create().linkReport('report-1').linkReport('report-2');
    const restored = ScheduleConstraints.fromPlain(linked.toPlain());
    expect(restored.linkedReportIds).toEqual(['report-1', 'report-2']);
  });
});
