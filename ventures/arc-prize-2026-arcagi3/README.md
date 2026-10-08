# ARC Prize 2026 — ARC-AGI-3 Adaptive Baseline

This venture is the first executable baseline for the ARC Prize 2026 ARC-AGI-3 track.

The official 2026 competition has an $850,000 prize pool. Entry deadline: October 26, 2026. Final submission deadline: November 2, 2026.

## Strategy v1

The official starter uses uniform random actions. This baseline instead:

1. respects the legal action set exposed by each frame;
2. fingerprints each visual state;
3. learns action value online from level progress, novelty, death, and self-loop signals;
4. uses UCB-style exploration to balance known-good actions against untried actions;
5. transforms ACTION6 into a ranked set of visual click targets based on rare connected components;
6. uses deterministic fallback probes when a frame has no clear visual target;
7. resets cleanly after game-over while retaining within-game transition statistics.

This is intentionally model-free. It creates a cheap baseline that can run under Kaggle's no-internet constraints and gives us a stable experiment platform before adding learned vision or model components.

## Validation

- Python syntax check: passed.
- Helper test suite: 4/4 passed.
- Not yet run against the official local game corpus from this runtime.
- Not submitted to Kaggle.
- No prize money is earned or implied.

## Official deployment path

Copy `agent/my_agent.py` into the official `arcprize/ARC-AGI-3-Kaggle-Starter` project, run `make play-local`, then package/push with the starter's Kaggle workflow.

## Daniel-only step later

The account-only steps are accepting the Kaggle competition rules, supplying a Kaggle API token, and performing the final Kaggle submission click. Technical iteration remains the assistant's job.
