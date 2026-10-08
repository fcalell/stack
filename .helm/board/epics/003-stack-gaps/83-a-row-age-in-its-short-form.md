---
id: 003-83
status: done
sessions: {}
---
# react-ui: a row's trailing age in its short form

## Goal
Stead's Now rows end in their age, and design/07-interface.md words it short ("2 min", "2 h"); at 375 px the long form ("16 seconds ago") cuts the row's title to two or three letters (github.com/fcalell/stead, packages/server/src/app/routes/_now/-components/now-list.tsx).

## Approach
`age()` in lib/age.ts gives only the long form, and ListRow keeps its trailing age whole while the title yields. Seen at stack f6563f6.

## Shape
`RowTrailing.age` becomes the ISO moment, as the Table's age column takes it. `ListRow` words it in the short form itself and ticks from the shared clock (`useClock`, the Table `Age` cell's pattern), so the caller passes `{ age: item.madeAt }` and the clock plumbing in stead and in both Tables' list form goes.
ui-core `clock.ts` splits `ageWords` into `ageOf(moment, now)` (the unit walk) plus two wordings: the long form stays on `RelativeTimeFormat`, the short uses `Intl.NumberFormat` with `style: "unit"` and `unitDisplay: "short"` ("16 sec", "2 min", "2 hr"), ticking per second under a minute. A future moment keeps the long form. Exact CLDR output is checked when built.
Each plugin's `lib/age.ts` gains public `ageShort(moment, now)` beside `age`; native keeps its Hermes fallback, extended to `NumberFormat` unit support (checked on device). The trailing value stays whole or gone; spoken form is the short text. Sequence after any in-flight ListRow or Table unit.

## Acceptance criteria
- [ ] Stack provides the part on every platform the app runs on.

## Open questions
- [x] Its shape (a component, a variant, a token, an option): the stack session decides.

## Critique
Ship, by a fresh critic at 1280 and 390, light and dark (scratchpad `critique/rows/report.md`).
