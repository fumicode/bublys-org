/**
 * ConstraintRecipeFunnel — 制約レシピを漏斗の上に描く（#229）
 *
 *   ＼  任意  ／   ← 広い口：任意の単位（できれば守る）
 *     ｜絶対｜     ← 細い首：絶対の単位（破らない）
 *
 * ルール:
 *   - 上下は「絶対か任意か」で分かれ、その中は優先度で決まる。**下ほど先に見る**
 *     （漏斗の首に近いほど強い。任意の中でも優先度が高いほど首に近い）
 *   - 同じ（絶対か任意か, 優先度）の単位は同じ段に横に並ぶ。段の中の左右に意味は無い（渡された順）
 *   - 段の幅は漏斗のその高さの幅に合わせる（入りきらなければ折り返す）
 */
import { FC } from "react";
import styled from "styled-components";

export type RecipeFunnelEntry = {
  key: string;
  label: string;
  hard: boolean;
  priority: number;
};

type Tier = { hard: boolean; priority: number; entries: RecipeFunnelEntry[] };

/** 首の幅（全体の幅に対する割合） */
const NECK = 0.34;

/** 段に分け、上から下へ並べる：任意（優先度の低い順）→ 絶対（優先度の低い順） */
export const funnelTiersOf = (entries: readonly RecipeFunnelEntry[]): Tier[] => {
  const tiers: Tier[] = [];
  for (const e of entries) {
    const t = tiers.find((x) => x.hard === e.hard && x.priority === e.priority);
    if (t) t.entries.push(e);
    else tiers.push({ hard: e.hard, priority: e.priority, entries: [e] });
  }
  return tiers.sort((a, b) => Number(a.hard) - Number(b.hard) || a.priority - b.priority);
};

const Section: FC<{ kind: "soft" | "hard"; tiers: Tier[] }> = ({ kind, tiers }) => (
  <div className={`e-section is-${kind}`}>
    <svg className="e-bg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {kind === "soft" ? (
        <polygon
          points={`0,0 100,0 ${50 + NECK * 50},100 ${50 - NECK * 50},100`}
        />
      ) : (
        <rect x={50 - NECK * 50} y={0} width={NECK * 100} height={100} />
      )}
    </svg>
    <span className="e-side">{kind === "soft" ? "任意" : "絶対"}</span>
    {tiers.length === 0 && <div className="e-empty">（なし）</div>}
    {tiers.map((tier, i) => {
      // 段の真ん中の高さでの漏斗の幅（任意は上ほど広い。絶対は首の幅）
      const y = (i + 0.5) / tiers.length;
      const width = kind === "soft" ? 1 - (1 - NECK) * y : NECK;
      return (
        <div className="e-tier" key={`${tier.hard}:${tier.priority}`}>
          <span className="e-priority" title="優先度（下ほど先に見る）">
            {tier.priority.toFixed(1)}
          </span>
          <div className="e-chips" style={{ width: `${width * 100 - 4}%` }}>
            {tier.entries.map((e) => (
              <span key={e.key} className="e-chip" title={e.key}>
                {e.label}
              </span>
            ))}
          </div>
        </div>
      );
    })}
  </div>
);

export const ConstraintRecipeFunnel: FC<{
  title?: string;
  entries: readonly RecipeFunnelEntry[];
}> = ({ title, entries }) => {
  const tiers = funnelTiersOf(entries);
  return (
    <Root>
      {title && <div className="e-title">{title}</div>}
      <Section kind="soft" tiers={tiers.filter((t) => !t.hard)} />
      <Section kind="hard" tiers={tiers.filter((t) => t.hard)} />
      <div className="e-legend">下ほど先に見る。同じ段の単位どうしは比べない（案の出しどころ）</div>
    </Root>
  );
};

const Root = styled.div`
  padding: 10px 12px 12px;
  font-size: 12px;
  color: #333;

  .e-title {
    font-weight: bold;
    margin-bottom: 8px;
  }
  .e-section {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 0;
  }
  .e-section.is-hard {
    padding-bottom: 14px;
  }
  .e-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
  }
  .is-soft .e-bg polygon {
    fill: #e3f2fd;
    stroke: #90caf9;
    stroke-width: 0.6;
    vector-effect: non-scaling-stroke;
  }
  .is-hard .e-bg rect {
    fill: #37474f;
  }
  .e-side {
    position: absolute;
    right: 0;
    top: 6px;
    z-index: 1;
    font-size: 11px;
    color: #78909c;
  }
  .is-hard .e-side {
    top: 50%;
    transform: translateY(-50%);
    color: #37474f;
    font-weight: bold;
  }
  .e-tier {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: center;
  }
  .e-priority {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    font-size: 10px;
    color: #90a4ae;
    font-variant-numeric: tabular-nums;
  }
  .e-chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px;
  }
  .e-chip {
    padding: 2px 7px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid #90caf9;
    white-space: nowrap;
  }
  .is-hard .e-chip {
    background: #eceff1;
    border-color: #eceff1;
    color: #263238;
    font-weight: bold;
  }
  .e-empty {
    position: relative;
    z-index: 1;
    text-align: center;
    color: #90a4ae;
  }
  .e-legend {
    margin-top: 8px;
    font-size: 10px;
    color: #90a4ae;
    text-align: center;
  }
`;
