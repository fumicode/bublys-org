"use client";
/**
 * **このバブリを片付ける** ── そのバブリが持ち込んだ置き場だけを、初期値へ戻す。
 *
 * ★ 「この場を片付ける」の**「この場」がどこか**は、呼び出しが誰のものかで決まる。
 *   大元の海のランチャーなら OS ぜんぶ（`ResetStorageConfirm`）、バブリの窓に
 *   貼った呼び出しなら**そのバブリだけ**。同じ字で違うものを消さないよう、
 *   何が消えるのかを名指しして訊く。
 * ★ 消えないものも言う ── バブリはロードしたまま残るし、ほかのバブリの中身は消えない。
 *   読み込み直しもしない（状態を初期値へ戻すだけなので、画面はその場で追いつく）。
 */
import { FC } from "react";
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
} from "@mui/material";
import { useAppDispatch } from "@bublys-org/state-management";
import { clearSlices } from "@bublys-org/state-management";

export type ClearBublyConfirmProps = {
  open: boolean;
  onClose: () => void;
  /** 見せる名前（バブリの表示名） */
  label: string;
  /** 初期値へ戻す置き場の名前 */
  slicePaths: readonly string[];
};

export const ClearBublyConfirm: FC<ClearBublyConfirmProps> = ({ open, onClose, label, slicePaths }) => {
  const dispatch = useAppDispatch();
  const clear = () => {
    dispatch(clearSlices(slicePaths));
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs">
      <DialogTitle sx={{ fontSize: "1rem" }}>「{label}」の中身を片付けますか？</DialogTitle>
      <DialogContent>
        <DialogContentText component="div" sx={{ fontSize: 14, lineHeight: 1.8 }}>
          {slicePaths.length > 0 ? (
            <>
              このバブリが持っているものを、まっさらに戻します。
              <Box component="div" sx={{ fontFamily: "monospace", fontSize: "0.75rem", my: 0.5 }}>
                {slicePaths.join(" / ")}
              </Box>
              <strong>元には戻せません。</strong>
              <br />
              バブリはロードしたまま残ります。ほかのバブリの中身は消えません。
            </>
          ) : (
            <>
              このバブリは、この端末に何も憶えていません（持ち込んだ置き場がありません）。
              <br />
              片付けるものはありません。
            </>
          )}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>やめる</Button>
        <Button color="error" variant="contained" onClick={clear} disabled={slicePaths.length === 0}>
          消す
        </Button>
      </DialogActions>
    </Dialog>
  );
};
