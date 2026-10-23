// The gap between the lines of a wrapped run of chips on touch: the fields gap,
// wider than the target less the chip (44 - 24), so no remove act's hit box,
// which reaches that far past its chip, meets the next line's. The desktop keeps
// the run's inside gap, whose hits (28 - 22) already clear. The phone is the
// touch set and takes the role plain.
export const CHIP_LINES = "touch:gap-y-stack";
