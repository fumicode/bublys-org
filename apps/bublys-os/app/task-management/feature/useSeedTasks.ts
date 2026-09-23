'use client';
/**
 * 最初の顔ぶれを撒く ── 一覧が空なら見本のタスクを入れる。
 *
 * 前は一覧の画面（`TaskCollection`）が自分で撒いていた。一覧を**並びの空間**に
 * したので、画面は顔ぶれを読むだけになり、撒くのはここへ移した。
 */
import { useEffect } from "react";
import {
  useAppDispatch,
  useAppSelector,
  selectTaskList,
  setTaskList,
  TaskJSON,
} from "@bublys-org/state-management";

const sampleTasks = (): TaskJSON[] => {
  const now = new Date().toISOString();
  return [
    { id: crypto.randomUUID(), title: "プロジェクト計画書の作成", description: "来月のプロジェクト計画書を作成する", status: "todo", createdAt: now, updatedAt: now },
    { id: crypto.randomUUID(), title: "コードレビュー", description: "PRのレビューを完了させる", status: "doing", createdAt: now, updatedAt: now },
    { id: crypto.randomUUID(), title: "ミーティング資料準備", description: "", status: "done", createdAt: now, updatedAt: now },
  ];
};

export function useSeedTasks(): void {
  const dispatch = useAppDispatch();
  const taskList = useAppSelector(selectTaskList);
  useEffect(() => {
    if (taskList.length === 0) dispatch(setTaskList(sampleTasks()));
  }, [dispatch, taskList.length]);
}
