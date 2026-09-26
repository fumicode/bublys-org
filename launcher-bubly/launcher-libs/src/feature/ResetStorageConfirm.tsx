"use client";
/**
 * **この場を片付ける** ── このサイトが憶えていること（localStorage）を、まるごと消す。
 *
 * ★ **消す前に必ず訊く。** 戻す手立てが無い（世界線も一緒に消える）ので、
 *   何が消えるのかを数え上げてから訊く。
 * ★ 消したあとは**読み込み直す**。憶えていたものを消しただけでは、画面に残っている
 *   ものが書き戻してしまう（保存は画面の変化についてくるので）。
 */
import { FC, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

export type ResetStorageConfirmProps = {
  open: boolean;
  onClose: () => void;
};

export const ResetStorageConfirm: FC<ResetStorageConfirmProps> = ({ open, onClose }) => {
  const [busy, setBusy] = useState(false);
  const wipe = () => {
    setBusy(true);
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // 読み書きを止められている（プライベート窓など）。消せなくても読み込み直す
    }
    location.reload();
  };
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs">
      <DialogTitle>この場を片付けますか？</DialogTitle>
      <DialogContent>
        <DialogContentText component="div" sx={{ fontSize: 14, lineHeight: 1.8 }}>
          このサイトがこの端末に憶えていることを、まるごと消します。
          <br />
          メモ・表・囲碁の対局・変換のルール・並べ方・世界線、ぜんぶです。
          <br />
          <strong>元には戻せません。</strong>消したあと、画面を読み込み直します。
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          やめる
        </Button>
        <Button color="error" variant="contained" onClick={wipe} disabled={busy}>
          消す
        </Button>
      </DialogActions>
    </Dialog>
  );
};
