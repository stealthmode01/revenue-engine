export type OpportunityStatus =
  | "research"
  | "validated"
  | "execution"
  | "accepted_unpaid"
  | "earned_unpaid"
  | "cash_received"
  | "dead";

export type Opportunity = {
  id: string;
  title: string;
  category: string;
  source: string;
  buyerEvidence: string[];
  expectedRevenue: number;
  expectedCost: number;
  daysToPayment: number;
  probabilityOfPayment: number;
  scalability: number;
  automationLeverage: number;
  danielInvolvement: number;
  downsideRisk: number;
  status: OpportunityStatus;
  notes?: string;
};

export type ScoredOpportunity = Opportunity & {
  expectedProfit: number;
  expectedValue: number;
  score: number;
};
