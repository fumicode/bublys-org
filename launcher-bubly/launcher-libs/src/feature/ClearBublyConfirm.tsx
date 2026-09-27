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
import { FC, useMemo } from "react";
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
} from "@mui/material";
import { useAppSelector, clearFromStorage } from "@bublys-org/state-management";
import { isBublyScope } from "@bublys-org/bubbles-ui";

export type ClearBublyConfirmProps = {
  open: boolean;
  onClose: () => void;
  /** 見せる名前（バブリの表示名） */
  label: string;
  /** バブリの名前（世界線の見分けに使う） */
  name: string;
  /** 初期値へ戻す置き場の名前 */
  slicePaths: readonly string[];
  /** 世界線に使う名前の頭（`Bubly.worldLineScopePrefixes`） */
  worldLineScopePrefixes: readonly string[];
};

export const ClearBublyConfirm: FC<ClearBublyConfirmProps> = ({
  open, onClose, label, name, slicePaths, worldLineScopePrefixes,
}) => {
  /**
   * ★ **世界線に持つバブリもいる。** 囲碁や Tailor Genie は置き場を 1 つも使わず、
   *   ぜんぶ世界線に入れる ── 置き場だけ見て「何も憶えていません」と言っていたのは嘘だった。
   * ★ **選ぶのは棚そのもの、絞るのはそのあと。** 選ぶ所で `filter` すると毎回
   *   新しい配列が返り、**描き直しが止まらなくなる**（実測：Maximum update depth exceeded）。
   */
  const graphs = useAppSelector((state) => state.worldLineGraph?.graphs);
  const scopes = useMemo(
    () => Object.keys(graphs ?? {}).filter((id) => isBublyScope(id, { name, worldLineScopePrefixes })),
    [graphs, name, worldLineScopePrefixes],
  );
  const nothing = slicePaths.length === 0 && scopes.length === 0;
  /**
   * ★ **触るのは憶えているほうで、画面のほうではない。** 状態から消しても、
   *   開いている画面が作り直してしまう ── 世界線の口は無い世界線を見つけると
   *   作り直すので、消したそばから同じ名前が戻る（実測で踏んだ）。
   *   保存を書き直してから読み込み直せば、誰も書き戻せない。
   *   OS ぜんぶの片付けが読み込み直すのと同じ考えで、**消す範囲だけが違う**。
   */
  const clear = () => {
    clearFromStorage(slicePaths, scopes);
    onClose();
    window.location.reload();
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs">
      <DialogTitle sx={{ fontSize: "1rem" }}>「{label}」の中身を片付けますか？</DialogTitle>
      <DialogContent>
        <DialogContentText component="div" sx={{ fontSize: 14, lineHeight: 1.8 }}>
          {!nothing ? (
            <>
              このバブリが持っているものを、まっさらに戻します。
              {slicePaths.length > 0 && (
                <Box component="div" sx={{ fontFamily: "monospace", fontSize: "0.75rem", my: 0.5 }}>
                  {slicePaths.join(" / ")}
                </Box>
              )}
              {scopes.length > 0 && (
                <Box component="div" sx={{ fontSize: "0.8rem", my: 0.5 }}>
                  世界線 {scopes.length} 本
                  <Box component="span" sx={{ fontFamily: "monospace", fontSize: "0.7rem", ml: 0.5 }}>
                    （{scopes.slice(0, 3).join(" / ")}{scopes.length > 3 ? " …" : ""}）
                  </Box>
                </Box>
              )}
              <strong>元には戻せません。</strong>
              <br />
              バブリはロードしたまま残ります。ほかのバブリの中身は消えません。
            </>
          ) : (
            <>
              このバブリは、この端末に何も憶えていません。
              <br />
              片付けるものはありません。
            </>
          )}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>やめる</Button>
        <Button color="error" variant="contained" onClick={clear} disabled={nothing}>
          消す
        </Button>
      </DialogActions>
    </Dialog>
  );
};
