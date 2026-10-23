// The gap between the lines of a wrapped run of chips: the fields gap, wider
// than the target less the chip (44 - 24), so no remove act's hit slop, which
// reaches that far past its chip, meets the next line's. The web draws it on
// touch alone.
export const CHIP_LINES = "gap-y-stack";
