import type { DiscoveredOpportunity, QualifiedDiscovery } from "./types.js";

export type QualificationOptions = {
  now?: Date;
  minimumValue?: number;
  keywords?: string[];
  requireOpenStage?: boolean;
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function keywordMatch(opportunity: DiscoveredOpportunity, keywords: string[]): boolean {
  if (!keywords.length) return true;
  const haystack = [
    opportunity.title,
    opportunity.description ?? "",
    opportunity.buyer ?? "",
    ...opportunity.categories,
  ].join(" ").toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

export function qualifyDiscovery(
  opportunity: DiscoveredOpportunity,
  options: QualificationOptions = {},
): QualifiedDiscovery {
  const now = options.now ?? new Date();
  const minimumValue = options.minimumValue ?? 50_000;
  const keywords = options.keywords ?? [];
  const flags: string[] = [];

  let daysRemaining: number | undefined;
  if (opportunity.deadline) {
    const end = new Date(opportunity.deadline);
    if (!Number.isNaN(end.getTime())) {
      daysRemaining = (end.getTime() - now.getTime()) / 86_400_000;
      if (daysRemaining <= 0) flags.push("expired");
      else if (daysRemaining < 3) flags.push("short_runway");
    } else {
      flags.push("invalid_deadline");
    }
  } else {
    flags.push("deadline_unconfirmed");
  }

  if (!opportunity.buyer) flags.push("buyer_unconfirmed");
  if (!opportunity.value) flags.push("value_unconfirmed");
  else if (opportunity.value.amount < minimumValue) flags.push("below_minimum_value");
  if (!keywordMatch(opportunity, keywords)) flags.push("keyword_miss");
  if ((options.requireOpenStage ?? true) && opportunity.stage !== "open") flags.push("not_open_stage");

  const valueScore = opportunity.value
    ? clamp01(Math.log10(Math.max(1, opportunity.value.amount)) / 7)
    : 0.1;
  const sourceScore = clamp01(opportunity.evidence.filter((e) => e.strength === "primary").length / 4);
  const buyerScore = opportunity.buyer ? 1 : 0;
  const deadlineScore = daysRemaining === undefined
    ? 0.35
    : daysRemaining <= 0
      ? 0
      : daysRemaining < 3
        ? 0.3
        : daysRemaining <= 30
          ? 1
          : daysRemaining <= 90
            ? 0.8
            : 0.55;
  const smeScore = opportunity.smeSuitable === true ? 1 : opportunity.smeSuitable === false ? 0.35 : 0.55;

  let qualificationScore = 100 * (
    0.34 * valueScore +
    0.22 * sourceScore +
    0.18 * buyerScore +
    0.18 * deadlineScore +
    0.08 * smeScore
  );

  const hardBlockers = new Set(["expired", "below_minimum_value", "keyword_miss", "not_open_stage"]);
  if (flags.some((flag) => hardBlockers.has(flag))) qualificationScore *= 0.25;

  const amountText = opportunity.value
    ? `${opportunity.value.currency} ${opportunity.value.amount.toLocaleString()}`
    : "an unconfirmed contract value";
  const buyerText = opportunity.buyer ?? "a named public buyer not yet parsed";
  const revenueHypothesis = `${buyerText} has a published ${opportunity.stage} procurement opportunity with ${amountText}; value becomes actionable only after eligibility, fit, competition, and submission requirements are verified.`;

  return {
    ...opportunity,
    qualificationScore,
    daysRemaining,
    flags,
    revenueHypothesis,
  };
}
