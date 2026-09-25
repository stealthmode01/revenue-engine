import fs from "node:fs";
import { Opportunity, ScoredOpportunity } from "./types.js";

const path = new URL("../data/opportunities.json", import.meta.url);

function clamp01(n:number){ return Math.max(0, Math.min(1,n)); }

function scoreOpportunity(o: Opportunity): ScoredOpportunity {
  const expectedProfit = o.expectedRevenue - o.expectedCost;
  const expectedValue = expectedProfit * clamp01(o.probabilityOfPayment);

  const speed = 1 / Math.max(1, o.daysToPayment);
  const economics = Math.log10(Math.max(1, expectedValue + 1)) / 6;
  const buyer = Math.min(1, o.buyerEvidence.length / 3);
  const scale = clamp01(o.scalability / 10);
  const automation = clamp01(o.automationLeverage / 10);
  const involvementPenalty = clamp01(o.danielInvolvement / 10);
  const riskPenalty = clamp01(o.downsideRisk / 10);

  const score =
    100 * (
      0.28 * economics +
      0.20 * buyer +
      0.16 * speed +
      0.14 * scale +
      0.12 * automation -
      0.06 * involvementPenalty -
      0.04 * riskPenalty
    );

  return { ...o, expectedProfit, expectedValue, score };
}

const opportunities: Opportunity[] = JSON.parse(fs.readFileSync(path, "utf8"));
const scored = opportunities.map(scoreOpportunity).sort((a,b)=>b.score-a.score);

for (const o of scored) {
  console.log(
    `${o.score.toFixed(1).padStart(5)} | ${o.title} | EV $${o.expectedValue.toLocaleString()} | ${o.daysToPayment}d | ${o.status}`
  );
}
