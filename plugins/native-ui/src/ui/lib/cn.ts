// ui-core's cn: the tailwind-merge extension taught the contract's five scales
// (type roles, leading, tracking, radius rungs, spacing rungs), so a later
// rung wins over an earlier one on both platforms. uniwind compiles the
// resolved className the same way it would a hand-written one, so this carries
// no runtime style cost.
export { cn } from "@fcalell/ui-core/cn";
