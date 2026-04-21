/**
 * シフトパズル マスターデータ
 * Shift を直接定義する（TimeSlot は廃止）
 */

import { Shift, TimeSchedule, type DayType } from "../domain/index.js";
import { createSampleTasks } from "./sampleTask.js";

// ========== シフト定義 ==========

/** dayType ごとの TimeSchedule ID（dayType単位の広い時間枠） */
export const timeScheduleIdForDayType = (dayType: DayType): string => `ts-${dayType}`;

export function createDefaultShifts(): Shift[] {
  const tasks = createSampleTasks();
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const s = (
    id: string,
    taskId: string,
    dayType: DayType,
    startTime: string,
    endTime: string,
    count: number,
    min?: number,
    max?: number,
  ): Shift => {
    const task = taskMap.get(taskId);
    return new Shift({
      id,
      taskId,
      dayType,
      timeScheduleId: timeScheduleIdForDayType(dayType),
      startTime,
      endTime,
      requiredCount: count,
      minCount: min ?? Math.max(1, count - 1),
      maxCount: max ?? count + 1,
      taskName: task?.name,
      responsibleDepartment: task?.responsibleDepartment,
    });
  };

  return [
    // ===== 準準備日 午前 =====
    s('shift-ppm-seisaku-shiki',         'task-seisaku-shiki',          '準準備日', '09:00', '12:00', 1),
    s('shift-ppm-haisen-shikaikan',      'task-haisen-shikaikan',       '準準備日', '09:00', '12:00', 1),
    s('shift-ppm-haisen-support',        'task-haisen-support',         '準準備日', '09:00', '12:00', 3),
    s('shift-ppm-sandan-honbu-setsuei',  'task-sandan-honbu-setsuei',   '準準備日', '09:30', '12:00', 2),

    // ===== 準準備日 午後 =====
    s('shift-ppa-haisen-support',        'task-haisen-support',         '準準備日', '13:00', '17:00', 3),
    s('shift-ppa-kaijou-soshi-age',      'task-kaijou-soshi-age',       '準準備日', '13:00', '17:00', 4),
    s('shift-ppa-zaimu-shiki-junk',      'task-zaimu-shiki-junk',       '準準備日', '13:00', '17:00', 1),

    // ===== 準備日 午前 =====
    s('shift-pm-seisaku-shiki',          'task-seisaku-shiki',          '準備日', '09:00', '12:00', 1),
    s('shift-pm-rami-shikaikan',         'task-rami-shikaikan',         '準備日', '09:00', '12:00', 1),
    s('shift-pm-rami-support',           'task-rami-support',           '準備日', '09:00', '12:00', 4),
    s('shift-pm-ennichi-setsuei',        'task-ennichi-setsuei',        '準備日', '09:30', '12:00', 3),
    s('shift-pm-obakeyashiki-setsuei',   'task-obakeyashiki-setsuei',   '準備日', '09:30', '12:00', 3),
    s('shift-pm-onkyo-setsuei-junk',     'task-onkyo-setsuei-junk',     '準備日', '09:00', '11:00', 2),

    // ===== 準備日 午後 =====
    s('shift-pa-kaijou-soshi-age',       'task-kaijou-soshi-age',       '準備日', '13:00', '17:00', 4),
    s('shift-pa-stamp-rally-setsuei',    'task-stamp-rally-setsuei',    '準備日', '13:00', '15:00', 2),
    s('shift-pa-obakeyashiki-setsuei',   'task-obakeyashiki-setsuei',   '準備日', '13:00', '17:00', 3),
    s('shift-pa-ennichi-setsuei',        'task-ennichi-setsuei',        '準備日', '13:00', '16:00', 2),
    s('shift-pa-shikkobu-honbu-setsuei', 'task-shikkobu-honbu-setsuei', '準備日', '13:00', '15:00', 2),

    // ===== 1日目 午前 =====
    s('shift-d1m-somu-shiki',            'task-somu-shiki',             '1日目', '09:00', '12:00', 1),
    s('shift-d1m-shogai-shiki',          'task-shogai-shiki',           '1日目', '09:00', '12:00', 1),
    s('shift-d1m-kaien-mt',              'task-kaien-mt',               '1日目', '09:00', '09:30', 1, 1, 1),
    s('shift-d1m-sandan-taiou',          'task-sandan-taiou',           '1日目', '09:30', '12:00', 2),
    s('shift-d1m-kigyo-booth-yobikomi',  'task-kigyo-booth-yobikomi',   '1日目', '10:00', '12:00', 2),
    s('shift-d1m-kigyo-booth-kanshi',    'task-kigyo-booth-kanshi',     '1日目', '10:00', '12:00', 2),
    s('shift-d1m-roundman',              'task-roundman',               '1日目', '09:30', '12:00', 3),
    s('shift-d1m-eisei-taiou',           'task-eisei-taiou',            '1日目', '09:00', '12:00', 1),
    s('shift-d1m-joho-server',           'task-joho-server-day1',       '1日目', '09:00', '12:00', 1),
    s('shift-d1m-seeft',                 'task-seeft-day1',             '1日目', '09:30', '12:00', 1),
    s('shift-d1m-ennichi-unei',          'task-ennichi-unei',           '1日目', '10:00', '12:00', 3),
    s('shift-d1m-obakeyashiki-unei',     'task-obakeyashiki-unei',      '1日目', '10:00', '12:00', 4),
    s('shift-d1m-honbu-shiki',           'task-honbu-shiki',            '1日目', '09:00', '12:00', 1),
    s('shift-d1m-honbu-shiki-hosa',      'task-honbu-shiki-hosa',       '1日目', '09:00', '12:00', 1),

    // ===== 1日目 午後 =====
    s('shift-d1a-somu-shiki',            'task-somu-shiki',             '1日目', '13:00', '17:00', 1),
    s('shift-d1a-roundman',              'task-roundman',               '1日目', '13:00', '17:00', 3),
    s('shift-d1a-sandan-taiou',          'task-sandan-taiou',           '1日目', '13:00', '17:00', 2),
    s('shift-d1a-kokudan-taiou',         'task-kokudan-taiou',          '1日目', '13:00', '17:00', 1),
    s('shift-d1a-kigyo-booth-yobikomi',  'task-kigyo-booth-yobikomi',   '1日目', '13:00', '17:00', 2),
    s('shift-d1a-kigyo-booth-kanshi',    'task-kigyo-booth-kanshi',     '1日目', '13:00', '17:00', 2),
    s('shift-d1a-ennichi-unei',          'task-ennichi-unei',           '1日目', '13:00', '17:00', 3),
    s('shift-d1a-obakeyashiki-unei',     'task-obakeyashiki-unei',      '1日目', '13:00', '17:00', 4),
    s('shift-d1a-game-taikai-unei',      'task-game-taikai-unei',       '1日目', '14:00', '17:00', 3),
    s('shift-d1a-hero-show-hare',        'task-hero-show-hare',         '1日目', '14:00', '16:30', 3),
    s('shift-d1a-eisei-taiou',           'task-eisei-taiou',            '1日目', '13:00', '17:00', 1),
    s('shift-d1a-honbu-shiki',           'task-honbu-shiki',            '1日目', '13:00', '17:00', 1),

    // ===== 1日目 夜 =====
    s('shift-d1e-roundman',              'task-roundman',               '1日目', '17:00', '19:00', 2),
    s('shift-d1e-heien-mt',              'task-heien-mt',               '1日目', '17:00', '17:30', 1, 1, 1),
    s('shift-d1e-choshoku-prep',         'task-choshoku-prep',          '1日目', '17:30', '19:30', 2),
    s('shift-d1e-zaimu-shiki',           'task-zaimu-shiki-day1',       '1日目', '17:00', '20:00', 1),
    s('shift-d1e-shikkobu-mt',           'task-shikkobu-mt-day1',       '1日目', '18:00', '19:00', 1, 1, 1),
    s('shift-d1e-bussan-tent',           'task-bussan-tent-day1',       '1日目', '17:00', '19:30', 2),

    // ===== 2日目 午前 =====
    s('shift-d2m-somu-shiki',            'task-somu-shiki',             '2日目', '09:00', '12:00', 1),
    s('shift-d2m-shogai-shiki',          'task-shogai-shiki',           '2日目', '09:00', '12:00', 1),
    s('shift-d2m-kaien-mt',              'task-kaien-mt',               '2日目', '09:00', '09:30', 1, 1, 1),
    s('shift-d2m-sandan-taiou',          'task-sandan-taiou',           '2日目', '09:30', '12:00', 2),
    s('shift-d2m-kigyo-booth-yobikomi',  'task-kigyo-booth-yobikomi',   '2日目', '10:00', '12:00', 2),
    s('shift-d2m-kigyo-booth-kanshi',    'task-kigyo-booth-kanshi',     '2日目', '10:00', '12:00', 2),
    s('shift-d2m-roundman',              'task-roundman',               '2日目', '09:30', '12:00', 3),
    s('shift-d2m-eisei-taiou',           'task-eisei-taiou',            '2日目', '09:00', '12:00', 1),
    s('shift-d2m-joho-server',           'task-joho-server-day2',       '2日目', '09:00', '12:00', 1),
    s('shift-d2m-seeft',                 'task-seeft-day2',             '2日目', '09:30', '12:00', 1),
    s('shift-d2m-bingo-app',             'task-bingo-app',              '2日目', '10:00', '12:00', 1),
    s('shift-d2m-ennichi-unei',          'task-ennichi-unei',           '2日目', '10:00', '12:00', 3),
    s('shift-d2m-obakeyashiki-unei',     'task-obakeyashiki-unei',      '2日目', '10:00', '12:00', 4),
    s('shift-d2m-honbu-shiki',           'task-honbu-shiki',            '2日目', '09:00', '12:00', 1),
    s('shift-d2m-honbu-shiki-hosa',      'task-honbu-shiki-hosa',       '2日目', '09:00', '12:00', 1),

    // ===== 2日目 午後 =====
    s('shift-d2a-somu-shiki',            'task-somu-shiki',             '2日目', '13:00', '17:00', 1),
    s('shift-d2a-roundman',              'task-roundman',               '2日目', '13:00', '17:00', 3),
    s('shift-d2a-sandan-taiou',          'task-sandan-taiou',           '2日目', '13:00', '17:00', 2),
    s('shift-d2a-kigudan-taiou',         'task-kigudan-taiou',          '2日目', '13:00', '17:00', 1),
    s('shift-d2a-kigyo-booth-yobikomi',  'task-kigyo-booth-yobikomi',   '2日目', '13:00', '17:00', 2),
    s('shift-d2a-kigyo-booth-kanshi',    'task-kigyo-booth-kanshi',     '2日目', '13:00', '17:00', 2),
    s('shift-d2a-ennichi-unei',          'task-ennichi-unei',           '2日目', '13:00', '17:00', 3),
    s('shift-d2a-obakeyashiki-unei',     'task-obakeyashiki-unei',      '2日目', '13:00', '17:00', 4),
    s('shift-d2a-game-taikai-unei',      'task-game-taikai-unei',       '2日目', '14:00', '17:00', 3),
    s('shift-d2a-hero-show-hare',        'task-hero-show-hare',         '2日目', '14:00', '16:30', 3),
    s('shift-d2a-eisei-taiou',           'task-eisei-taiou',            '2日目', '13:00', '17:00', 1),
    s('shift-d2a-honbu-shiki',           'task-honbu-shiki',            '2日目', '13:00', '17:00', 1),
    s('shift-d2a-zaimu-shiki',           'task-zaimu-shiki-day2',       '2日目', '13:00', '17:00', 1),

    // ===== 片付け日 午前 =====
    s('shift-cm-seisaku-shiki',          'task-seisaku-shiki',          '片付け日', '09:00', '12:00', 1),
    s('shift-cm-kaijou-soshi-sage',      'task-kaijou-soshi-sage',      '片付け日', '09:00', '12:00', 4),
    s('shift-cm-kigyo-booth-kataduke',   'task-kigyo-booth-kataduke',   '片付け日', '09:00', '12:00', 3),
    s('shift-cm-roundman-final',         'task-roundman-final',         '片付け日', '11:00', '12:00', 1),
    s('shift-cm-zaimu-shiki-kataduke',   'task-zaimu-shiki-kataduke',   '片付け日', '09:00', '12:00', 1),
    s('shift-cm-bussan-tent-kataduke',   'task-bussan-tent-kataduke',   '片付け日', '09:00', '11:00', 2),

    // ===== 片付け日 午後 =====
    s('shift-ca-kaijou-soshi-sage',      'task-kaijou-soshi-sage',      '片付け日', '13:00', '17:00', 3),
    s('shift-ca-rami-support',           'task-rami-support',           '片付け日', '13:00', '16:00', 2),
    s('shift-ca-heien-mt',               'task-heien-mt',               '片付け日', '13:00', '13:30', 1, 1, 1),
    s('shift-ca-kigyo-booth-kataduke',   'task-kigyo-booth-kataduke',   '片付け日', '13:00', '16:00', 2),
    s('shift-ca-honbu-shiki',            'task-honbu-shiki',            '片付け日', '13:00', '17:00', 1),
  ];
}

/** @deprecated createDefaultShifts() を使用してください */
export function createDefaultTasks() {
  return createSampleTasks();
}

/** dayTypeの表示順 */
export const DAY_TYPE_ORDER = ['準準備日', '準備日', '1日目', '2日目', '片付け日'] as const;

// ========== TimeSchedule サンプルデータ ==========

const minutesToTimeStr = (min: number): string => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * dayType 単位に1つの TimeSchedule を生成する。
 * 範囲はその dayType に存在する全シフトの開始～終了の包絡。
 *
 * BlockList は TimeSchedule-scoped で持つ設計のため、TimeSchedule は
 * 「その日の局員配置タイムライン全体」を表す広い枠でなければならない。
 */
export function createDefaultTimeSchedules(): TimeSchedule[] {
  const shifts = createDefaultShifts();
  const envelopeByDayType = new Map<DayType, { start: number; end: number }>();

  for (const shift of shifts) {
    const cur = envelopeByDayType.get(shift.dayType);
    if (!cur) {
      envelopeByDayType.set(shift.dayType, { start: shift.startMinute, end: shift.endMinute });
    } else {
      cur.start = Math.min(cur.start, shift.startMinute);
      cur.end = Math.max(cur.end, shift.endMinute);
    }
  }

  return DAY_TYPE_ORDER
    .filter((dt) => envelopeByDayType.has(dt))
    .map((dt) => {
      const { start, end } = envelopeByDayType.get(dt)!;
      return new TimeSchedule({
        id: timeScheduleIdForDayType(dt),
        dayType: dt,
        startTime: minutesToTimeStr(start),
        endTime: minutesToTimeStr(end),
      });
    });
}
