# Storybook run: triage of the failing tests

2026-10-06. `pnpm stories:test` over 185 stories (141 component, 28 page, 16 behaviour) at desktop density, 1280 by 800, `CHROME_PATH=/etc/profiles/per-user/fcalell/bin/google-chrome-stable`: 176 pass, 9 fail, 301 s. The run before the page-level rules moved to page stories and the forced looks went was 67 failing of 153 in 331 s. Feeds stories 003-111 to 003-114; drains as they land.

## Page-level rules

A component frame is not a page, and many frames share one document. axe's rules that judge the document as a whole are switched off for component stories in `apps/showcase/.storybook/preview.tsx` (the one place), and on again for page stories: `landmark-no-duplicate-banner`, `landmark-no-duplicate-main`, `landmark-no-duplicate-contentinfo`, `landmark-unique`, `landmark-one-main`, `page-has-heading-one`, `region` (which the a11y addon turns off by default), `heading-order`, `bypass` and `skip-link`. The addon runs axe over `document.body`, so the rules whose selector is `html` (`landmark-one-main`, `page-has-heading-one`, `bypass`, `document-title`, `html-has-lang`) only run when a page story widens the context to `html`, which it does. A probe (two extra `<header>` elements injected into a page story) failed `landmark-no-duplicate-banner` and `landmark-unique`, so the page-level rules do run there. All 28 page stories pass.

## Failing tests

| Test | Class | Rule or assertion | Story |
| --- | --- | --- | --- |
| `behaviour/sheet` `Decision` | real defect | the page behind a `confirm()` sheet is not `inert` or `aria-hidden` | 003-111 |
| `behaviour/sheet` `DockedInFoot` | real defect | focus is on `body` after the docked sheet closes, not on the returned input | 003-114 |
| `Input` `Disabled` | real defect (semantics gap) | `color-contrast`, the `ms` unit at 2.5:1 | 003-112 |
| `TextArea` `Disabled` | real defect (semantics gap) | `color-contrast`, the `5 / 200` budget at 2.5:1 | 003-112 |
| `FileInput` `Disabled` | real defect (semantics gap) | `color-contrast`, file name and size at 2.5:1 | 003-112 |
| `Slider` `Disabled` | real defect (semantics gap) | `color-contrast`, label and value at 2.8:1 | 003-112 |
| `Menu` `Rest` | real finding in Base UI's open popup | `aria-hidden-focus`, `span[data-base-ui-focus-guard]` | 003-113 |
| `Screen` `Rest` | real finding in Base UI's open popup | `aria-hidden-focus`, the same span around the more menu | 003-113 |
| `Select` `Selected` | real finding in Base UI's open popup | `aria-hidden-focus`, the same span around the open list | 003-113 |

No failure is a harness artefact. The 67 earlier failures were: the landmark rules on 50 stories (the harness, now fixed: page-level rules off for component frames and the page-sized split undone), the same three focus-guard and four disabled-text findings, and the disabled-text and guard findings counted per element.

## Evidence

**Sheet in the Shell or a Gate (`Decision`).** `SheetBase` sets `modal={container === undefined}` and `disablePointerDismissal={container !== undefined}` (`sheet/base.tsx`), and `FrameHost` gives every Sheet a `PortalContainer` (the popup layer inside `main`, `shell/host.tsx`). Base UI documents `modal: false` as "user interaction with the rest of the document is allowed", and its `markOthers` applies `aria-hidden` only when `modal` is true (`FloatingFocusManager`: `ariaHidden: modal`); the DOM after `confirm()` shows the page wrapper with `data-base-ui-inert` and no `aria-hidden` or `inert`. The same Sheet outside a host (`Modal`) passes: focus enters, Escape closes, focus returns to the trigger, the page behind is hidden. A screen-reader user in a running app can read the whole page behind a decision.

**Docked Sheet focus (`DockedInFoot`).** `useFootFocus` reads `region.current` in render. `plugin-react` ships `babel-plugin-react-compiler`, and the story passes with `"use no memo"` added to the hook (probe, reverted), so the compiler memoizes the render-time ref read on the stable ref. A keyboard user closing the sheet lands on `body` and has to tab back from the top.

**Disabled text.** The rubric exempts "a disabled part ... from the text and boundary floors", WCAG 1.4.3 exempts text that is part of an inactive user interface component, so the contrast is not a floor violation. axe fails it because its disabled test (`is-disabled`, axe-core 4.13) only recognises `disabled` on a native `fieldset`, `button`, `select`, `input` or `textarea`, or `aria-disabled="true"` on the node or an ancestor, and Base UI's `Field.Root` and `Slider.Root` mark a disabled field with `data-disabled` alone. The inner `input` is natively disabled and exposed as such; the unit, the budget, the file name and the slider's label and value carry no programmatic disabled state, so no tool (and no forced-colours or reader mode that drops the colour) can tell they are inactive. A real semantics gap, with no visual defect.

**Focus guards.** Base UI's `FloatingPortal` renders `FocusGuard` spans only for an open, non-modal popup (`shouldRenderGuards = !modal && open && portalNode`); each is `tabIndex=0` with `aria-hidden="true"`, `role="button"` only for VoiceOver on WebKit, and a focus on it hands focus into or past the popup at once. A screen reader skips it and a keyboard user does not stop on it, so no one is blocked, but the DOM any open Menu, Select or Picker has fails `aria-hidden-focus` (WCAG 4.1.2) and Base UI offers no prop to drop the guards. The stories hold their popup open to draw it, which shows the DOM a real open popup has; no harness change removes it without excluding the rule or the selector, which the approved decision ruled out. The call (upstream, modal popups, or one recorded exception) is the stack session's.

*2026-10-07, the building session (003-113):* the call is one recorded exception, as 003-75 decided for the menu: `[data-base-ui-focus-guard]` is excluded once where each axe run is configured (the showcase preview and the screens floors), each with a `// TODO:` to drop it on a Base UI release whose guards are not focusable or not hidden. Nothing is filed upstream.

## Behaviour tests that pass

Menu (keyboard open, first row focused, arrows, typeahead, Escape, focus returns), Select and Picker (focus into the list, arrows, typeahead, Enter picks, Escape, focus returns), OptionList (radios by arrows, checks by Space), SegmentedControl (radio group, arrows wrap), Table (one tab stop, cell cursor, Home, End, Ctrl+End), List tree (one tab stop, arrows, fold and unfold, Home, End), Slider (arrows, Home, End), InputOtp (digits only, `onComplete`, the checking status), Toast (a polite region, a failed toast as `role="alert"`), Gate (first field focused) and Sheet `Modal` (focus in, Escape, focus back, page behind hidden). Screen, Split and Shell move no focus themselves; Place's only hand-off is the docked sheet's, tested above.
