/**
 * ★ **スマホで初めて開いたときに、PC での作成・編集を勧める。**
 *   スマホでも勤務表を見ることはできるが、作成・編集の操作（ダブルクリックで開く、ドラッグで運ぶ
 *   など）は PC 向けにできている。黙って開くと、押しても何も起きない所で戸惑う。
 *
 * 決まり：
 *  - 出すのは**小さい画面**のときだけ。判定は表示の切り替えと同じ基準（bubbles-ui の isSmallScreen）
 *  - 出すのは**そのブラウザで初めて**のときだけ。「OK」で閉じたらブラウザに覚え、次からは出さない
 *    （見るだけで使う人に、毎回閉じさせない）
 *  - 開いたあとで画面の向きを変えても出し直さない（開いた瞬間の大きさで決める）
 *  - 覚えておく場所（localStorage）が使えないとき（プライベートブラウズなど）は、開くたびに出る
 */
import { useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { isSmallScreen } from '@bublys-org/bubbles-ui';

const DISMISSED_KEY = 'hotel-shift-puzzle:mobile-notice-dismissed';

const wasDismissed = (): boolean => {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
};

const rememberDismissed = (): void => {
  try {
    window.localStorage.setItem(DISMISSED_KEY, '1');
  } catch {
    // 覚えられなくても閉じることはできる（次に開いたときにまた出るだけ）
  }
};

export function MobileNotice() {
  const [open, setOpen] = useState(
    () =>
      typeof window !== 'undefined' &&
      isSmallScreen({ width: window.innerWidth, height: window.innerHeight }) &&
      !wasDismissed(),
  );
  const close = () => {
    rememberDismissed();
    setOpen(false);
  };
  return (
    <Dialog open={open} onClose={close} aria-labelledby="mobile-notice-title">
      {/* 見出しは文節の途中で折り返さない。「スマホでは、」と「勤務表を見ることはできます」を
          それぞれひとかたまりにし、折り返すならその間で折り返す（何もしないと「見るこ／とは」で切れる） */}
      <DialogTitle id="mobile-notice-title" sx={{ fontSize: '1.05rem', fontWeight: 'bold' }}>
        <span style={{ display: 'inline-block' }}>スマホでは、</span>
        <span style={{ display: 'inline-block' }}>勤務表を見ることはできます</span>
      </DialogTitle>
      <DialogContent>
        <DialogContentText>勤務表の作成や編集はPCのブラウザで行うことを推奨します。</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>OK</Button>
      </DialogActions>
    </Dialog>
  );
}
