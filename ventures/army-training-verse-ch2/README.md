# Training Verse Challenge II MVP — DE-to-Simulation Pipeline

This repository is a **generic, non-weaponized** proof-of-concept for the U.S. Army Training Verse Innovation Prize Challenge II: Intelligent Simulation Pipeline.

It demonstrates a repeatable digital thread from engineering artifacts to an executable simulation package using only synthetic/open artifacts:

1. Ingest CAD (`.step`), SysML v2-style text (`.sysml`), parametric CSV, and physical-properties YAML.
2. Build an Authoritative Source of Truth (ASOT) manifest with SHA-256 provenance.
3. Extract CAD geometry metadata and export a simulation mesh (`.stl`).
4. Parse a small, documented subset of SysML v2 attributes.
5. Merge engineering attributes and physical/parametric data into one canonical model.
6. Generate a behavior plan. The pipeline supports a live generative-AI provider when an API key is supplied, and has a deterministic fallback for offline validation.
7. Package the model into a target-agnostic simulation bundle.
8. Run an executable kinematic simulation and emit a trajectory.
9. Visualize the trajectory in a dependency-free browser demo.

## Safety boundary

The sample model is a generic unarmed ground cart. The code does not implement weapon effects, target selection, vulnerability modeling, autonomous attack behavior, or operational military tactics.

## Quick start

```bash
python scripts/generate_sample.py
python pipeline.py build samples/manifest.yaml --out build/demo
python pipeline.py simulate build/demo/package.json --seconds 12 --out build/demo/trajectory.json
python -m http.server 8000 --directory build/demo
```

Then open `http://localhost:8000/viewer.html`.

## Generative AI mode

Set `OPENAI_API_KEY` and install `openai`, then run:

```bash
python pipeline.py build samples/manifest.yaml --out build/demo --ai-provider openai
```

The generated behavior is constrained by a JSON schema and the canonical engineering model. The deterministic fallback is used when `--ai-provider deterministic` is selected.

## Challenge II requirement mapping

| Requirement | MVP evidence |
|---|---|
| Convert DE data into simulation content | STEP + SysML + CSV + YAML -> mesh + canonical model + executable simulation package |
| Use AI / generative AI | Optional live LLM behavior-plan generator with structured JSON output; deterministic offline fallback for tests |
| Automated transformation | Ingestion, hashing, CAD translation, attribute merge, behavior generation, packaging, deployment artifacts |
| Tie CAD, SysMLv2, physical and parametric data | `canonical_model.json` + `asot_manifest.json` preserve source hashes and merged values |
| Executable target environment | Python simulation runner + dependency-free browser trajectory viewer |

## Current gaps before prize submission

- Execute and record a **live generative-AI run** (API key required).
- Add a second CAD/SysML asset to demonstrate reuse.
- Record a short demo video.
- Prepare challenge presentation and compliance matrix.
- Confirm participant SAM.gov status before any prize payment.
