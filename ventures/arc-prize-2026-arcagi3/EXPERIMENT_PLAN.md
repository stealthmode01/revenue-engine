# ARC Prize 2026 — ARC-AGI-3 Experiment Plan

## Objective

Maximize score on the ARC-AGI-3 Kaggle track while keeping the submission self-contained, offline-compatible, and reproducible.

The competition rewards both level completion and action efficiency, so the agent must learn quickly and avoid wasteful exploration.

## Current baseline

`agent/my_agent.py` is adaptive-v1:
- legal-action filtering;
- exact frame fingerprints;
- online transition values;
- UCB exploration;
- death and self-loop penalties;
- visual connected-component click candidates for ACTION6.

Local helper tests: 4/4 passing.

## Public research findings

1. The official scoring method is Relative Human Action Efficiency (RHAE): completion plus action efficiency relative to human baselines.
2. The official starter runs locally and packages a Kaggle notebook with internet disabled.
3. Public ARC analysis shows strong models succeed by orienting to the environment, forming hypotheses, testing them, and replanning after failed hypotheses.
4. Public competitors are exploring three main families:
   - learned frame-change/action priors;
   - vision/world-model/cognitive architectures;
   - behavior cloning from public human replay data.

## Experiment sequence

### E1 — Adaptive-v1 baseline
Goal: beat the random Stochastic Goose baseline without any model.
Measure:
- levels completed;
- RHAE score;
- actions per completed level;
- deaths/resets;
- unique-state ratio.

Decision rule:
Keep only if it improves both completion and efficiency on the public local set.

### E2 — Directional-control priors
Public analysis suggests ACTION1-ACTION4 frequently behave like directional controls and ACTION5 often acts like interact/commit.
Add a weak prior only after empirical confirmation from the public games:
- detect movable entities from frame deltas;
- infer action-to-motion mapping;
- preserve mappings across levels inside the same game;
- never hard-code hidden game answers.

### E3 — Human-replay behavior prior
Train a compact offline policy on public human replay transitions:
- state/frame encoder;
- action-type classifier;
- ACTION6 coordinate head;
- auxiliary frame-change prediction.

Use the learned model as a prior, not as an oracle:
online evidence overrides the prior after contradictory transitions.

### E4 — Explicit world-model layer
Build a lightweight symbolic hypothesis table:
- candidate controllable entities;
- action effects;
- persistent objects;
- goals/progress indicators;
- hazards/death-causing transitions;
- reversible vs irreversible actions.

Select actions for information gain when uncertain and goal progress when confidence is high.

### E5 — Deliberative model-assisted research agent
Outside the Kaggle no-internet inference loop, use frontier models to analyze public-game traces and generate general heuristics.
Only portable, game-agnostic learned rules may enter the competition agent.

## Submission discipline

- Never spend a Kaggle submission before the local benchmark improves.
- Keep an append-only experiment log.
- Record commit SHA, public-game score, action efficiency and regression notes.
- Open-source prize-eligible solutions as required by competition rules.
- Do not count prize value as revenue before an award is verified.

## Account boundary

Technical work can proceed without Daniel.
Daniel is only needed for:
1. accepting Kaggle competition rules before the October 26 entry deadline;
2. providing a Kaggle API token when we are ready for Kaggle runs;
3. clicking the final competition submission action when a tested build is ready.
