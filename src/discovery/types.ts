import type { OpportunityEvidence } from "../types.js";

export type DiscoveredValue = {
  amount: number;
  currency: string;
  basis: "advertised" | "minimum" | "maximum" | "estimated";
};

export type DiscoveredOpportunity = {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  title: string;
  buyer?: string;
  description?: string;
  publishedAt?: string;
  deadline?: string;
  stage: "open" | "future" | "award" | "unknown";
  value?: DiscoveredValue;
  categories: string[];
  smeSuitable?: boolean;
  evidence: OpportunityEvidence[];
  raw?: unknown;
};

export type QualifiedDiscovery = DiscoveredOpportunity & {
  qualificationScore: number;
  daysRemaining?: number;
  flags: string[];
  revenueHypothesis: string;
};
