import fs from "node:fs";
import { scoreOpportunity } from "./scoring.js";
import type { Opportunity } from "./types.js";

const path = new URL("../data/opportunities.json", import.meta.url);
const opportunities: Opportunity[] = JSON.parse(fs.readFileSync(path, "utf8"));
const scored = opportunities.map((o) => scoreOpportunity(o)).sort((a, b) => b.score - a.score);

for (const o of scored) {
  const warningText = o.warnings.length ? " | WARN " + o.warnings.join(",") : "";
  console.log(
    o.score.toFixed(1).padStart(5) +
      " | " + o.title +
      " | EV " + (o.currency ?? "USD") + " " + o.expectedValue.toLocaleString() +
      " | " + o.daysToPayment + "d | " + o.status + warningText,
  );
}
