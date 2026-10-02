"use client";
/**
 * **新しい版の見本で始めるか訊く** ── 前の版で使っていた端末にだけ出る（`edition.ts`）。
 *
 * ★ 見本に入れ替えると戻せないので、何が消えるかを言ってから訊く。
 * ★ 「初期状態」とは言わない ── 使う人から見れば、初めの姿ではなく**作り手が用意した見本**。
 * ★ 見てほしいのは見本なので、主ボタンは「新しい版の見本で始める」。
 *   背景を押しても閉じない（どちらかを選ばせる。選ぶまで中身は描かない）。
 */
import { FC } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

export type EditionPromptProps = {
  open: boolean;
  busy: boolean;
  onReset: () => void;
  onKeep: () => void;
};

export const EditionPrompt: FC<EditionPromptProps> = ({ open, busy, onReset, onKeep }) => (
  <Dialog open={open} maxWidth="xs">
    <DialogTitle>bublys OS が新しくなりました</DialogTitle>
    <DialogContent>
      <DialogContentText component="div" sx={{ fontSize: 14, lineHeight: 1.8 }}>
        前に使ったときのものが、この端末に残っています。
        <br />
        新しい版は<strong>見本で始めてもらう</strong>のがおすすめです。
        <br />
        見本に入れ替えると、メモ・表・並べ方・世界線・読み込んだバブリなど、
        この端末に残っているものはすべて消えます。<strong>元には戻せません。</strong>
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onKeep} disabled={busy}>
        今のまま続ける
      </Button>
      <Button variant="contained" onClick={onReset} disabled={busy}>
        新しい版の見本で始める
      </Button>
    </DialogActions>
  </Dialog>
);
