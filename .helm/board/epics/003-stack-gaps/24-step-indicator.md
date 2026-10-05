---
id: 003-24
status: done
sessions: {}
---
# ui-core: an onboarding step indicator

## Goal
Martechthings' onboarding runs three steps (properties, standard, import) under "Step n of m". The onboarding pattern names 2 to 4 segments; no roster part draws them.

## Approach
- Reference: the onboarding pattern page's range.

## Acceptance criteria
- [ ] A step indicator draws "Step n of m" or its segments, read as words.

## Shape
New atom `StepCount { at: number; of: number }`: 2–4 segments at the `meter` height (radius `chip`, gap `inside`; done and current in `ink-meta`, later in `fill-neutral`, never the accent) under the words "Step n of m" (slot word `stepOf`) at meta, which are also its accessible name.
