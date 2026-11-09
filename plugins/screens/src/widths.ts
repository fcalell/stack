// The widths a screen is checked at: the narrowest phone (touch), a laptop
// (the list and the record stand together) and a desktop monitor (the only
// width where a cap leaves dead space).
export const WIDTHS = [320, 1280, 1920] as const;

// The viewport's height at every width.
export const HEIGHT = 800;

// The tallest viewport a full-page shot grows to: a page whose content grows
// with the viewport (taller than `100vh`) would otherwise never stop hiding some.
export const SHOT_MAX_HEIGHT = 16384;
