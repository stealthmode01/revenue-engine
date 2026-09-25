import test from "node:test";
import assert from "node:assert/strict";
import { scoreOpportunity } from "../src/scoring.js";
import { summarizeAccounting } from "../src/accounting.js";
import { mapContractsFinderRelease } from "../src/discovery/contractsFinder.js";
import { qualifyDiscovery } from "../src/discovery/qualify.js";
import type { Opportunity } from "../src/types.js";

const base: Opportunity = {
  id: "example",
  title: "Example",
  category: "procurement",
  source: "https://example.test/opportunity",
  buyerEvidence: ["named buyer", "published budget", "published deadline"],
  expectedRevenue: 100000,
  expectedCost: 10000,
  currency: "USD",
  daysToPayment: 30,
  probabilityOfPayment: 0.2,
  scalability: 5,
  automationLeverage: 6,
  danielInvolvement: 2,
  downsideRisk: 2,
  deadline: "2026-10-15T00:00:00Z",
  status: "validated",
};

test("expired opportunity scores lower than active opportunity", () => {
  const now = new Date("2026-09-25T00:00:00Z");
  const active = scoreOpportunity(base, now);
  const expired = scoreOpportunity({ ...base, deadline: "2026-09-01T00:00:00Z" }, now);
  assert.ok(active.score > expired.score);
  assert.ok(expired.warnings.includes("deadline_expired"));
});

test("accounting keeps expected value out of verified cash", () => {
  const summary = summarizeAccounting([base]);
  assert.equal(summary.byCurrency.USD.verifiedCashReceived, 0);
  assert.equal(summary.byCurrency.USD.unconfirmedPotential, 90000);
});

test("Contracts Finder mapper extracts primary evidence", () => {
  const mapped = mapContractsFinderRelease({
    ocid: "ocds-test-123",
    date: "2026-09-25T09:00:00Z",
    tag: ["tender"],
    buyer: { name: "Example Public Buyer" },
    tender: {
      title: "Digital service transformation",
      status: "active",
      value: { amount: 250000, currency: "GBP" },
      tenderPeriod: { endDate: "2026-10-20T12:00:00Z" },
      suitability: { sme: true },
      items: [{ classification: { id: "72000000", description: "IT services" } }],
    },
  }, "2026-09-25T10:00:00Z");

  assert.ok(mapped);
  assert.equal(mapped.buyer, "Example Public Buyer");
  assert.equal(mapped.value?.amount, 250000);
  assert.ok(mapped.evidence.every((e) => e.strength === "primary"));
});

test("qualification penalizes expired and below-threshold tenders", () => {
  const mapped = mapContractsFinderRelease({
    ocid: "ocds-test-456",
    tag: ["tender"],
    buyer: { name: "Example Buyer" },
    tender: {
      title: "Small expired tender",
      status: "active",
      value: { amount: 10000, currency: "GBP" },
      tenderPeriod: { endDate: "2026-09-20T12:00:00Z" },
    },
  }, "2026-09-25T10:00:00Z");

  assert.ok(mapped);
  const q = qualifyDiscovery(mapped, {
    now: new Date("2026-09-25T10:00:00Z"),
    minimumValue: 50000,
  });
  assert.ok(q.flags.includes("expired"));
  assert.ok(q.flags.includes("below_minimum_value"));
  assert.ok(q.qualificationScore < 25);
});
