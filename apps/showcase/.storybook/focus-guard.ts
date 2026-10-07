// The one exclusion every axe run here carries: Base UI's focus guards. An open
// non-modal popup (Menu, Select, Picker, a Screen's more menu) renders them
// around its portal as focusable, `aria-hidden` spans that relay Tab into or past
// the popup, so `aria-hidden-focus` flags each one. A keyboard user never rests
// on one. A story-level `a11y.context.exclude` replaces this one (Storybook
// overwrites arrays), so it spreads this in.
// TODO: Base UI 1.8.0 draws the guards on purpose and has no prop to drop them;
// remove this when a release ships guards that are not focusable or not hidden.
export const FOCUS_GUARD = "[data-base-ui-focus-guard]";
