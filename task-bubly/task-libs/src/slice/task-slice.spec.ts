/**
 * **スライスは集約の入れ物に徹する**（CLAUDE.md 規則6）。
 *
 * ここで押さえるのは 2 つ:
 *   1. reducer は**渡されたものを置くだけ** ── 同じ入力なら、いつ走らせても同じ結果
 *   2. ステータスを変えるのは**集約**（`Task_タスク.withStatus`）
 *
 * ★ なぜ 1 が大事か ── このプロジェクトは**世界線（やり直し）が土台**。
 *   reducer が時刻を読むと、同じ操作を再生しても違う値になる。
 *   前はここに `updateTaskStatus` があり、`task.status = …` と書いたうえで
 *   `new Date()` まで読んでいた。
 */
import { taskSlice, updateTask, addTask } from './task-slice.js';
import { Task_タスク } from '../domain/Task.domain.js';
import type { TaskJSON } from '../domain/Task.domain.js';

const seed: TaskJSON = {
  id: 't1', title: '題', description: '', status: 'todo',
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};
const start = { taskList: [seed], selectedTaskId: null };

describe('タスクの入れ物（スライス）', () => {
  it('★ reducer は渡されたものを置くだけ ── 何度走らせても同じ結果', () => {
    const next = { ...seed, status: 'done' as const, updatedAt: '2026-02-02T00:00:00.000Z' };
    const once = taskSlice.reducer(start, updateTask(next));
    const twice = taskSlice.reducer(once, updateTask(next));
    expect(once.taskList[0]).toEqual(next);
    expect(twice).toEqual(once);                       // 同じ入力 → 同じ結果（時刻を読まない）
    // 置いた値がそのまま残る（reducer が作り足さない）
    expect(once.taskList[0].updatedAt).toBe('2026-02-02T00:00:00.000Z');
  });

  it('★ ステータスを変えるのは集約。スライスにその口は無い', () => {
    expect('updateTaskStatus' in taskSlice.actions).toBe(false);
    const done = Task_タスク.fromJSON(seed).withStatus('done');
    expect(done.status).toBe('done');
    expect(Task_タスク.fromJSON(seed).status).toBe('todo');          // 元は変わらない
    expect(done.updatedAt).not.toBe(seed.updatedAt);                 // 変えた印は集約が付ける
    // 集約が出した plain を、スライスはそのまま置く
    const saved = taskSlice.reducer(start, updateTask(done.toJSON()));
    expect(saved.taskList[0]).toEqual(done.toJSON());
  });

  it('足す・置く・消すは id で見る（入れ物の仕事）', () => {
    const other: TaskJSON = { ...seed, id: 't2', title: 'もう1つ' };
    const two = taskSlice.reducer(start, addTask(other));
    expect(two.taskList.map((t) => t.id)).toEqual(['t1', 't2']);
    const changed = taskSlice.reducer(two, updateTask({ ...other, title: '書き換え' }));
    expect(changed.taskList[1].title).toBe('書き換え');
    expect(changed.taskList[0]).toEqual(seed);                       // 触っていないほうは 1 文字も変わらない
  });
});
