import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { RokuyoCalendarView } from './RokuyoCalendarView.js';

const noop = () => undefined;

describe('RokuyoCalendarView（月のカレンダーに六曜）', () => {
  test('日ごとに六曜が出る（2026年1月1日は大安）', () => {
    const { container } = render(
      <RokuyoCalendarView year={2026} month={1} onPrev={noop} onNext={noop} />
    );
    expect(screen.getByText('2026年1月')).toBeTruthy();
    const firstDay = container.querySelectorAll('.e-day')[0];
    expect(firstDay.textContent).toBe('1大安');
    // 31日ぶん、どの日にも六曜が付く
    expect(container.querySelectorAll('.e-rokuyo')).toHaveLength(31);
  });

  test('旧暦の表の範囲の外（2033年）は六曜を出さず、断りを出す', () => {
    const { container } = render(
      <RokuyoCalendarView year={2033} month={6} onPrev={noop} onNext={noop} />
    );
    expect(container.querySelectorAll('.e-rokuyo')).toHaveLength(0);
    expect(screen.getByText('六曜は2020〜2032年の日だけ出します')).toBeTruthy();
  });
});
