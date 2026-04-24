/**
 * シフトパズル マスターデータ
 * Shift を直接定義する（TimeSlot は廃止）
 *
 * 時間帯は 07:00〜22:00 まで広く取り、必要人数も 1〜12 人で実運用を想定したバラつきを持たせている。
 */

import { Shift, TimeSchedule, type DayType, type WeatherCondition } from "../domain/index.js";
import { createSampleTasks } from "./sampleTask.js";

// ========== シフト定義 ==========

/** dayType ごとの TimeSchedule ID（dayType単位の広い時間枠） */
export const timeScheduleIdForDayType = (dayType: DayType): string => `ts-${dayType}`;

export function createDefaultShifts(): Shift[] {
  const tasks = createSampleTasks();
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  /**
   * Shift 生成ヘルパ
   * @param count 必要人数（推奨値）。min/max はデフォルトで ±1（人数が多い時は広めに）
   * @param opts min/max/weatherCondition を個別指定したい場合
   */
  const s = (
    id: string,
    taskId: string,
    dayType: DayType,
    startTime: string,
    endTime: string,
    count: number,
    opts?: { min?: number; max?: number; weather?: WeatherCondition },
  ): Shift => {
    const task = taskMap.get(taskId);
    // count が大きいほど min/max の許容幅を広げる
    const spread = count <= 2 ? 1 : count <= 5 ? 1 : 2;
    return new Shift({
      id,
      taskId,
      dayType,
      timeScheduleId: timeScheduleIdForDayType(dayType),
      startTime,
      endTime,
      weatherCondition: opts?.weather,
      requiredCount: count,
      minCount: opts?.min ?? Math.max(1, count - spread),
      maxCount: opts?.max ?? count + spread,
      taskName: task?.name,
      responsibleDepartment: task?.responsibleDepartment,
    });
  };

  /** min=max=count（固定人数） */
  const fixed = (count: number) => ({ min: count, max: count });

  return [
    // ======================================================
    // 準準備日
    // ======================================================
    s('shift-pp-seisaku-shiki',          'task-seisaku-shiki',          '準準備日', '09:00', '17:00', 1),
    s('shift-pp-haisen-shikaikan',       'task-haisen-shikaikan',       '準準備日', '09:00', '17:00', 1),
    s('shift-pp-haisen-support-am',      'task-haisen-support',         '準準備日', '09:00', '12:00', 8),
    s('shift-pp-haisen-support-pm',      'task-haisen-support',         '準準備日', '13:00', '17:00', 8),
    s('shift-pp-zaimu-shiki',            'task-zaimu-shiki-junk',       '準準備日', '09:00', '17:00', 1),
    s('shift-pp-sandan-honbu-setsuei',   'task-sandan-honbu-setsuei',   '準準備日', '13:00', '17:00', 4),
    s('shift-pp-shikkobu-honbu-setsuei', 'task-shikkobu-honbu-setsuei', '準準備日', '10:00', '12:00', 3),
    s('shift-pp-tent-nagaoka-univ',      'task-tent-nagaoka-univ',      '準準備日', '10:00', '11:30', 2),
    s('shift-pp-tent-nagaoka-kosen',     'task-tent-nagaoka-kosen',     '準準備日', '14:00', '15:30', 2),

    // ======================================================
    // 準備日
    // ======================================================
    s('shift-p-seisaku-shiki',         'task-seisaku-shiki',         '準備日', '08:00', '20:00', 1),
    s('shift-p-somu-shiki',            'task-somu-shiki',            '準備日', '09:00', '17:00', 1),
    s('shift-p-honbu-shiki',           'task-honbu-shiki',           '準備日', '10:00', '18:00', 1),
    s('shift-p-rami-shikaikan',        'task-rami-shikaikan',        '準備日', '09:00', '12:00', 1),
    s('shift-p-rami-support-am',       'task-rami-support',          '準備日', '09:00', '12:00', 10),
    s('shift-p-rami-support-pm',       'task-rami-support',          '準備日', '13:00', '17:00', 10),
    s('shift-p-kaijou-soshi-age',      'task-kaijou-soshi-age',      '準備日', '13:00', '18:00', 12),
    s('shift-p-onkyo-setsuei',         'task-onkyo-setsuei-junk',    '準備日', '09:00', '14:00', 6),
    s('shift-p-obakeyashiki-setsuei',  'task-obakeyashiki-setsuei',  '準備日', '09:30', '18:00', 5),
    s('shift-p-ennichi-setsuei',       'task-ennichi-setsuei',       '準備日', '10:00', '17:00', 4),
    s('shift-p-stamp-rally-setsuei',   'task-stamp-rally-setsuei',   '準備日', '13:00', '15:00', 3),
    s('shift-p-sandan-honbu-setsuei',  'task-sandan-honbu-setsuei',  '準備日', '09:00', '11:00', 4),
    s('shift-p-kigyo-booth-setsuei',   'task-kigyo-booth-setsuei',   '準備日', '13:00', '17:00', 6),
    s('shift-p-shikkobu-honbu-setsuei','task-shikkobu-honbu-setsuei','準備日', '08:00', '10:00', 4),
    s('shift-p-kyukeijo-setsuei',      'task-kyukeijo-setsuei',      '準備日', '10:00', '12:00', 3),
    s('shift-p-annaijo-pool',          'task-annaijo-pool',          '準備日', '14:00', '16:00', 3),
    s('shift-p-annaijo-gym',           'task-annaijo-gym',           '準備日', '14:00', '16:00', 3),
    s('shift-p-seisaku-mt',            'task-seisaku-mt',            '準備日', '19:00', '20:00', 1, fixed(1)),
    s('shift-p-chiki-taida-setsuei',   'task-chiki-taida-setsuei',   '準備日', '13:00', '17:00', 5),

    // ======================================================
    // 1日目 - 早朝
    // ======================================================
    s('shift-d1-kori-konyu',           'task-kori-konyu',            '1日目', '06:30', '07:30', 2),
    s('shift-d1-shikkobu-mt',          'task-shikkobu-mt-day1',      '1日目', '07:00', '08:00', 1, fixed(1)),
    s('shift-d1-choshoku',             'task-choshoku-prep',         '1日目', '07:30', '08:30', 3),
    s('shift-d1-kaien-mt',             'task-kaien-mt',              '1日目', '07:15', '07:30', 1, fixed(1)),

    // ======================================================
    // 1日目 - 長時間指揮系
    // ======================================================
    s('shift-d1-honbu-shiki',          'task-honbu-shiki',           '1日目', '09:45', '22:00', 1, fixed(1)),
    s('shift-d1-honbu-shiki-hosa',     'task-honbu-shiki-hosa',      '1日目', '09:00', '22:00', 2),
    s('shift-d1-somu-shiki',           'task-somu-shiki',            '1日目', '08:00', '18:00', 1, fixed(1)),
    s('shift-d1-somu-shiki-hosa',      'task-somu-shiki-hosa',       '1日目', '08:00', '22:00', 2),
    s('shift-d1-zaimu-shiki',          'task-zaimu-shiki-day1',      '1日目', '09:00', '20:00', 1, fixed(1)),
    s('shift-d1-shogai-shiki',         'task-shogai-shiki',          '1日目', '09:00', '20:00', 1, fixed(1)),
    s('shift-d1-kikaku-shiki',         'task-kikaku-shiki',          '1日目', '09:00', '20:00', 1, fixed(1)),

    // ======================================================
    // 1日目 - 1日通し系
    // ======================================================
    s('shift-d1-buppin-taiou',         'task-buppin-taiou',          '1日目', '08:00', '18:30', 3),
    s('shift-d1-chushajo-kanri',       'task-chushajo-kanri',        '1日目', '09:45', '18:00', 4),
    s('shift-d1-kokunai-choriba',      'task-kokunai-choriba',       '1日目', '08:00', '18:00', 5),
    s('shift-d1-kokusai-choriba',      'task-kokusai-choriba',       '1日目', '08:00', '18:00', 5),
    s('shift-d1-sandan-taiou',         'task-sandan-taiou',          '1日目', '08:00', '18:00', 2),
    s('shift-d1-kokudan-taiou',        'task-kokudan-taiou',         '1日目', '08:00', '17:00', 1),
    s('shift-d1-eisei-taiou',          'task-eisei-taiou',           '1日目', '08:00', '19:00', 2),
    s('shift-d1-kaiden-taiou',         'task-kaiden-taiou',          '1日目', '08:00', '18:30', 3),
    s('shift-d1-kaijou-announce',      'task-kaijou-announce',       '1日目', '09:30', '18:00', 2),
    s('shift-d1-camera-junkai',        'task-camera-junkai',         '1日目', '09:00', '17:00', 2),
    s('shift-d1-roundman',             'task-roundman',              '1日目', '09:00', '17:00', 5),
    s('shift-d1-soshoku-mimawari',     'task-soshoku-mimawari',      '1日目', '10:00', '17:00', 3),
    s('shift-d1-okunai-junkai',        'task-okunai-junkai',         '1日目', '10:00', '17:00', 3),
    s('shift-d1-inkou-kanri',          'task-inkou-kanri',           '1日目', '09:45', '18:00', 3),
    s('shift-d1-inkou-taiki',          'task-inkou-taiki',           '1日目', '09:45', '18:00', 2),
    s('shift-d1-joho-server',          'task-joho-server-day1',      '1日目', '09:00', '18:00', 1),
    s('shift-d1-seeft',                'task-seeft-day1',            '1日目', '09:30', '18:00', 2),
    s('shift-d1-bussan-tent',          'task-bussan-tent-day1',      '1日目', '09:00', '18:00', 3),

    // ======================================================
    // 1日目 - 開始チェック
    // ======================================================
    s('shift-d1-kokunai-kaiten',       'task-kokunai-kaiten-check',  '1日目', '08:00', '10:00', 3),
    s('shift-d1-kokusai-kaiten',       'task-kokusai-kaiten-check',  '1日目', '08:00', '10:00', 3),

    // ======================================================
    // 1日目 - 開会式・イベント
    // ======================================================
    s('shift-d1-kaikai-shiki',         'task-kaikai-shiki-sanka',    '1日目', '09:00', '09:45', 10),
    s('shift-d1-guest-haifu-1',        'task-guest-seirihaifu-1',    '1日目', '09:30', '11:30', 8),
    s('shift-d1-guest-haifu-2',        'task-guest-seirihaifu-2',    '1日目', '13:00', '14:30', 8),
    s('shift-d1-guest-tekkyo',         'task-guest-seiriken-tekkyo', '1日目', '14:30', '15:00', 4),

    // ======================================================
    // 1日目 - 企業ブース
    // ======================================================
    s('shift-d1-kigyo-yobikomi-am',    'task-kigyo-booth-yobikomi',  '1日目', '10:00', '12:00', 2),
    s('shift-d1-kigyo-kanshi-am',      'task-kigyo-booth-kanshi',    '1日目', '10:00', '12:00', 2),
    s('shift-d1-kigyo-yobikomi-pm',    'task-kigyo-booth-yobikomi',  '1日目', '13:00', '17:00', 2),
    s('shift-d1-kigyo-kanshi-pm',      'task-kigyo-booth-kanshi',    '1日目', '13:00', '17:00', 2),

    // ======================================================
    // 1日目 - 企画エリア（昼）
    // ======================================================
    s('shift-d1-ennichi-unei',         'task-ennichi-unei',          '1日目', '10:00', '17:00', 6),
    s('shift-d1-obakeyashiki-unei',    'task-obakeyashiki-unei',     '1日目', '10:00', '17:00', 8),
    s('shift-d1-game-taikai',          'task-game-taikai-unei',      '1日目', '14:00', '17:00', 4),
    s('shift-d1-mikoshi-1',            'task-mikoshi-ninau-1',       '1日目', '13:00', '14:00', 8),
    s('shift-d1-hero-show',            'task-hero-show-hare',        '1日目', '14:00', '16:30', 5, { weather: '晴れ' }),

    // ======================================================
    // 1日目 - 天候別ステージ
    // ======================================================
    s('shift-d1-musinuts-hare',        'task-musinuts-hare',         '1日目', '16:45', '20:00', 10, { weather: '晴れ' }),
    s('shift-d1-musinuts-ame',         'task-musinuts-ame',          '1日目', '17:30', '20:30', 10, { weather: '雨' }),

    // ======================================================
    // 1日目 - 夕方〜夜
    // ======================================================
    s('shift-d1-hanazono-service',     'task-hanazono-service',      '1日目', '16:00', '19:00', 4),
    s('shift-d1-kokunai-heiten',       'task-kokunai-heiten-check',  '1日目', '16:00', '18:00', 3),
    s('shift-d1-kokusai-heiten',       'task-kokusai-heiten-check',  '1日目', '16:00', '18:00', 3),
    s('shift-d1-chushoku',             'task-chushoku-prep',         '1日目', '12:00', '13:00', 3),
    s('shift-d1-yushoku',              'task-yushoku-prep',          '1日目', '19:00', '21:00', 3),
    s('shift-d1-yoru-catering',        'task-yoru-catering',         '1日目', '20:00', '20:30', 2),
    s('shift-d1-roundman-final',       'task-roundman-final',        '1日目', '19:00', '20:00', 3),
    s('shift-d1-guest-hikaeshitsu',    'task-guest-hikaeshitsu',     '1日目', '20:00', '21:00', 2),
    s('shift-d1-heien-mt',             'task-heien-mt',              '1日目', '20:30', '21:00', 1, fixed(1)),

    // ======================================================
    // 2日目 - 早朝
    // ======================================================
    s('shift-d2-shikkobu-mt',          'task-shikkobu-mt-day2',      '2日目', '07:00', '08:00', 1, fixed(1)),
    s('shift-d2-choshoku',             'task-choshoku-prep',         '2日目', '07:30', '08:30', 3),
    s('shift-d2-kaien-mt',             'task-kaien-mt',              '2日目', '07:15', '07:30', 1, fixed(1)),

    // ======================================================
    // 2日目 - 長時間指揮系
    // ======================================================
    s('shift-d2-honbu-shiki',          'task-honbu-shiki',           '2日目', '09:45', '22:00', 1, fixed(1)),
    s('shift-d2-honbu-shiki-hosa',     'task-honbu-shiki-hosa',      '2日目', '09:00', '22:00', 2),
    s('shift-d2-somu-shiki',           'task-somu-shiki',            '2日目', '08:00', '18:00', 1, fixed(1)),
    s('shift-d2-somu-shiki-hosa',      'task-somu-shiki-hosa',       '2日目', '08:00', '22:00', 2),
    s('shift-d2-zaimu-shiki',          'task-zaimu-shiki-day2',      '2日目', '09:00', '20:00', 1, fixed(1)),
    s('shift-d2-shogai-shiki',         'task-shogai-shiki',          '2日目', '09:00', '20:00', 1, fixed(1)),

    // ======================================================
    // 2日目 - 1日通し系
    // ======================================================
    s('shift-d2-buppin-taiou',         'task-buppin-taiou',          '2日目', '08:00', '18:30', 3),
    s('shift-d2-chushajo-kanri',       'task-chushajo-kanri',        '2日目', '09:45', '18:00', 4),
    s('shift-d2-kokunai-choriba',      'task-kokunai-choriba',       '2日目', '08:00', '18:00', 5),
    s('shift-d2-kokusai-choriba',      'task-kokusai-choriba',       '2日目', '08:00', '18:00', 5),
    s('shift-d2-sandan-taiou',         'task-sandan-taiou',          '2日目', '08:00', '18:00', 2),
    s('shift-d2-eisei-taiou',          'task-eisei-taiou',           '2日目', '08:00', '19:00', 2),
    s('shift-d2-camera-junkai',        'task-camera-junkai',         '2日目', '09:00', '17:00', 2),
    s('shift-d2-roundman',             'task-roundman',              '2日目', '09:00', '17:00', 5),
    s('shift-d2-joho-server',          'task-joho-server-day2',      '2日目', '09:00', '18:00', 1),
    s('shift-d2-seeft',                'task-seeft-day2',            '2日目', '09:30', '18:00', 2),
    s('shift-d2-bingo',                'task-bingo-app',             '2日目', '14:00', '16:00', 2),
    s('shift-d2-bussan-tent',          'task-bussan-tent-day1',      '2日目', '09:00', '18:00', 3),
    s('shift-d2-hanazono-service',     'task-hanazono-service',      '2日目', '16:00', '19:00', 4),

    // ======================================================
    // 2日目 - 企業ブース
    // ======================================================
    s('shift-d2-kigyo-yobikomi-am',    'task-kigyo-booth-yobikomi',  '2日目', '10:00', '12:00', 2),
    s('shift-d2-kigyo-kanshi-am',      'task-kigyo-booth-kanshi',    '2日目', '10:00', '12:00', 2),
    s('shift-d2-kigyo-yobikomi-pm',    'task-kigyo-booth-yobikomi',  '2日目', '13:00', '17:00', 2),
    s('shift-d2-kigyo-kanshi-pm',      'task-kigyo-booth-kanshi',    '2日目', '13:00', '17:00', 2),

    // ======================================================
    // 2日目 - 企画エリア
    // ======================================================
    s('shift-d2-ennichi-unei',         'task-ennichi-unei',          '2日目', '10:00', '17:00', 6),
    s('shift-d2-obakeyashiki-unei',    'task-obakeyashiki-unei',     '2日目', '10:00', '17:00', 8),
    s('shift-d2-game-taikai',          'task-game-taikai-unei',      '2日目', '14:00', '17:00', 4),

    // ======================================================
    // 2日目 - 夕方〜夜
    // ======================================================
    s('shift-d2-kokunai-heiten',       'task-kokunai-heiten-check',  '2日目', '16:00', '18:00', 3),
    s('shift-d2-kokusai-heiten',       'task-kokusai-heiten-check',  '2日目', '16:00', '18:00', 3),
    s('shift-d2-yushoku',              'task-yushoku-prep',          '2日目', '19:00', '21:00', 3),
    s('shift-d2-roundman-final',       'task-roundman-final',        '2日目', '19:00', '20:00', 3),
    s('shift-d2-heien-mt',             'task-heien-mt',              '2日目', '20:30', '21:00', 1, fixed(1)),
    s('shift-d2-taida-miokuri',        'task-taida-miokuri',         '2日目', '17:00', '18:30', 3),

    // ======================================================
    // 片付け日
    // ======================================================
    s('shift-c-seisaku-shiki',         'task-seisaku-shiki',         '片付け日', '09:00', '17:00', 1),
    s('shift-c-honbu-shiki',           'task-honbu-shiki',           '片付け日', '09:00', '17:00', 1),
    s('shift-c-zaimu-shiki',           'task-zaimu-shiki-kataduke',  '片付け日', '09:00', '17:00', 1),
    s('shift-c-kaijou-soshi-sage-am',  'task-kaijou-soshi-sage',     '片付け日', '09:00', '12:00', 10),
    s('shift-c-kaijou-soshi-sage-pm',  'task-kaijou-soshi-sage',     '片付け日', '13:00', '17:00', 8),
    s('shift-c-kigyo-booth-kataduke-am','task-kigyo-booth-kataduke', '片付け日', '09:00', '12:00', 4),
    s('shift-c-kigyo-booth-kataduke-pm','task-kigyo-booth-kataduke', '片付け日', '13:00', '16:00', 4),
    s('shift-c-bussan-tent-kataduke',  'task-bussan-tent-kataduke',  '片付け日', '09:00', '11:00', 3),
    s('shift-c-rami-support',          'task-rami-support',          '片付け日', '13:00', '16:00', 4),
    s('shift-c-roundman-final',        'task-roundman-final',        '片付け日', '11:00', '12:00', 1),
    s('shift-c-heien-mt',              'task-heien-mt',              '片付け日', '13:00', '13:30', 1, fixed(1)),
    s('shift-c-taida-miokuri',         'task-taida-miokuri',         '片付け日', '10:00', '12:00', 3),
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
