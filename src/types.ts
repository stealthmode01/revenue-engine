export type OpportunityStatus =
  | "research"
  | "validated"
  | "execution"
  | "accepted_unpaid"
  | "earned_unpaid"
  | "cash_received"
  | "dead";

export type EvidenceStrength = "primary" | "secondary" | "self_reported";

export type OpportunityEvidence = {
  kind: "buyer" | "budget" | "deadline" | "eligibility" | "competition" | "payment" | "source";
  claim: string;
  source: string;
  observedAt: string;
  strength: EvidenceStrength;
};

export type Opportunity = {
  id: string;
  title: string;
  category: string;
  source: string;
  buyerEvidence: string[];
  expectedRevenue: number;
  expectedCost: number;
  currency?: string;
  actualRevenue?: number;
  actualCost?: number;
  daysToPayment: number;
  probabilityOfPayment: number;
  scalability: number;
  automationLeverage: number;
  danielInvolvement: number;
  downsideRisk: number;
  competitionLevel?: number;
  deadline?: string;
  evidence?: OpportunityEvidence[];
  status: OpportunityStatus;
  notes?: string;
};

export type ScoreBreakdown = {
  economics: number;
  buyerEvidence: number;
  evidenceQuality: number;
  deadline: number;
  speed: number;
  scalability: number;
  automation: number;
  involvementPenalty: number;
  riskPenalty: number;
  competitionPenalty: number;
};

export type ScoredOpportunity = Opportunity & {
  expectedProfit: number;
  expectedValue: number;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  warnings: string[];
};
