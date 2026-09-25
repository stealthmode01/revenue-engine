import type { Opportunity, ScoredOpportunity } from "./types.js";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function deadlineScore(deadline?: string, now = new Date()): number {
  if (!deadline) return 0.55;
  const end = new Date(deadline);
  if (Number.isNaN(end.getTime())) return 0.35;
  const days = (end.getTime() - now.getTime()) / 86_400_000;
  if (days <= 0) return 0;
  if (days < 2) return 0.25;
  if (days <= 14) return 1;
  if (days <= 45) return 0.9;
  if (days <= 90) return 0.7;
  return 0.5;
}

function evidenceQuality(o: Opportunity): number {
  if (!o.evidence?.length) return Math.min(0.6, o.buyerEvidence.length / 5);
  const primary = o.evidence.filter((e) => e.strength === "primary").length;
  const secondary = o.evidence.filter((e) => e.strength === "secondary").length;
  const sourceDiversity = new Set(o.evidence.map((e) => e.source)).size;
  return clamp01(primary * 0.22 + secondary * 0.08 + Math.min(0.25, sourceDiversity * 0.08));
}

export function scoreOpportunity(o: Opportunity, now = new Date()): ScoredOpportunity {
  const warnings: string[] = [];
  const expectedProfit = Math.max(0, o.expectedRevenue - o.expectedCost);
  const probability = clamp01(o.probabilityOfPayment);
  const expectedValue = expectedProfit * probability;

  const economics = clamp01(Math.log10(Math.max(1, expectedValue + 1)) / 6);
  const buyerEvidence = clamp01(o.buyerEvidence.length / 3);
  const quality = evidenceQuality(o);
  const deadline = deadlineScore(o.deadline, now);
  const speed = clamp01(30 / Math.max(1, o.daysToPayment));
  const scalability = clamp01(o.scalability / 10);
  const automation = clamp01(o.automationLeverage / 10);
  const involvementPenalty = clamp01(o.danielInvolvement / 10);
  const riskPenalty = clamp01(o.downsideRisk / 10);
  const competitionPenalty = clamp01((o.competitionLevel ?? 0) / 10);

  if (deadline === 0) warnings.push("deadline_expired");
  if (!o.evidence?.some((e) => e.strength === "primary")) warnings.push("no_primary_evidence");
  if (o.currency && o.currency !== "USD") warnings.push("non_usd_value_not_fx_normalized");
  if (o.status === "cash_received" && o.actualRevenue === undefined) warnings.push("cash_status_missing_actual_revenue");

  const score = 100 * (
    0.25 * economics +
    0.16 * buyerEvidence +
    0.14 * quality +
    0.12 * deadline +
    0.10 * speed +
    0.10 * scalability +
    0.09 * automation -
    0.015 * involvementPenalty -
    0.025 * riskPenalty -
    0.04 * competitionPenalty
  );

  return {
    ...o,
    expectedProfit,
    expectedValue,
    score,
    scoreBreakdown: {
      economics,
      buyerEvidence,
      evidenceQuality: quality,
      deadline,
      speed,
      scalability,
      automation,
      involvementPenalty,
      riskPenalty,
      competitionPenalty,
    },
    warnings,
  };
}
