/**
 * @jest-environment node
 *
 * スライスから集約の根を読む。**Node 環境**（fs と TypeScript のコンパイラ API を使う）。
 *
 * 「どのクラスが集約の根か」を生成コマンドの引数に手で書くと、型を1つ足したときに
 * 図が黙って古くなる——新しい集約を「部品」だと言い続ける。落ちるテストも無い。
 * だからスライスの宣言そのものを読む。ここはその読み取りを固定する。
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractSliceRoots } from './extractSliceRoots.js';

/** その場でスライスのファイルを並べたディレクトリを作る */
function sliceDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'slices-'));
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(join(dir, name), body, 'utf-8');
  }
  return dir;
}

describe('スライスが宣言している集約の根', () => {
  it('state 型が保存しているクラスを、根として読む', () => {
    const dir = sliceDir({
      'member-slice.ts': `
        type MemberSliceState = { memberList: MemberState[] };
      `,
      'task-slice.ts': `
        type TaskSliceState = { taskList: TaskState[]; selectedTaskId?: string };
      `,
    });
    expect(extractSliceRoots(dir).aggregateClasses).toEqual(['Member', 'Task']);
  });

  /**
   * ★ ここが肝。ファイル全体を走査すると reducer の payload まで拾って、
   * 集約の**部品**を根に格上げしてしまう（実際に event-shift-puzzle の Shift がそう。
   * Shift は ShiftPlan の中の部品で、スライスが保存しているのは ShiftPlan のほう）。
   */
  it('★ reducer の payload に出てくる型は根にしない（state 型の中だけ見る）', () => {
    const dir = sliceDir({
      'shift-plan-slice.ts': `
        type ShiftPlanSliceState = { shiftPlans: ShiftPlanState[] };
        const slice = createSlice({
          name: "shiftPlan",
          reducers: {
            setShifts: (state, action: PayloadAction<{ shifts: ShiftState[] }>) => {},
          },
        });
      `,
    });
    const roots = extractSliceRoots(dir).aggregateClasses;
    expect(roots).toEqual(['ShiftPlan']);
    expect(roots).not.toContain('Shift');
  });

  it('readonly・Record・union の中のクラスも読む', () => {
    const dir = sliceDir({
      'a-slice.ts': `
        type ASliceState = {
          list: readonly AlphaState[];
          byId: Record<string, BetaState>;
          current: GammaState | undefined;
        };
      `,
    });
    expect(extractSliceRoots(dir).aggregateClasses).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('どのスライスが何を保存しているかを添える（読めなかったときの手がかり）', () => {
    const dir = sliceDir({
      'member-slice.ts': `type MemberSliceState = { memberList: MemberState[] };`,
    });
    expect(extractSliceRoots(dir).byFile).toEqual({ 'member-slice.ts': ['Member'] });
  });

  it('テストのスライスは読まない', () => {
    const dir = sliceDir({
      'member-slice.ts': `type MemberSliceState = { memberList: MemberState[] };`,
      'member-slice.test.ts': `type GhostSliceState = { ghosts: GhostState[] };`,
    });
    expect(extractSliceRoots(dir).aggregateClasses).toEqual(['Member']);
  });

  it('読めなければ黙って空を返さず、落ちる', () => {
    const empty = sliceDir({ 'x-slice.ts': `export const nothing = 1;` });
    expect(() => extractSliceRoots(empty)).toThrow(/集約の根を読めませんでした/);
    expect(() => extractSliceRoots(sliceDir({ 'note.md': 'x' }))).toThrow(
      /スライスが見つかりません/
    );
  });
});
