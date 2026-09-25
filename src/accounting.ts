import fs from "node:fs";
import type { Opportunity } from "./types.js";

export type CurrencyTotals = {
  verifiedCashReceived: number;
  knownActualCosts: number;
  verifiedNetCash: number;
  earnedUnpaid: number;
  acceptedWork: number;
  unconfirmedPotential: number;
};

export type AccountingSummary = {
  byCurrency: Record<string, CurrencyTotals>;
  warnings: string[];
};

function emptyTotals(): CurrencyTotals {
  return {
    verifiedCashReceived: 0,
    knownActualCosts: 0,
    verifiedNetCash: 0,
    earnedUnpaid: 0,
    acceptedWork: 0,
    unconfirmedPotential: 0,
  };
}

export function summarizeAccounting(opportunities: Opportunity[]): AccountingSummary {
  const byCurrency: Record<string, CurrencyTotals> = {};
  const warnings: string[] = [];

  for (const o of opportunities) {
    const currency = o.currency ?? "USD";
    const totals = byCurrency[currency] ?? (byCurrency[currency] = emptyTotals());
    const actualRevenue = Math.max(0, o.actualRevenue ?? 0);
    const actualCost = Math.max(0, o.actualCost ?? 0);
    totals.knownActualCosts += actualCost;

    if (["cash_received", "earned_unpaid", "accepted_unpaid"].includes(o.status) && o.actualRevenue === undefined) {
      warnings.push(o.id + ": " + o.status + " requires actualRevenue before it can be counted");
    }

    switch (o.status) {
      case "cash_received":
        totals.verifiedCashReceived += actualRevenue;
        break;
      case "earned_unpaid":
        totals.earnedUnpaid += actualRevenue;
        break;
      case "accepted_unpaid":
        totals.acceptedWork += actualRevenue;
        break;
      case "research":
      case "validated":
      case "execution":
        totals.unconfirmedPotential += Math.max(0, o.expectedRevenue - o.expectedCost);
        break;
      case "dead":
        break;
    }
  }

  for (const totals of Object.values(byCurrency)) {
    totals.verifiedNetCash = totals.verifiedCashReceived - totals.knownActualCosts;
  }

  return { byCurrency, warnings };
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (invokedDirectly) {
  const path = new URL("../data/opportunities.json", import.meta.url);
  const opportunities: Opportunity[] = JSON.parse(fs.readFileSync(path, "utf8"));
  console.log(JSON.stringify(summarizeAccounting(opportunities), null, 2));
}
