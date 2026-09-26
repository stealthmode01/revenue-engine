# Army Training Verse Challenge II — Submission Plan

## Opportunity status

- Buyer/sponsor: U.S. Army Capability Program Executive Simulation, Training, Test and Threat (CPE ST3)
- Challenge: Army Training Verse Innovation Prize Challenge — Challenge II, Intelligent Simulation Pipeline
- Prize: $100,000
- Initial submission deadline: October 15, 2026 at 11:59 PM EDT
- Eligibility: U.S. citizens age 18+ for individuals; entities must be incorporated in and maintain a primary place of business in the U.S.; prize recipient must be active in SAM.gov and not excluded.
- Official public source: https://centralfloridatechgrove.org/army-training-verse-innovation-prize-challenge/
- Army announcement: https://www.army.mil/article/293796/cpe_st3_announces_army_training_verse_innovation_prize_challenge_to_accelerate_digital_engineering_modernization

This is **unconfirmed opportunity value**, not earned revenue.

## Challenge II requirement mapping

| Requirement | Current MVP | Status |
|---|---|---|
| Convert DE data into simulation content | STEP + SysML-style text + parametric CSV + physics YAML -> STL + canonical model + executable simulation package | Implemented |
| Use AI including generative AI | Live OpenAI behavior-plan adapter plus deterministic fallback | Code implemented; live AI execution not yet evidenced |
| Automated/semi-automated transformation | Ingestion, SHA-256 provenance, CAD translation, attribute merge, behavior generation, package generation, trajectory execution | Implemented |
| Tie CAD, SysMLv2, physical, and parametric data to one ASOT | `asot_manifest.json` and `canonical_model.json` | Implemented |
| Executable experience in a target environment | Python kinematic runtime + dependency-free browser viewer | Implemented MVP |
| Final video demonstration | Not recorded | Blocked on final demo state |
| Presentation with solution, compliance matrix, risks, next steps | This plan is the content skeleton | Needs final slide deck |

## Technical demo sequence

1. Run `python scripts/generate_sample.py` to create a synthetic generic cart STEP model and companion engineering artifacts.
2. Run `python pipeline.py build samples/manifest.yaml --out build/demo`.
3. Show generated ASOT hashes, extracted CAD bounds, canonical model, behavior plan, and packaged STL.
4. Run `python pipeline.py simulate build/demo/package.json --seconds 12 --out build/demo/trajectory.json`.
5. Start `python -m http.server 8000 --directory build/demo` and open `/viewer.html`.
6. For final challenge evidence, repeat step 2 with `--ai-provider openai` and capture the AI-generated behavior output with provenance.

## Before submission

1. Register/join using the official challenge form linked on the Tech Grove page.
2. Confirm the participant-of-record entity/individual satisfies U.S. eligibility rules.
3. Confirm active SAM.gov registration before prize payment eligibility.
4. Run the live generative-AI path once and save the output and log.
5. Add a second synthetic engineering asset to prove reuse, not one-off transformation.
6. Record an access-controlled demo video.
7. Prepare final presentation: solution, requirement-percentage matrix, barriers/risks/mitigations, recommended next steps.
8. Perform an export-control/CUI self-assessment and keep the public demo generic and non-weaponized.

## Accounting

- Verified cash received: $0
- Earned but unpaid: $0
- Accepted paid work: $0
- Unconfirmed opportunity value: $100,000 Challenge II prize
- Direct build cost recorded in this run: $0
