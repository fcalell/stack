// The widths a screen is checked at: the narrowest phone (touch), a laptop
// (the list and main stand together, `wide` closed) and a desktop monitor
// (`wide` open, the only width where a cap leaves dead space).
export const WIDTHS = [320, 1280, 1920] as const;

// The viewport's height at every width.
export const HEIGHT = 800;
