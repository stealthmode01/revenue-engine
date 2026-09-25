import fs from "node:fs";
import { fetchContractsFinder } from "./discovery/contractsFinder.js";
import { qualifyDiscovery } from "./discovery/qualify.js";

function isoStart(date: Date): string {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function isoEnd(date: Date): string {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d.toISOString();
}

const now = new Date();
const daysBack = Math.max(1, Number(process.env.DISCOVERY_DAYS_BACK ?? 2));
const minimumValue = Math.max(0, Number(process.env.MIN_VALUE ?? 50_000));
const keywords = (process.env.KEYWORDS ?? "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);
const from = new Date(now.getTime() - daysBack * 86_400_000);

const discovered = await fetchContractsFinder({
  publishedFrom: isoStart(from),
  publishedTo: isoEnd(now),
  stages: ["tender"],
  limit: 100,
});

const qualified = discovered
  .map((o) => qualifyDiscovery(o, { now, minimumValue, keywords, requireOpenStage: true }))
  .filter((o) => !o.flags.some((f) => ["expired", "below_minimum_value", "keyword_miss", "not_open_stage"].includes(f)))
  .sort((a, b) => b.qualificationScore - a.qualificationScore);

const output = {
  generatedAt: now.toISOString(),
  filters: { daysBack, minimumValue, keywords },
  source: "UK Contracts Finder OCDS API",
  discoveredCount: discovered.length,
  qualifiedCount: qualified.length,
  opportunities: qualified,
};

const path = new URL("../data/discovered.json", import.meta.url);
fs.writeFileSync(path, JSON.stringify(output, null, 2) + "\n");
console.log("wrote " + qualified.length + " qualified opportunities to data/discovered.json");
