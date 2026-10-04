---
id: 005-18
status: backlog
sessions: {}
---
# react-ui, native-ui: Intl formatters are built once per language and options

## Goal
Formatters are constructed in render paths, and constructing one costs far more than formatting
(Hermes most of all): web `Meter` (`components/meter/index.tsx:55-56`), `BarChart`
(`bar-chart/index.tsx:85-86`, `:215`, `:217`), `age` (`lib/age.ts:17`), `moment`
(`lib/moment.ts:7`); phone `age` (`lib/age.ts:24`), `moment` (`lib/moment.ts:9`), `Meter`
(`meter/index.tsx:60-61`), `BarChart` (`bar-chart/index.tsx:90`, `:237`), `compact`
(`lib/compact.ts:13`), `Slider` (`slider/index.tsx:99`, once per drag step). An age or moment
builds one per List row, Table cell and Message per render.

## Approach
One helper per plugin, `formatterFor(kind, lang, options)`, caches formatters at module scope
keyed by language and options. Every site above reads from it.

## Acceptance criteria
- [ ] (test) `formatterFor` returns the same instance for the same language and options, and a new one for another language.
- [ ] (test) no `new Intl.` remains in either plugin outside the helper.
