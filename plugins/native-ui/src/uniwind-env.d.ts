// uniwind augments react-native's component props with `className` (and the
// per-prop *ClassName variants). Referencing its global types here lets the
// plugin's own primitives typecheck `<View className=… />` without the
// build-time-generated `uniwind-types.d.ts` (which only exists in a consumer
// app after `stack generate` + a Metro run).
/// <reference types="uniwind/types" />
