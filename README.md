# Revenue Engine

Mission: identify, validate, rank, and execute legitimate opportunities capable of producing substantial revenue with minimal manual involvement.

## Operating rule
Ideas do not count. Research does not count. Repository activity does not count. Only verified economics and movement toward payment count.

The engine keeps four money states separate:
1. verified cash received;
2. earned but unpaid;
3. accepted work awaiting completion/payment;
4. unconfirmed opportunity value.

Expected revenue never becomes verified revenue merely because an opportunity is attractive or work has started.

## What the engine does now

### Public-opportunity discovery
`npm run discover` pulls fresh open tender notices from the UK government's Contracts Finder OCDS API, normalizes buyer/value/deadline/source evidence, rejects expired and below-threshold records, and writes ranked candidates to `data/discovered.json`.

Defaults:
- previous 2 publication days;
- tender stage only;
- minimum advertised value 50,000 in the tender's stated currency;
- no category keywords, so discovery remains category-agnostic.

Optional environment variables:

```bash
DISCOVERY_DAYS_BACK=7 MIN_VALUE=100000 KEYWORDS="software,data,marketing" npm run discover
```

Contracts Finder's public OCDS search endpoint is documented by the UK government. The connector caps each request at 100 releases and fails closed on rate-limit responses rather than treating an incomplete fetch as success.

### Opportunity scoring
`npm run score` ranks ledger opportunities by expected value, named-buyer evidence, evidence quality, deadline runway, payment speed, scalability, automation leverage, involvement, downside and competition. Expired deadlines are explicitly penalized.

### Truth-preserving accounting
`npm run accounting` totals verified cash, known actual costs, earned-but-unpaid value, accepted work and unconfirmed potential separately by currency. A `cash_received`, `earned_unpaid`, or `accepted_unpaid` record is not counted unless `actualRevenue` is populated.

### Tests

```bash
npm install
npm test
npm run typecheck
```

## Structure
- `data/opportunities.json` — manually promoted opportunity ledger
- `data/discovered.json` — machine-discovered public opportunities awaiting validation
- `src/discovery/contractsFinder.ts` — open UK procurement source adapter
- `src/discovery/qualify.ts` — hard gates and market-attractiveness ranking
- `src/scoring.ts` — evidence-aware ledger scoring
- `src/accounting.ts` — strict money-state accounting
- `docs/action-record.md` — execution/evidence record

## Source strategy
Prefer primary, structured, open sources that expose real buyer demand and contract values without private-account access. The first implemented source is UK Contracts Finder. The next source target is TED's EU procurement Search API, whose official documentation says published-notice search is openly accessible without authentication.

## Truth standard
Every external-data result must retain its source URL and observation time. Missing buyer, value, deadline, eligibility or competition information is a flag, not an invitation to guess.
