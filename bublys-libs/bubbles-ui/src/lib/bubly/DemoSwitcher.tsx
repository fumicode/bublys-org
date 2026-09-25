'use client';
/**
 * **他のデモへ行く口。**
 *
 * ★ どのデモに着いても、そこから全部へ行けるようにする ── 審査員が最初に踏む url は
 *   1 つだけなので、そこが行き止まりだと残りは**無かったことになる**。
 * ★ 出す中身は {@link DEMO_SITES} の 1 か所から。いま居るものは押せない印にして残す
 *   （消すと「今どこに居るか」が分からなくなる）。
 * ★ 形は 2 つ。**細い帯**（56px のサイドバー ＝ 1〜2 文字＋ツールチップ）と、
 *   **一覧**（名前と一行が読める形）。どちらも同じ一覧から出す。
 */
import { FC } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { DEMO_SITES, currentDemoId, type DemoSite } from './demoSites.js';

export type DemoSwitcherProps = {
  /**
   * 細い帯（アイコンだけのサイドバー ＝ `rail`）／名前の読める縦の一覧（`list`）／
   * 横一列の帯（`bar`。岸に貼った泡のように、高さの無い所に置くとき）。
   */
  readonly variant?: 'rail' | 'list' | 'bar';
  /** 見出し（一覧のときだけ出す） */
  readonly heading?: string;
  /** 住所を上書きする（試すとき用。ふだんは省く） */
  readonly href?: string;
};

const tip = (site: DemoSite, isHere: boolean) =>
  `${site.name} ── ${site.note}${isHere ? '（いま見ている）' : ''}`;

export const DemoSwitcher: FC<DemoSwitcherProps> = ({
  variant = 'rail',
  heading = '他のデモ',
  href,
}) => {
  const here = currentDemoId(href);
  const rail = variant === 'rail';
  const bar = variant === 'bar';
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: bar ? 'row' : 'column',
        alignItems: bar ? 'center' : 'stretch',
        gap: rail ? 0.5 : 0.75,
        minWidth: 0,
      }}
    >
      {!rail && heading && (
        <Typography
          sx={{
            fontSize: 11,
            letterSpacing: '0.08em',
            opacity: 0.55,
            whiteSpace: 'nowrap',
            // 横一列のときは見出しも列の 1 つ ── 折り返すと帯の高さを食う
            ...(bar ? { alignSelf: 'center', pr: 0.5 } : {}),
          }}
        >
          {heading}
        </Typography>
      )}
      {DEMO_SITES.map((site) => {
        const isHere = site.id === here;
        // ★ `title` は Tooltip が出す。両方に書くと MUI が叱る（素の tooltip と二重になる）
        const common = {
          sx: {
            display: 'block',
            textDecoration: 'none',
            color: 'inherit',
            borderRadius: 1,
            border: '1px solid',
            borderColor: isHere ? 'rgba(110,231,255,0.55)' : 'rgba(255,255,255,0.22)',
            background: isHere ? 'rgba(110,231,255,0.14)' : 'rgba(10,14,28,0.55)',
            opacity: isHere ? 1 : 0.85,
            cursor: isHere ? 'default' : 'pointer',
            minWidth: 0,
            '&:hover': isHere ? {} : { opacity: 1, background: 'rgba(255,255,255,0.1)' },
          },
        };
        const inner = bar ? (
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: isHere ? 700 : 500,
              lineHeight: '28px',
              px: 1.25,
              whiteSpace: 'nowrap',
            }}
          >
            {site.name}
          </Typography>
        ) : rail ? (
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 700,
              lineHeight: '30px',
              minWidth: 34,
              px: 0.5,
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            {site.short}
          </Typography>
        ) : (
          <Box sx={{ px: 1, py: 0.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: isHere ? 600 : 400, lineHeight: 1.4 }}>
              {site.name}
            </Typography>
            <Typography sx={{ fontSize: 11, opacity: 0.6, lineHeight: 1.4 }}>{site.note}</Typography>
          </Box>
        );
        /**
         * ★ **別のタブで開く。** いま触っているデモを閉じずに行き来できるようにする
         *   ── 同じタブで飛ばすと、戻るのに履歴を遡ることになり、途中まで作った状態も消える。
         *   `rel` は別タブへ渡す `window.opener` を切るため（外部の口を開くときの作法）。
         */
        const item = isHere ? (
          <Box {...common}>{inner}</Box>
        ) : (
          <Box
            component="a"
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            {...common}
          >
            {inner}
          </Box>
        );
        return (
          <Tooltip key={site.id} title={tip(site, isHere)} placement="right" arrow>
            {item}
          </Tooltip>
        );
      })}
    </Box>
  );
};

export default DemoSwitcher;
