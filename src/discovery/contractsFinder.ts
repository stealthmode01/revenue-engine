import type { DiscoveredOpportunity } from "./types.js";
import type { OpportunityEvidence } from "../types.js";

const API_BASE = "https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search";
const RECORD_BASE = "https://www.contractsfinder.service.gov.uk/Published/OCDS/Record";

type ContractsFinderRelease = {
  ocid?: string;
  id?: string;
  date?: string;
  tag?: string[];
  buyer?: { id?: string; name?: string };
  parties?: Array<{ id?: string; name?: string; roles?: string[] }>;
  tender?: {
    id?: string;
    title?: string;
    description?: string;
    status?: string;
    value?: { amount?: number; currency?: string };
    minValue?: { amount?: number; currency?: string };
    maxValue?: { amount?: number; currency?: string };
    tenderPeriod?: { startDate?: string; endDate?: string };
    datePublished?: string;
    mainProcurementCategory?: string;
    items?: Array<{ classification?: { id?: string; description?: string } }>;
    suitability?: { sme?: boolean; vcse?: boolean };
    documents?: Array<{ url?: string; documentType?: string; title?: string }>;
  };
};

type SearchResponse = {
  releases?: ContractsFinderRelease[];
  links?: { next?: string };
};

function primaryEvidence(
  kind: OpportunityEvidence["kind"],
  claim: string,
  source: string,
  observedAt: string,
): OpportunityEvidence {
  return { kind, claim, source, observedAt, strength: "primary" };
}

function getBuyer(release: ContractsFinderRelease): string | undefined {
  if (release.buyer?.name) return release.buyer.name;
  return release.parties?.find((p) => p.roles?.includes("buyer"))?.name;
}

function getValue(release: ContractsFinderRelease): DiscoveredOpportunity["value"] {
  const tender = release.tender;
  if (!tender) return undefined;
  if (typeof tender.value?.amount === "number") {
    return { amount: tender.value.amount, currency: tender.value.currency ?? "GBP", basis: "advertised" };
  }
  if (typeof tender.maxValue?.amount === "number") {
    return { amount: tender.maxValue.amount, currency: tender.maxValue.currency ?? "GBP", basis: "maximum" };
  }
  if (typeof tender.minValue?.amount === "number") {
    return { amount: tender.minValue.amount, currency: tender.minValue.currency ?? "GBP", basis: "minimum" };
  }
  return undefined;
}

function mapStage(release: ContractsFinderRelease): DiscoveredOpportunity["stage"] {
  const tags = release.tag ?? [];
  if (tags.includes("award")) return "award";
  if (tags.includes("planning")) return "future";
  if (tags.includes("tender") || release.tender?.status === "active") return "open";
  return "unknown";
}

export function mapContractsFinderRelease(
  release: ContractsFinderRelease,
  observedAt = new Date().toISOString(),
): DiscoveredOpportunity | null {
  const title = release.tender?.title?.trim();
  const sourceId = release.ocid ?? release.id;
  if (!title || !sourceId) return null;

  const sourceUrl = `${RECORD_BASE}/${encodeURIComponent(sourceId)}`;
  const buyer = getBuyer(release);
  const deadline = release.tender?.tenderPeriod?.endDate;
  const value = getValue(release);
  const evidence: OpportunityEvidence[] = [
    primaryEvidence("source", "Published in the UK Contracts Finder OCDS feed", sourceUrl, observedAt),
  ];
  if (buyer) evidence.push(primaryEvidence("buyer", `Named buyer: ${buyer}`, sourceUrl, observedAt));
  if (deadline) evidence.push(primaryEvidence("deadline", `Tender deadline: ${deadline}`, sourceUrl, observedAt));
  if (value) {
    evidence.push(
      primaryEvidence(
        "budget",
        `Published ${value.basis} value: ${value.currency} ${value.amount}`,
        sourceUrl,
        observedAt,
      ),
    );
  }

  const categories = new Set<string>();
  if (release.tender?.mainProcurementCategory) categories.add(release.tender.mainProcurementCategory);
  for (const item of release.tender?.items ?? []) {
    if (item.classification?.id) categories.add(item.classification.id);
    if (item.classification?.description) categories.add(item.classification.description);
  }

  return {
    sourceId,
    sourceName: "UK Contracts Finder",
    sourceUrl,
    title,
    buyer,
    description: release.tender?.description,
    publishedAt: release.tender?.datePublished ?? release.date,
    deadline,
    stage: mapStage(release),
    value,
    categories: [...categories],
    smeSuitable: release.tender?.suitability?.sme,
    evidence,
  };
}

export type ContractsFinderSearch = {
  publishedFrom: string;
  publishedTo: string;
  stages?: Array<"planning" | "tender" | "award" | "implementation">;
  limit?: number;
  cursor?: string;
};

export async function fetchContractsFinder(
  search: ContractsFinderSearch,
): Promise<DiscoveredOpportunity[]> {
  const url = new URL(API_BASE);
  url.searchParams.set("publishedFrom", search.publishedFrom);
  url.searchParams.set("publishedTo", search.publishedTo);
  url.searchParams.set("stages", (search.stages ?? ["tender"]).join(","));
  url.searchParams.set("limit", String(Math.max(1, Math.min(100, search.limit ?? 100))));
  if (search.cursor) url.searchParams.set("cursor", search.cursor);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "revenue-engine/0.2 (+https://github.com/stealthmode01/revenue-engine)",
    },
  });

  if (response.status === 403) {
    throw new Error(
      "Contracts Finder rate limit reached; official API documentation requires waiting before retrying",
    );
  }
  if (!response.ok) throw new Error(`Contracts Finder HTTP ${response.status}`);

  const body = (await response.json()) as SearchResponse;
  return (body.releases ?? [])
    .map((release) => mapContractsFinderRelease(release))
    .filter((o): o is DiscoveredOpportunity => o !== null);
}
