---
version: alpha
name: "@fcalell/stack"
description: "The design contract both stack UI plugins render: the approved token sheet behind four knobs, the platform-invariant matrices, and the component roster."
colors:
  primary: "{colors.accent}"
  canvas: "oklch(0.974 0.002 270)"
  surface: "oklch(1 0 0)"
  group: "oklch(0.947 0.004 270)"
  raised: "oklch(1 0 0)"
  edge: "oklch(0.915 0.004 270)"
  edge-raised: "oklch(0.915 0.004 270)"
  edge-strong: "oklch(0.62 0.01 270)"
  scrim: "oklch(0.2 0.01 270 / 0.45)"
  ink-body: "oklch(0.2 0.008 270)"
  ink-meta: "oklch(0.45 0.012 270)"
  ink-faint: "oklch(0.665 0.01 270)"
  accent: "oklch(0.52 0.19 264)"
  on-accent: "oklch(1 0 0)"
  accent-soft: "oklch(0.95 0.023 264)"
  accent-ink: "oklch(0.52 0.19 264)"
  ok: "oklch(0.49 0.129 150)"
  ok-soft: "oklch(0.965 0.04 150)"
  warn: "oklch(0.48 0.099 70)"
  warn-soft: "oklch(0.965 0.036 85)"
  danger: "oklch(0.55 0.19 25)"
  danger-soft: "oklch(0.965 0.016 20)"
  on-danger: "oklch(1 0 0)"
  chip-red: "oklch(0.56 0.2 25)"
  chip-red-soft: "oklch(0.945 0.026 25)"
  chip-red-ink: "oklch(0.42 0.1 25)"
  chip-amber: "oklch(0.65 0.13 85)"
  chip-amber-soft: "oklch(0.945 0.035 85)"
  chip-amber-ink: "oklch(0.42 0.085 85)"
  chip-green: "oklch(0.5 0.154 145)"
  chip-green-soft: "oklch(0.945 0.035 145)"
  chip-green-ink: "oklch(0.42 0.1 145)"
  chip-teal: "oklch(0.61 0.102 195)"
  chip-teal-soft: "oklch(0.945 0.035 195)"
  chip-teal-ink: "oklch(0.42 0.07 195)"
  chip-violet: "oklch(0.51 0.2 305)"
  chip-violet-soft: "oklch(0.945 0.032 305)"
  chip-violet-ink: "oklch(0.42 0.1 305)"
  chip-pink: "oklch(0.51 0.2 350)"
  chip-pink-soft: "oklch(0.945 0.031 350)"
  chip-pink-ink: "oklch(0.42 0.1 350)"
  avatar-1: "oklch(0.88 0.062 20)"
  avatar-1-ink: "oklch(0.38 0.1 20)"
  avatar-2: "oklch(0.88 0.07 60)"
  avatar-2-ink: "oklch(0.38 0.088 60)"
  avatar-3: "oklch(0.88 0.07 100)"
  avatar-3-ink: "oklch(0.38 0.078 100)"
  avatar-4: "oklch(0.88 0.07 150)"
  avatar-4-ink: "oklch(0.38 0.1 150)"
  avatar-5: "oklch(0.88 0.07 190)"
  avatar-5-ink: "oklch(0.38 0.064 190)"
  avatar-6: "oklch(0.88 0.07 230)"
  avatar-6-ink: "oklch(0.38 0.074 230)"
  avatar-7: "oklch(0.88 0.057 270)"
  avatar-7-ink: "oklch(0.38 0.1 270)"
  avatar-8: "oklch(0.88 0.07 320)"
  avatar-8-ink: "oklch(0.38 0.1 320)"
  wash-hover: "oklch(0.2 0.008 270 / 0.05)"
  wash-press: "oklch(0.2 0.008 270 / 0.08)"
  wash-selected: "oklch(0.2 0.008 270 / 0.11)"
  wash-selected-hover: "oklch(0.2 0.008 270 / 0.15)"
  skeleton: "oklch(0.2 0.008 270 / 0.09)"
  fill-disabled: "oklch(0.2 0.008 270 / 0.06)"
  ring: "oklch(0.52 0.19 264)"
  selected-outline: "oklch(0.52 0.19 264)"
  edge-hover: "oklch(0.62 0.01 270)"
  edge-error: "oklch(0.55 0.19 25)"
  ink-error: "oklch(0.55 0.19 25)"
  ink-disabled: "oklch(0.665 0.01 270)"
  act-accent: "oklch(0.52 0.19 264)"
  on-act-accent: "oklch(1 0 0)"
  act-accent-hover: "oklch(0.458 0.167 264)"
  act-accent-press: "oklch(0.406 0.148 264)"
  act-accent-pending: "oklch(0.664 0.133 264)"
  act-ink: "oklch(0.2 0.008 270)"
  on-act-ink: "oklch(0.974 0.002 270)"
  act-ink-hover: "oklch(0.293 0.007 270)"
  act-ink-press: "oklch(0.37 0.007 270)"
  act-ink-pending: "oklch(0.432 0.006 270)"
  switch-off: "oklch(0.62 0.01 270)"
  switch-off-hover: "oklch(0.557 0.01 270)"
  switch-on: "oklch(0.52 0.19 264)"
  switch-on-hover: "oklch(0.458 0.167 264)"
  switch-thumb: "oklch(1 0 0)"
  canvas-dark: "oklch(0.16 0.005 270)"
  surface-dark: "oklch(0.207 0.006 270)"
  group-dark: "oklch(0.243 0.007 270)"
  raised-dark: "oklch(0.243 0.007 270)"
  edge-dark: "oklch(0.298 0.008 270)"
  edge-raised-dark: "oklch(0.332 0.008 270)"
  edge-strong-dark: "oklch(0.53 0.01 270)"
  scrim-dark: "oklch(0 0 0 / 0.5)"
  ink-body-dark: "oklch(0.97 0.002 270)"
  ink-meta-dark: "oklch(0.76 0.01 270)"
  ink-faint-dark: "oklch(0.506 0.01 270)"
  accent-dark: "oklch(0.52 0.19 264)"
  on-accent-dark: "oklch(1 0 0)"
  accent-soft-dark: "oklch(0.29 0.06 264)"
  accent-ink-dark: "oklch(0.72 0.13 264)"
  ok-dark: "oklch(0.64 0.17 150)"
  ok-soft-dark: "oklch(0.28 0.05 150)"
  warn-dark: "oklch(0.75 0.15 80)"
  warn-soft-dark: "oklch(0.28 0.05 75)"
  danger-dark: "oklch(0.71 0.178 25)"
  danger-soft-dark: "oklch(0.28 0.06 25)"
  on-danger-dark: "oklch(0.16 0.005 270)"
  chip-red-dark: "oklch(0.75 0.147 25)"
  chip-red-soft-dark: "oklch(0.3 0.05 25)"
  chip-red-ink-dark: "oklch(0.87 0.068 25)"
  chip-amber-dark: "oklch(0.75 0.15 85)"
  chip-amber-soft-dark: "oklch(0.3 0.05 85)"
  chip-amber-ink-dark: "oklch(0.87 0.08 85)"
  chip-green-dark: "oklch(0.6 0.185 145)"
  chip-green-soft-dark: "oklch(0.3 0.05 145)"
  chip-green-ink-dark: "oklch(0.87 0.08 145)"
  chip-teal-dark: "oklch(0.71 0.118 195)"
  chip-teal-soft-dark: "oklch(0.3 0.05 195)"
  chip-teal-ink-dark: "oklch(0.87 0.08 195)"
  chip-violet-dark: "oklch(0.65 0.2 305)"
  chip-violet-soft-dark: "oklch(0.3 0.05 305)"
  chip-violet-ink-dark: "oklch(0.87 0.078 305)"
  chip-pink-dark: "oklch(0.6 0.2 350)"
  chip-pink-soft-dark: "oklch(0.3 0.05 350)"
  chip-pink-ink-dark: "oklch(0.87 0.08 350)"
  avatar-1-dark: "oklch(0.4 0.08 20)"
  avatar-1-ink-dark: "oklch(0.92 0.04 20)"
  avatar-2-dark: "oklch(0.4 0.08 60)"
  avatar-2-ink-dark: "oklch(0.92 0.05 60)"
  avatar-3-dark: "oklch(0.4 0.08 100)"
  avatar-3-ink-dark: "oklch(0.92 0.05 100)"
  avatar-4-dark: "oklch(0.4 0.08 150)"
  avatar-4-ink-dark: "oklch(0.92 0.05 150)"
  avatar-5-dark: "oklch(0.4 0.068 190)"
  avatar-5-ink-dark: "oklch(0.92 0.05 190)"
  avatar-6-dark: "oklch(0.4 0.078 230)"
  avatar-6-ink-dark: "oklch(0.92 0.047 230)"
  avatar-7-dark: "oklch(0.4 0.08 270)"
  avatar-7-ink-dark: "oklch(0.92 0.037 270)"
  avatar-8-dark: "oklch(0.4 0.08 320)"
  avatar-8-ink-dark: "oklch(0.92 0.05 320)"
  wash-hover-dark: "oklch(0.97 0.002 270 / 0.05)"
  wash-press-dark: "oklch(0.97 0.002 270 / 0.08)"
  wash-selected-dark: "oklch(0.97 0.002 270 / 0.11)"
  wash-selected-hover-dark: "oklch(0.97 0.002 270 / 0.15)"
  skeleton-dark: "oklch(0.97 0.002 270 / 0.09)"
  fill-disabled-dark: "oklch(0.97 0.002 270 / 0.06)"
  ring-dark: "oklch(0.72 0.13 264)"
  selected-outline-dark: "oklch(0.72 0.13 264)"
  edge-hover-dark: "oklch(0.53 0.01 270)"
  edge-error-dark: "oklch(0.71 0.178 25)"
  ink-error-dark: "oklch(0.71 0.178 25)"
  ink-disabled-dark: "oklch(0.506 0.01 270)"
  act-accent-dark: "oklch(0.52 0.19 264)"
  on-act-accent-dark: "oklch(1 0 0)"
  act-accent-hover-dark: "oklch(0.458 0.167 264)"
  act-accent-press-dark: "oklch(0.406 0.148 264)"
  act-accent-pending-dark: "oklch(0.664 0.133 264)"
  act-ink-dark: "oklch(0.97 0.002 270)"
  on-act-ink-dark: "oklch(0.16 0.005 270)"
  act-ink-hover-dark: "oklch(0.873 0.002 270)"
  act-ink-press-dark: "oklch(0.792 0.003 270)"
  act-ink-pending-dark: "oklch(0.727 0.003 270)"
  switch-off-dark: "oklch(0.53 0.01 270)"
  switch-off-hover-dark: "oklch(0.596 0.009 270)"
  switch-on-dark: "oklch(0.52 0.19 264)"
  switch-on-hover-dark: "oklch(0.458 0.167 264)"
  switch-thumb-dark: "oklch(1 0 0)"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 500
    lineHeight: "40px"
    letterSpacing: "-0.02em"
  title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "24px"
    letterSpacing: "-0.01em"
  heading:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: "20px"
    letterSpacing: "-0.005em"
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "20px"
  meta:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "18px"
  caption:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: "16px"
    letterSpacing: "0.01em"
  code:
    fontFamily: "\"JetBrains Mono Variable\", \"JetBrains Mono Variable Fallback\", ui-monospace, \"SFMono-Regular\", Menlo, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "18px"
    fontFeature: "\"liga\" 0, \"calt\" 0"
rounded:
  chip: "4px"
  control: "6px"
  row: "6px"
  card: "8px"
  popover: "8px"
  sheet: "8px"
  dialog: "12px"
  full: "9999px"
spacing:
  inside: "6px"
  control-x: "12px"
  pair: "6px"
  rows: "2px"
  card: "16px"
  fields: "16px"
  sections: "32px"
  page: "24px"
  control: "32px"
  control-compact: "28px"
  field: "38px"
  row: "32px"
  row-2: "48px"
  row-setting: "64px"
  header: "32px"
  target: "24px"
  dot: "6px"
  chip: "20px"
  avatar: "24px"
  spinner: "14px"
  switch-w: "28px"
  switch-h: "16px"
  thumb: "12px"
  switch-inset: "2px"
  skeleton: "12px"
components:
  text-display:
    typography: "{typography.display}"
    textColor: "{colors.ink-body}"
  text-display-dark:
    typography: "{typography.display}"
    textColor: "{colors.ink-body-dark}"
  text-title:
    typography: "{typography.title}"
    textColor: "{colors.ink-body}"
  text-title-dark:
    typography: "{typography.title}"
    textColor: "{colors.ink-body-dark}"
  text-heading:
    typography: "{typography.heading}"
    textColor: "{colors.ink-body}"
  text-heading-dark:
    typography: "{typography.heading}"
    textColor: "{colors.ink-body-dark}"
  text-body:
    typography: "{typography.body}"
    textColor: "{colors.ink-body}"
  text-body-dark:
    typography: "{typography.body}"
    textColor: "{colors.ink-body-dark}"
  text-meta:
    typography: "{typography.meta}"
    textColor: "{colors.ink-meta}"
  text-meta-dark:
    typography: "{typography.meta}"
    textColor: "{colors.ink-meta-dark}"
  text-caption:
    typography: "{typography.caption}"
    textColor: "{colors.ink-meta}"
  text-caption-dark:
    typography: "{typography.caption}"
    textColor: "{colors.ink-meta-dark}"
  text-code:
    typography: "{typography.code}"
    textColor: "{colors.ink-body}"
  text-code-dark:
    typography: "{typography.code}"
    textColor: "{colors.ink-body-dark}"
  button-primary:
    rounded: "{rounded.control}"
    backgroundColor: "{colors.act-accent}"
    height: "{spacing.control}"
  button-primary-dark:
    rounded: "{rounded.control}"
    backgroundColor: "{colors.act-accent-dark}"
    height: "{spacing.control}"
  button-secondary:
    rounded: "{rounded.control}"
    height: "{spacing.control}"
  button-destructive:
    rounded: "{rounded.control}"
    height: "{spacing.control}"
  button-body:
    rounded: "{rounded.control}"
    backgroundColor: "{colors.act-accent}"
    height: "{spacing.control}"
  button-body-dark:
    rounded: "{rounded.control}"
    backgroundColor: "{colors.act-accent-dark}"
    height: "{spacing.control}"
  button-bar:
    rounded: "{rounded.control}"
    backgroundColor: "{colors.act-accent}"
    height: "{spacing.control-compact}"
  button-bar-dark:
    rounded: "{rounded.control}"
    backgroundColor: "{colors.act-accent-dark}"
    height: "{spacing.control-compact}"
  button-label-primary:
    typography: "{typography.body}"
    textColor: "{colors.on-act-accent}"
  button-label-primary-dark:
    typography: "{typography.body}"
    textColor: "{colors.on-act-accent-dark}"
  button-label-secondary:
    typography: "{typography.body}"
    textColor: "{colors.ink-body}"
  button-label-secondary-dark:
    typography: "{typography.body}"
    textColor: "{colors.ink-body-dark}"
  button-label-destructive:
    typography: "{typography.body}"
    textColor: "{colors.danger}"
  button-label-destructive-dark:
    typography: "{typography.body}"
    textColor: "{colors.danger-dark}"
  status-active:
    typography: "{typography.meta}"
    textColor: "{colors.accent-ink}"
  status-active-dark:
    typography: "{typography.meta}"
    textColor: "{colors.accent-ink-dark}"
  status-waiting:
    typography: "{typography.meta}"
    textColor: "{colors.ink-meta}"
  status-waiting-dark:
    typography: "{typography.meta}"
    textColor: "{colors.ink-meta-dark}"
  status-done:
    typography: "{typography.meta}"
    textColor: "{colors.ok}"
  status-done-dark:
    typography: "{typography.meta}"
    textColor: "{colors.ok-dark}"
  status-attention:
    typography: "{typography.meta}"
    textColor: "{colors.warn}"
  status-attention-dark:
    typography: "{typography.meta}"
    textColor: "{colors.warn-dark}"
  status-failed:
    typography: "{typography.meta}"
    textColor: "{colors.danger}"
  status-failed-dark:
    typography: "{typography.meta}"
    textColor: "{colors.danger-dark}"
  status-idle:
    typography: "{typography.meta}"
    textColor: "{colors.ink-meta}"
  status-idle-dark:
    typography: "{typography.meta}"
    textColor: "{colors.ink-meta-dark}"
  field-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.control}"
    height: "{spacing.field}"
    typography: "{typography.body}"
  field-text-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.ink-body-dark}"
    rounded: "{rounded.control}"
    height: "{spacing.field}"
    typography: "{typography.body}"
  field-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.control}"
    height: "{spacing.control}"
    typography: "{typography.body}"
  field-search-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.ink-body-dark}"
    rounded: "{rounded.control}"
    height: "{spacing.control}"
    typography: "{typography.body}"
  field-code:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.control}"
    height: "{spacing.field}"
    typography: "{typography.code}"
  field-code-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.ink-body-dark}"
    rounded: "{rounded.control}"
    height: "{spacing.field}"
    typography: "{typography.code}"
  field-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.control}"
    height: "{spacing.field}"
    typography: "{typography.body}"
  field-default-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.ink-body-dark}"
    rounded: "{rounded.control}"
    height: "{spacing.field}"
    typography: "{typography.body}"
  field-focused:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.control}"
    height: "{spacing.field}"
    typography: "{typography.body}"
  field-focused-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.ink-body-dark}"
    rounded: "{rounded.control}"
    height: "{spacing.field}"
    typography: "{typography.body}"
  field-error:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.control}"
    height: "{spacing.field}"
    typography: "{typography.body}"
  field-error-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.ink-body-dark}"
    rounded: "{rounded.control}"
    height: "{spacing.field}"
    typography: "{typography.body}"
  otp-box-default:
    rounded: "{rounded.control}"
    backgroundColor: "{colors.surface}"
    height: "{spacing.field}"
    width: "{spacing.field}"
  otp-box-default-dark:
    rounded: "{rounded.control}"
    backgroundColor: "{colors.surface-dark}"
    height: "{spacing.field}"
    width: "{spacing.field}"
  otp-box-focused:
    rounded: "{rounded.control}"
    backgroundColor: "{colors.surface}"
    height: "{spacing.field}"
    width: "{spacing.field}"
  otp-box-focused-dark:
    rounded: "{rounded.control}"
    backgroundColor: "{colors.surface-dark}"
    height: "{spacing.field}"
    width: "{spacing.field}"
  otp-box-error:
    rounded: "{rounded.control}"
    backgroundColor: "{colors.surface}"
    height: "{spacing.field}"
    width: "{spacing.field}"
  otp-box-error-dark:
    rounded: "{rounded.control}"
    backgroundColor: "{colors.surface-dark}"
    height: "{spacing.field}"
    width: "{spacing.field}"
  row-rest:
    height: "{spacing.row}"
  row-pressed:
    height: "{spacing.row}"
    backgroundColor: "{colors.wash-press}"
  row-pressed-dark:
    height: "{spacing.row}"
    backgroundColor: "{colors.wash-press-dark}"
  row-selected:
    height: "{spacing.row}"
    backgroundColor: "{colors.wash-selected}"
  row-selected-dark:
    height: "{spacing.row}"
    backgroundColor: "{colors.wash-selected-dark}"
  switch-off:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.switch-off}"
  switch-off-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.switch-off-dark}"
  switch-on:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.switch-on}"
  switch-on-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.switch-on-dark}"
  table-row-selected:
    backgroundColor: "{colors.wash-selected}"
  table-row-selected-dark:
    backgroundColor: "{colors.wash-selected-dark}"
  checkbox-unchecked:
    rounded: "{rounded.chip}"
  checkbox-checked:
    rounded: "{rounded.chip}"
    backgroundColor: "{colors.accent}"
  checkbox-checked-dark:
    rounded: "{rounded.chip}"
    backgroundColor: "{colors.accent-dark}"
  segment-idle:
    rounded: "{rounded.control}"
    height: "{spacing.control-compact}"
    typography: "{typography.body}"
    textColor: "{colors.ink-meta}"
  segment-idle-dark:
    rounded: "{rounded.control}"
    height: "{spacing.control-compact}"
    typography: "{typography.body}"
    textColor: "{colors.ink-meta-dark}"
  segment-selected:
    rounded: "{rounded.control}"
    height: "{spacing.control-compact}"
    typography: "{typography.body}"
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-body}"
  segment-selected-dark:
    rounded: "{rounded.control}"
    height: "{spacing.control-compact}"
    typography: "{typography.body}"
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.ink-body-dark}"
  banner-note:
    rounded: "{rounded.card}"
    typography: "{typography.body}"
    textColor: "{colors.ink-body}"
    backgroundColor: "{colors.accent-soft}"
  banner-note-dark:
    rounded: "{rounded.card}"
    typography: "{typography.body}"
    textColor: "{colors.ink-body-dark}"
    backgroundColor: "{colors.accent-soft-dark}"
  banner-warn:
    rounded: "{rounded.card}"
    typography: "{typography.body}"
    textColor: "{colors.ink-body}"
    backgroundColor: "{colors.warn-soft}"
  banner-warn-dark:
    rounded: "{rounded.card}"
    typography: "{typography.body}"
    textColor: "{colors.ink-body-dark}"
    backgroundColor: "{colors.warn-soft-dark}"
  banner-danger:
    rounded: "{rounded.card}"
    typography: "{typography.body}"
    textColor: "{colors.ink-body}"
    backgroundColor: "{colors.danger-soft}"
  banner-danger-dark:
    rounded: "{rounded.card}"
    typography: "{typography.body}"
    textColor: "{colors.ink-body-dark}"
    backgroundColor: "{colors.danger-soft-dark}"
  toast-state-done:
    backgroundColor: "{colors.ok-soft}"
    textColor: "{colors.ink-body}"
  toast-state-done-dark:
    backgroundColor: "{colors.ok-soft-dark}"
    textColor: "{colors.ink-body-dark}"
  toast-state-attention:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.ink-body}"
  toast-state-attention-dark:
    backgroundColor: "{colors.warn-soft-dark}"
    textColor: "{colors.ink-body-dark}"
  toast-state-failed:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.ink-body}"
  toast-state-failed-dark:
    backgroundColor: "{colors.danger-soft-dark}"
    textColor: "{colors.ink-body-dark}"
  diff-line-context:
    typography: "{typography.code}"
    textColor: "{colors.ink-body}"
  diff-line-context-dark:
    typography: "{typography.code}"
    textColor: "{colors.ink-body-dark}"
  diff-line-added:
    typography: "{typography.code}"
    textColor: "{colors.ink-body}"
    backgroundColor: "{colors.ok-soft}"
  diff-line-added-dark:
    typography: "{typography.code}"
    textColor: "{colors.ink-body-dark}"
    backgroundColor: "{colors.ok-soft-dark}"
  diff-line-removed:
    typography: "{typography.code}"
    textColor: "{colors.ink-body}"
    backgroundColor: "{colors.danger-soft}"
  diff-line-removed-dark:
    typography: "{typography.code}"
    textColor: "{colors.ink-body-dark}"
    backgroundColor: "{colors.danger-soft-dark}"
  diff-line-header:
    typography: "{typography.code}"
    textColor: "{colors.ink-meta}"
    backgroundColor: "{colors.group}"
  diff-line-header-dark:
    typography: "{typography.code}"
    textColor: "{colors.ink-meta-dark}"
    backgroundColor: "{colors.group-dark}"
  message-you:
    rounded: "{rounded.card}"
    backgroundColor: "{colors.group}"
  message-you-dark:
    rounded: "{rounded.card}"
    backgroundColor: "{colors.group-dark}"
  message-system:
    typography: "{typography.meta}"
    textColor: "{colors.ink-meta}"
  message-system-dark:
    typography: "{typography.meta}"
    textColor: "{colors.ink-meta-dark}"
  avatar-1:
    rounded: "{rounded.full}"
    height: "{spacing.avatar}"
    width: "{spacing.avatar}"
    backgroundColor: "{colors.avatar-1}"
    textColor: "{colors.avatar-1-ink}"
  avatar-1-dark:
    rounded: "{rounded.full}"
    height: "{spacing.avatar}"
    width: "{spacing.avatar}"
    backgroundColor: "{colors.avatar-1-dark}"
    textColor: "{colors.avatar-1-ink-dark}"
  avatar-2:
    rounded: "{rounded.full}"
    height: "{spacing.avatar}"
    width: "{spacing.avatar}"
    backgroundColor: "{colors.avatar-2}"
    textColor: "{colors.avatar-2-ink}"
  avatar-2-dark:
    rounded: "{rounded.full}"
    height: "{spacing.avatar}"
    width: "{spacing.avatar}"
    backgroundColor: "{colors.avatar-2-dark}"
    textColor: "{colors.avatar-2-ink-dark}"
  avatar-3:
    rounded: "{rounded.full}"
    height: "{spacing.avatar}"
    width: "{spacing.avatar}"
    backgroundColor: "{colors.avatar-3}"
    textColor: "{colors.avatar-3-ink}"
  avatar-3-dark:
    rounded: "{rounded.full}"
    height: "{spacing.avatar}"
    width: "{spacing.avatar}"
    backgroundColor: "{colors.avatar-3-dark}"
    textColor: "{colors.avatar-3-ink-dark}"
  avatar-4:
    rounded: "{rounded.full}"
    height: "{spacing.avatar}"
    width: "{spacing.avatar}"
    backgroundColor: "{colors.avatar-4}"
    textColor: "{colors.avatar-4-ink}"
  avatar-4-dark:
    rounded: "{rounded.full}"
    height: "{spacing.avatar}"
    width: "{spacing.avatar}"
    backgroundColor: "{colors.avatar-4-dark}"
    textColor: "{colors.avatar-4-ink-dark}"
  avatar-5:
    rounded: "{rounded.full}"
    height: "{spacing.avatar}"
    width: "{spacing.avatar}"
    backgroundColor: "{colors.avatar-5}"
    textColor: "{colors.avatar-5-ink}"
  avatar-5-dark:
    rounded: "{rounded.full}"
    height: "{spacing.avatar}"
    width: "{spacing.avatar}"
    backgroundColor: "{colors.avatar-5-dark}"
    textColor: "{colors.avatar-5-ink-dark}"
  avatar-6:
    rounded: "{rounded.full}"
    height: "{spacing.avatar}"
    width: "{spacing.avatar}"
    backgroundColor: "{colors.avatar-6}"
    textColor: "{colors.avatar-6-ink}"
  avatar-6-dark:
    rounded: "{rounded.full}"
    height: "{spacing.avatar}"
    width: "{spacing.avatar}"
    backgroundColor: "{colors.avatar-6-dark}"
    textColor: "{colors.avatar-6-ink-dark}"
  avatar-7:
    rounded: "{rounded.full}"
    height: "{spacing.avatar}"
    width: "{spacing.avatar}"
    backgroundColor: "{colors.avatar-7}"
    textColor: "{colors.avatar-7-ink}"
  avatar-7-dark:
    rounded: "{rounded.full}"
    height: "{spacing.avatar}"
    width: "{spacing.avatar}"
    backgroundColor: "{colors.avatar-7-dark}"
    textColor: "{colors.avatar-7-ink-dark}"
  avatar-8:
    rounded: "{rounded.full}"
    height: "{spacing.avatar}"
    width: "{spacing.avatar}"
    backgroundColor: "{colors.avatar-8}"
    textColor: "{colors.avatar-8-ink}"
  avatar-8-dark:
    rounded: "{rounded.full}"
    height: "{spacing.avatar}"
    width: "{spacing.avatar}"
    backgroundColor: "{colors.avatar-8-dark}"
    textColor: "{colors.avatar-8-ink-dark}"
  chip-red:
    rounded: "{rounded.full}"
    height: "{spacing.chip}"
    typography: "{typography.caption}"
    backgroundColor: "{colors.chip-red-soft}"
    textColor: "{colors.chip-red-ink}"
  chip-red-dark:
    rounded: "{rounded.full}"
    height: "{spacing.chip}"
    typography: "{typography.caption}"
    backgroundColor: "{colors.chip-red-soft-dark}"
    textColor: "{colors.chip-red-ink-dark}"
  chip-amber:
    rounded: "{rounded.full}"
    height: "{spacing.chip}"
    typography: "{typography.caption}"
    backgroundColor: "{colors.chip-amber-soft}"
    textColor: "{colors.chip-amber-ink}"
  chip-amber-dark:
    rounded: "{rounded.full}"
    height: "{spacing.chip}"
    typography: "{typography.caption}"
    backgroundColor: "{colors.chip-amber-soft-dark}"
    textColor: "{colors.chip-amber-ink-dark}"
  chip-green:
    rounded: "{rounded.full}"
    height: "{spacing.chip}"
    typography: "{typography.caption}"
    backgroundColor: "{colors.chip-green-soft}"
    textColor: "{colors.chip-green-ink}"
  chip-green-dark:
    rounded: "{rounded.full}"
    height: "{spacing.chip}"
    typography: "{typography.caption}"
    backgroundColor: "{colors.chip-green-soft-dark}"
    textColor: "{colors.chip-green-ink-dark}"
  chip-teal:
    rounded: "{rounded.full}"
    height: "{spacing.chip}"
    typography: "{typography.caption}"
    backgroundColor: "{colors.chip-teal-soft}"
    textColor: "{colors.chip-teal-ink}"
  chip-teal-dark:
    rounded: "{rounded.full}"
    height: "{spacing.chip}"
    typography: "{typography.caption}"
    backgroundColor: "{colors.chip-teal-soft-dark}"
    textColor: "{colors.chip-teal-ink-dark}"
  chip-violet:
    rounded: "{rounded.full}"
    height: "{spacing.chip}"
    typography: "{typography.caption}"
    backgroundColor: "{colors.chip-violet-soft}"
    textColor: "{colors.chip-violet-ink}"
  chip-violet-dark:
    rounded: "{rounded.full}"
    height: "{spacing.chip}"
    typography: "{typography.caption}"
    backgroundColor: "{colors.chip-violet-soft-dark}"
    textColor: "{colors.chip-violet-ink-dark}"
  chip-pink:
    rounded: "{rounded.full}"
    height: "{spacing.chip}"
    typography: "{typography.caption}"
    backgroundColor: "{colors.chip-pink-soft}"
    textColor: "{colors.chip-pink-ink}"
  chip-pink-dark:
    rounded: "{rounded.full}"
    height: "{spacing.chip}"
    typography: "{typography.caption}"
    backgroundColor: "{colors.chip-pink-soft-dark}"
    textColor: "{colors.chip-pink-ink-dark}"
  place-idle:
    typography: "{typography.body}"
    textColor: "{colors.ink-meta}"
  place-idle-dark:
    typography: "{typography.body}"
    textColor: "{colors.ink-meta-dark}"
  place-selected:
    typography: "{typography.body}"
    textColor: "{colors.accent-ink}"
  place-selected-dark:
    typography: "{typography.body}"
    textColor: "{colors.accent-ink-dark}"
  button-muted:
    backgroundColor: "{colors.fill-disabled}"
  button-muted-dark:
    backgroundColor: "{colors.fill-disabled-dark}"
  button-muted-label:
    textColor: "{colors.ink-disabled}"
  button-muted-label-dark:
    textColor: "{colors.ink-disabled-dark}"
  checkbox-mark:
    textColor: "{colors.on-accent}"
  checkbox-mark-dark:
    textColor: "{colors.on-accent-dark}"
  code:
    rounded: "{rounded.card}"
    backgroundColor: "{colors.group}"
    padding: "{spacing.card}"
  code-dark:
    rounded: "{rounded.card}"
    backgroundColor: "{colors.group-dark}"
    padding: "{spacing.card}"
  count:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.group}"
    width: "{spacing.chip}"
    typography: "{typography.caption}"
    textColor: "{colors.ink-meta}"
  count-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.group-dark}"
    width: "{spacing.chip}"
    typography: "{typography.caption}"
    textColor: "{colors.ink-meta-dark}"
  diff-gutter:
    textColor: "{colors.ink-meta}"
  diff-gutter-dark:
    textColor: "{colors.ink-meta-dark}"
  field-placeholder:
    textColor: "{colors.ink-meta}"
  field-placeholder-dark:
    textColor: "{colors.ink-meta-dark}"
  group:
    rounded: "{rounded.card}"
    backgroundColor: "{colors.group}"
  group-dark:
    rounded: "{rounded.card}"
    backgroundColor: "{colors.group-dark}"
  icon-button:
    rounded: "{rounded.control}"
    height: "{spacing.control}"
    width: "{spacing.control}"
    textColor: "{colors.ink-body}"
  icon-button-dark:
    rounded: "{rounded.control}"
    height: "{spacing.control}"
    width: "{spacing.control}"
    textColor: "{colors.ink-body-dark}"
  icon-button-bar:
    rounded: "{rounded.control}"
    height: "{spacing.control-compact}"
    width: "{spacing.control-compact}"
    textColor: "{colors.ink-body}"
  icon-button-bar-dark:
    rounded: "{rounded.control}"
    height: "{spacing.control-compact}"
    width: "{spacing.control-compact}"
    textColor: "{colors.ink-body-dark}"
  meter-fill:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.accent}"
  meter-fill-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.accent-dark}"
  meter-track:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.group}"
  meter-track-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.group-dark}"
  pending-bar:
    rounded: "{rounded.control}"
    backgroundColor: "{colors.group}"
    height: "{spacing.control}"
  pending-bar-dark:
    rounded: "{rounded.control}"
    backgroundColor: "{colors.group-dark}"
    height: "{spacing.control}"
  pending-fill:
    rounded: "{rounded.control}"
    backgroundColor: "{colors.accent-soft}"
  pending-fill-dark:
    rounded: "{rounded.control}"
    backgroundColor: "{colors.accent-soft-dark}"
  picker-empty:
    textColor: "{colors.ink-meta}"
  picker-empty-dark:
    textColor: "{colors.ink-meta-dark}"
  place-row-selected:
    backgroundColor: "{colors.wash-selected}"
  place-row-selected-dark:
    backgroundColor: "{colors.wash-selected-dark}"
  scrim:
    backgroundColor: "{colors.scrim}"
  scrim-dark:
    backgroundColor: "{colors.scrim-dark}"
  segmented-control:
    rounded: "{rounded.control}"
    backgroundColor: "{colors.group}"
    padding: "{spacing.rows}"
  segmented-control-dark:
    rounded: "{rounded.control}"
    backgroundColor: "{colors.group-dark}"
    padding: "{spacing.rows}"
  sheet:
    backgroundColor: "{colors.raised}"
  sheet-dark:
    backgroundColor: "{colors.raised-dark}"
  sheet-centered:
    rounded: "{rounded.dialog}"
  status-chip:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.group}"
    height: "{spacing.control}"
  status-chip-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.group-dark}"
    height: "{spacing.control}"
  switch-thumb:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.switch-thumb}"
  switch-thumb-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.switch-thumb-dark}"
  table-cell:
    height: "{spacing.field}"
  toast:
    rounded: "{rounded.card}"
    backgroundColor: "{colors.raised}"
    typography: "{typography.body}"
    textColor: "{colors.ink-body}"
  toast-dark:
    rounded: "{rounded.card}"
    backgroundColor: "{colors.raised-dark}"
    typography: "{typography.body}"
    textColor: "{colors.ink-body-dark}"
---

# @fcalell/stack

Emitted from `@fcalell/ui-core` by `pnpm --filter @fcalell/ui-core design-md`. Never edit it by hand: change the contract and emit again.

## Overview

One closed token contract, the approved foundations sheet, drawn by two UI plugins: `react-ui` on the web and `native-ui` on React Native. A product sets four knobs, never a token; a component renders its matrix cells and takes no class or style. Every color has a light and a dark value: the front matter names the light one bare and the dark one with a `-dark` suffix, and each component entry that names a color has a `-dark` twin. `primary` is `accent`, the primary act's fill.

| Knob | Value |
| --- | --- |
| accentHue | 264 |
| density | `desktop` |
| fonts | sans the platform's, mono `JetBrains Mono Variable` |
| defaultMode | the system preference |

## Colors

Colors are OKLCH, named by the place they draw. Cool neutrals on hue 270, one accent hue (the only one a knob moves; its chroma is held inside sRGB at any hue), three status hues, six chip families, eight avatar steps. A wash is the body ink at an alpha, so it sits on any surface as one more step. Inside a group or a lifted layer the container re-points `edge` to `edge-raised`, so a part never picks between them.

| Role | Light | Dark | Draws |
| --- | --- | --- | --- |
| `canvas` | `oklch(0.974 0.002 270)` | `oklch(0.16 0.005 270)` | the page |
| `surface` | `oklch(1 0 0)` | `oklch(0.207 0.006 270)` | a card, a field, a row |
| `group` | `oklch(0.947 0.004 270)` | `oklch(0.243 0.007 270)` | a filled tile, a chip ground |
| `raised` | `oklch(1 0 0)` | `oklch(0.243 0.007 270)` | a popover, a dialog, a sheet, a toast |
| `edge` | `oklch(0.915 0.004 270)` | `oklch(0.298 0.008 270)` | the hairline over canvas and surface; inside a group or a lifted layer the container re-points it to `edge-raised` |
| `edge-raised` | `oklch(0.915 0.004 270)` | `oklch(0.332 0.008 270)` | the hairline inside a group and on a lifted layer |
| `edge-strong` | `oklch(0.62 0.01 270)` | `oklch(0.53 0.01 270)` | a control's boundary, at 3:1 |
| `scrim` | `oklch(0.2 0.01 270 / 0.45)` | `oklch(0 0 0 / 0.5)` | the veil behind a dialog or a sheet |
| `ink-body` | `oklch(0.2 0.008 270)` | `oklch(0.97 0.002 270)` | the primary line of anything |
| `ink-meta` | `oklch(0.45 0.012 270)` | `oklch(0.76 0.01 270)` | a secondary line, a placeholder, a table header |
| `ink-faint` | `oklch(0.665 0.01 270)` | `oklch(0.506 0.01 270)` | disabled text only |
| `accent` | `oklch(0.52 0.19 264)` | `oklch(0.52 0.19 264)` | the filled act |
| `on-accent` | `oklch(1 0 0)` | `oklch(1 0 0)` | text on `accent` |
| `accent-soft` | `oklch(0.95 0.023 264)` | `oklch(0.29 0.06 264)` | a tinted tile |
| `accent-ink` | `oklch(0.52 0.19 264)` | `oklch(0.72 0.13 264)` | a link, the focus ring, a selection outline |
| `ok` | `oklch(0.49 0.129 150)` | `oklch(0.64 0.17 150)` | the `done` mark, an added line's ink |
| `ok-soft` | `oklch(0.965 0.04 150)` | `oklch(0.28 0.05 150)` | the ground under an `ok` mark, an added line |
| `warn` | `oklch(0.48 0.099 70)` | `oklch(0.75 0.15 80)` | the `attention` mark |
| `warn-soft` | `oklch(0.965 0.036 85)` | `oklch(0.28 0.05 75)` | the ground under a `warn` mark |
| `danger` | `oklch(0.55 0.19 25)` | `oklch(0.71 0.178 25)` | the `failed` mark, a destructive act's label, an error ring |
| `danger-soft` | `oklch(0.965 0.016 20)` | `oklch(0.28 0.06 25)` | the ground under a `danger` mark, a removed line |
| `on-danger` | `oklch(1 0 0)` | `oklch(0.16 0.005 270)` | text on a `danger` fill, the one saturated state |
| `chip-red` | `oklch(0.56 0.2 25)` | `oklch(0.75 0.147 25)` | a `Chip`'s family: the mark (a dot, a chart series), the soft ground, the ink on the soft |
| `chip-red-soft` | `oklch(0.945 0.026 25)` | `oklch(0.3 0.05 25)` | a `Chip`'s family: the mark (a dot, a chart series), the soft ground, the ink on the soft |
| `chip-red-ink` | `oklch(0.42 0.1 25)` | `oklch(0.87 0.068 25)` | a `Chip`'s family: the mark (a dot, a chart series), the soft ground, the ink on the soft |
| `chip-amber` | `oklch(0.65 0.13 85)` | `oklch(0.75 0.15 85)` | a `Chip`'s family: the mark (a dot, a chart series), the soft ground, the ink on the soft |
| `chip-amber-soft` | `oklch(0.945 0.035 85)` | `oklch(0.3 0.05 85)` | a `Chip`'s family: the mark (a dot, a chart series), the soft ground, the ink on the soft |
| `chip-amber-ink` | `oklch(0.42 0.085 85)` | `oklch(0.87 0.08 85)` | a `Chip`'s family: the mark (a dot, a chart series), the soft ground, the ink on the soft |
| `chip-green` | `oklch(0.5 0.154 145)` | `oklch(0.6 0.185 145)` | a `Chip`'s family: the mark (a dot, a chart series), the soft ground, the ink on the soft |
| `chip-green-soft` | `oklch(0.945 0.035 145)` | `oklch(0.3 0.05 145)` | a `Chip`'s family: the mark (a dot, a chart series), the soft ground, the ink on the soft |
| `chip-green-ink` | `oklch(0.42 0.1 145)` | `oklch(0.87 0.08 145)` | a `Chip`'s family: the mark (a dot, a chart series), the soft ground, the ink on the soft |
| `chip-teal` | `oklch(0.61 0.102 195)` | `oklch(0.71 0.118 195)` | a `Chip`'s family: the mark (a dot, a chart series), the soft ground, the ink on the soft |
| `chip-teal-soft` | `oklch(0.945 0.035 195)` | `oklch(0.3 0.05 195)` | a `Chip`'s family: the mark (a dot, a chart series), the soft ground, the ink on the soft |
| `chip-teal-ink` | `oklch(0.42 0.07 195)` | `oklch(0.87 0.08 195)` | a `Chip`'s family: the mark (a dot, a chart series), the soft ground, the ink on the soft |
| `chip-violet` | `oklch(0.51 0.2 305)` | `oklch(0.65 0.2 305)` | a `Chip`'s family: the mark (a dot, a chart series), the soft ground, the ink on the soft |
| `chip-violet-soft` | `oklch(0.945 0.032 305)` | `oklch(0.3 0.05 305)` | a `Chip`'s family: the mark (a dot, a chart series), the soft ground, the ink on the soft |
| `chip-violet-ink` | `oklch(0.42 0.1 305)` | `oklch(0.87 0.078 305)` | a `Chip`'s family: the mark (a dot, a chart series), the soft ground, the ink on the soft |
| `chip-pink` | `oklch(0.51 0.2 350)` | `oklch(0.6 0.2 350)` | a `Chip`'s family: the mark (a dot, a chart series), the soft ground, the ink on the soft |
| `chip-pink-soft` | `oklch(0.945 0.031 350)` | `oklch(0.3 0.05 350)` | a `Chip`'s family: the mark (a dot, a chart series), the soft ground, the ink on the soft |
| `chip-pink-ink` | `oklch(0.42 0.1 350)` | `oklch(0.87 0.08 350)` | a `Chip`'s family: the mark (a dot, a chart series), the soft ground, the ink on the soft |
| `avatar-1` | `oklch(0.88 0.062 20)` | `oklch(0.4 0.08 20)` | an `Avatar`'s fill and the initial on it, one step per name |
| `avatar-1-ink` | `oklch(0.38 0.1 20)` | `oklch(0.92 0.04 20)` | an `Avatar`'s fill and the initial on it, one step per name |
| `avatar-2` | `oklch(0.88 0.07 60)` | `oklch(0.4 0.08 60)` | an `Avatar`'s fill and the initial on it, one step per name |
| `avatar-2-ink` | `oklch(0.38 0.088 60)` | `oklch(0.92 0.05 60)` | an `Avatar`'s fill and the initial on it, one step per name |
| `avatar-3` | `oklch(0.88 0.07 100)` | `oklch(0.4 0.08 100)` | an `Avatar`'s fill and the initial on it, one step per name |
| `avatar-3-ink` | `oklch(0.38 0.078 100)` | `oklch(0.92 0.05 100)` | an `Avatar`'s fill and the initial on it, one step per name |
| `avatar-4` | `oklch(0.88 0.07 150)` | `oklch(0.4 0.08 150)` | an `Avatar`'s fill and the initial on it, one step per name |
| `avatar-4-ink` | `oklch(0.38 0.1 150)` | `oklch(0.92 0.05 150)` | an `Avatar`'s fill and the initial on it, one step per name |
| `avatar-5` | `oklch(0.88 0.07 190)` | `oklch(0.4 0.068 190)` | an `Avatar`'s fill and the initial on it, one step per name |
| `avatar-5-ink` | `oklch(0.38 0.064 190)` | `oklch(0.92 0.05 190)` | an `Avatar`'s fill and the initial on it, one step per name |
| `avatar-6` | `oklch(0.88 0.07 230)` | `oklch(0.4 0.078 230)` | an `Avatar`'s fill and the initial on it, one step per name |
| `avatar-6-ink` | `oklch(0.38 0.074 230)` | `oklch(0.92 0.047 230)` | an `Avatar`'s fill and the initial on it, one step per name |
| `avatar-7` | `oklch(0.88 0.057 270)` | `oklch(0.4 0.08 270)` | an `Avatar`'s fill and the initial on it, one step per name |
| `avatar-7-ink` | `oklch(0.38 0.1 270)` | `oklch(0.92 0.037 270)` | an `Avatar`'s fill and the initial on it, one step per name |
| `avatar-8` | `oklch(0.88 0.07 320)` | `oklch(0.4 0.08 320)` | an `Avatar`'s fill and the initial on it, one step per name |
| `avatar-8-ink` | `oklch(0.38 0.1 320)` | `oklch(0.92 0.05 320)` | an `Avatar`'s fill and the initial on it, one step per name |
| `wash-hover` | `oklch(0.2 0.008 270 / 0.05)` | `oklch(0.97 0.002 270 / 0.05)` | a transparent part under the pointer |
| `wash-press` | `oklch(0.2 0.008 270 / 0.08)` | `oklch(0.97 0.002 270 / 0.08)` | a transparent part pressed |
| `wash-selected` | `oklch(0.2 0.008 270 / 0.11)` | `oklch(0.97 0.002 270 / 0.11)` | a selected row or chip |
| `wash-selected-hover` | `oklch(0.2 0.008 270 / 0.15)` | `oklch(0.97 0.002 270 / 0.15)` | a selected row under the pointer |
| `skeleton` | `oklch(0.2 0.008 270 / 0.09)` | `oklch(0.97 0.002 270 / 0.09)` | a loading bar |
| `fill-disabled` | `oklch(0.2 0.008 270 / 0.06)` | `oklch(0.97 0.002 270 / 0.06)` | a disabled act's or chip's box |
| `ring` | `oklch(0.52 0.19 264)` | `oklch(0.72 0.13 264)` | the focus ring |
| `selected-outline` | `oklch(0.52 0.19 264)` | `oklch(0.72 0.13 264)` | a selected tile's outline |
| `edge-hover` | `oklch(0.62 0.01 270)` | `oklch(0.53 0.01 270)` | a field's boundary under the pointer |
| `edge-error` | `oklch(0.55 0.19 25)` | `oklch(0.71 0.178 25)` | a field's boundary in error |
| `ink-error` | `oklch(0.55 0.19 25)` | `oklch(0.71 0.178 25)` | an error message |
| `ink-disabled` | `oklch(0.665 0.01 270)` | `oklch(0.506 0.01 270)` | a disabled part's label |
| `act-accent` | `oklch(0.52 0.19 264)` | `oklch(0.52 0.19 264)` | the primary act's fill; `-hover`, `-press` and `-pending` its states |
| `on-act-accent` | `oklch(1 0 0)` | `oklch(1 0 0)` | the primary act's label |
| `act-accent-hover` | `oklch(0.458 0.167 264)` | `oklch(0.458 0.167 264)` | the primary act's fill; `-hover`, `-press` and `-pending` its states |
| `act-accent-press` | `oklch(0.406 0.148 264)` | `oklch(0.406 0.148 264)` | the primary act's fill; `-hover`, `-press` and `-pending` its states |
| `act-accent-pending` | `oklch(0.664 0.133 264)` | `oklch(0.664 0.133 264)` | the primary act's fill; `-hover`, `-press` and `-pending` its states |
| `act-ink` | `oklch(0.2 0.008 270)` | `oklch(0.97 0.002 270)` | the ink act, a screen's dark primary; `-hover`, `-press` and `-pending` its states |
| `on-act-ink` | `oklch(0.974 0.002 270)` | `oklch(0.16 0.005 270)` | the ink act's label |
| `act-ink-hover` | `oklch(0.293 0.007 270)` | `oklch(0.873 0.002 270)` | the ink act, a screen's dark primary; `-hover`, `-press` and `-pending` its states |
| `act-ink-press` | `oklch(0.37 0.007 270)` | `oklch(0.792 0.003 270)` | the ink act, a screen's dark primary; `-hover`, `-press` and `-pending` its states |
| `act-ink-pending` | `oklch(0.432 0.006 270)` | `oklch(0.727 0.003 270)` | the ink act, a screen's dark primary; `-hover`, `-press` and `-pending` its states |
| `switch-off` | `oklch(0.62 0.01 270)` | `oklch(0.53 0.01 270)` | a switch's track off; `-hover` under the pointer |
| `switch-off-hover` | `oklch(0.557 0.01 270)` | `oklch(0.596 0.009 270)` | a switch's track off; `-hover` under the pointer |
| `switch-on` | `oklch(0.52 0.19 264)` | `oklch(0.52 0.19 264)` | a switch's track on; `-hover` under the pointer |
| `switch-on-hover` | `oklch(0.458 0.167 264)` | `oklch(0.458 0.167 264)` | a switch's track on; `-hover` under the pointer |
| `switch-thumb` | `oklch(1 0 0)` | `oklch(1 0 0)` | a switch's knob |

Status colors: `active` is `accent-ink`, `waiting` and `idle` are `ink-meta`, `done` is `ok`, `attention` is `warn`, `failed` is `danger`.

## Typography

Seven roles named by place. Two rules decide the role: size follows structure, never emphasis (the primary line of anything is `body`, a secondary line is `meta`, emphasis inside a line is weight 500, never a size change); and a size role names a place once (`title` the page's name, once per screen; `heading` a section's or a card's name, never inside a row; `caption` text inside a small component, never a sentence; `code` what a machine reads). There is no label role: a field label and a row's leading cell are `body` at 500, a table header is `meta` at 500. The scale moves with density (desktop body 13, touch body 16); nothing else moves it.

| Role | Desktop | Touch | Weight | Ink | Place |
| --- | --- | --- | --- | --- | --- |
| `display` | 36px / 40px | 44px / 48px | 500 | `ink-body` | a display number, one per screen |
| `title` | 18px / 24px | 22px / 28px | 600 | `ink-body` | the page's name, once per screen |
| `heading` | 15px / 20px | 18px / 24px | 600 | `ink-body` | a section's or a card's name, never inside a row |
| `body` | 13px / 20px | 16px / 24px | 400 | `ink-body` | the primary line of anything: prose, a row, a field, a menu item |
| `meta` | 12px / 18px | 15px / 22px | 400 | `ink-meta` | a secondary line, a description, a table header at 500 |
| `caption` | 11px / 16px | 14px / 22px | 400 | `ink-meta` | text inside a small component (a chip, a key hint), never a sentence |
| `code` | 12px / 18px | 15px / 22px | 400 | `ink-body` | what a machine reads |

Tracking: `display` -0.02em, `title` -0.01em, `heading` -0.005em, `caption` 0.01em; the rest 0. `sans` is `ui-sans-serif, system-ui, sans-serif`; `mono` is `"JetBrains Mono Variable", "JetBrains Mono Variable Fallback", ui-monospace, "SFMono-Regular", Menlo, monospace` with its ligatures off. Each named family is followed by its metric fallback face. Running text wraps at `measure`, 66ch.

## Layout

Spacing roles are multiples of a 4 px base, picked per density, named by what they separate:

| Role | Desktop | Touch | Separates |
| --- | --- | --- | --- |
| `inside` | 6px | 8px | within a control: icon to label, dot to text |
| `control-x` | 12px | 16px | a control's inline padding |
| `pair` | 6px | 8px | between paired elements: label over input, title over description |
| `rows` | 2px | 4px | between rows in a menu or a nav list |
| `card` | 16px | 16px | a card's or a popover's inset |
| `fields` | 16px | 24px | between fields |
| `sections` | 32px | 40px | between sections of a page |
| `page` | 24px | 16px | the page inset |

Sizes are heights and squares in the same namespace. Density is a theme, never a breakpoint: `desktop` draws the desktop set where the primary pointer is fine and the touch set on a coarse one; `touch` draws the touch set everywhere; a `data-density` attribute on the web root pins either. Every touch target is at least 44px; on the desktop every interactive part keeps a 24px hit area whatever it draws.

| Size | Desktop | Touch | Is |
| --- | --- | --- | --- |
| `control` | 32px | 44px | a button, a segmented control |
| `control-compact` | 28px | 44px | a menu item, a toolbar control |
| `field` | 38px | 48px | a form input |
| `row` | 32px | 48px | a one-line row |
| `row-2` | 48px | 64px | a two-line row |
| `row-setting` | 64px | 72px | a setting row: label and description beside a control |
| `header` | 32px | 44px | a table or strip header |
| `target` | 24px | 44px | the least hit area of any interactive part |
| `dot` | 6px | 8px | a status or chip mark |
| `chip` | 20px | 24px | a chip's height |
| `avatar` | 24px | 32px | an avatar's side |
| `spinner` | 14px | 16px | the spinner inside a pending act |
| `switch-w` | 28px | 40px | a switch's width |
| `switch-h` | 16px | 24px | a switch's height |
| `thumb` | 12px | 20px | a switch's knob |
| `switch-inset` | 2px | 2px | the knob's inset from its track |
| `skeleton` | 12px | 12px | a skeleton bar's height |

Widths of lifted layers, never stretched to their container: `popover` 240px, `toast` 360px, `dialog` 440px, `sheet` 640px. Breakpoints: `tablet` 768px, `desktop` 1024px, `wide` 1440px; they are the only responsive variants.

## Elevation & Depth

A card at rest has a hairline and no shadow. Two levels lift a layer, each per mode: `shadow-float` (light `0 1px 2px rgba(20, 22, 27, 0.06), 0 4px 12px rgba(20, 22, 27, 0.08)`, dark `0 1px 2px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.5)`); `shadow-modal` (light `0 2px 4px rgba(20, 22, 27, 0.06), 0 16px 40px rgba(20, 22, 27, 0.14)`, dark `0 2px 4px rgba(0, 0, 0, 0.4), 0 16px 40px rgba(0, 0, 0, 0.65)`). `shadow-float` lifts a popover, a menu, a picker's list and a toast; `shadow-modal` a dialog, a sheet and a command palette. In dark the lift is carried by the `raised` step and the hairline as much as by the shadow. The hairline is 1 px; the focus ring is `ring` at 2 px, 2 px outside the box, drawn inward inside a list.

## Shapes

| Radius | Value | Rounds |
| --- | --- | --- |
| `chip` | 4px | an outlined chip, a skeleton bar, a checkbox |
| `control` | 6px | a button, a field, a segmented control |
| `row` | 6px | a menu item, a highlighted row |
| `card` | 8px | a card, a toast |
| `popover` | 8px | a popover, a menu |
| `sheet` | 8px | a sheet's leading corners |
| `dialog` | 12px | a dialog |
| `full` | 9999px | a dot, an avatar, the pill chip or status, a switch |

## Components

The front matter's components are the matrix cells: one entry per axis value of each family, a family's label layer folded into it, and one per single cell. Borders, weights, gaps and side paddings stay in the class strings. Every component the roster ships, the families it draws and the states it has:

| Component | Layer | Draws | States |
| --- | --- | --- | --- |
| `Text` | atom | `TEXT`, `TEXT_STRONG` | rest |
| `Icon` | atom | none | rest |
| `Button` | atom | `BUTTON`, `BUTTON_LABEL` | rest, hover, focus, active, disabled, loading |
| `IconButton` | atom | none | rest, hover, focus, active |
| `Count` | atom | none | rest |
| `Status` | atom | `STATUS` | rest, hover, focus, active |
| `Chip` | atom | `CHIP` | rest |
| `Input` | atom | `FIELD` | rest, hover, focus, error |
| `TextArea` | atom | `FIELD` | rest, hover, focus, error |
| `InputOtp` | atom | `OTP_BOX`, `PLACE` | rest, focus, loading, error |
| `EnumInput` | atom | `FIELD` | rest, hover, focus, error |
| `Slider` | atom | none | rest, hover, focus, active |
| `Switch` | atom | `SWITCH` | rest, hover, focus, active, selected |
| `Checkbox` | atom | `CHECKBOX` | rest, hover, focus, active, selected |
| `Spinner` | atom | none | rest |
| `Avatar` | atom | `AVATAR` | rest |
| `Link` | atom | none | rest, hover, focus, active |
| `Place` | layout | none | rest |
| `Screen` | layout | none | rest |
| `Split` | layout | none | rest, empty |
| `Section` | layout | none | rest, hover, focus, active, disabled, loading |
| `Group` | layout | none | rest, loading |
| `List` | layout | none | rest, loading |
| `Form` | layout | `RHYTHM` | rest |
| `Toolbar` | layout | `RHYTHM` | rest |
| `ActionBar` | layout | `RHYTHM` | rest |
| `Columns` | layout | `RHYTHM` | rest |
| `Shell` | layout | `PLACE` | rest, hover, focus, active, selected |
| `ListRow` | shared | `ROW` | rest, hover, focus, active, disabled, selected |
| `DefinitionRow` | shared | `ROW` | rest, hover, focus, active, disabled |
| `FormField` | shared | none | rest, error |
| `ItemHeader` | shared | `STATUS` | rest, loading |
| `SegmentedControl` | shared | `SEGMENT` | rest, hover, focus, active, selected |
| `Sheet` | shared | none | rest, disabled, loading |
| `Picker` | shared | `FIELD`, `ROW` | rest, hover, focus, active, selected |
| `Menu` | shared | none | rest, hover, focus, active |
| `OptionList` | shared | `CHECKBOX`, `ROW` | rest, hover, focus, active, loading, selected |
| `EmptyState` | shared | none | rest |
| `QueryBoundary` | shared | none | rest, loading, error |
| `Toast` | shared | `TOAST_STATE` | rest |
| `Banner` | shared | `BANNER` | rest, disabled |
| `PendingBar` | shared | none | rest, disabled |
| `Prose` | content | none | rest, loading |
| `Code` | content | none | rest, loading |
| `Diff` | content | `DIFF_LINE` | rest, loading |
| `Table` | content | `TABLE_ROW`, `CHECKBOX`, `CHIP`, `PLACE` | rest, hover, focus, active, loading, selected, empty |
| `FileRow` | content | `ROW` | rest, hover, focus, active, loading |
| `ProseDiff` | content | none | rest, loading |
| `Comparison` | content | `ROW` | rest, loading |
| `Message` | content | `MESSAGE` | rest, hover, focus, active, loading |
| `MessageInput` | content | `FIELD` | rest, hover, focus, disabled, loading |
| `Meter` | content | none | rest, loading |
| `BarChart` | content | none | rest, loading |
| `QrCode` | content | none | rest, loading |

### Motion

Durations are read as `duration-<rung>`; every rung is 0 under `prefers-reduced-motion: reduce`. Only transform and opacity animate: a state switches its color, fill and boundary at once. A spinner loops at 800 ms outside the scale and keeps turning under reduced motion.

| Duration | Value | Times |
| --- | --- | --- |
| `instant` | 100 ms | press feedback |
| `fast` | 150 ms | the switch thumb |
| `base` | 200 ms | a popover, a menu or a toast entering |
| `slow` | 300 ms | a sheet or a dialog moving in |

| Curve | Value | Eases |
| --- | --- | --- |
| `out` | `cubic-bezier(0.16, 1, 0.3, 1)` | what enters or answers a touch |
| `in` | `cubic-bezier(0.7, 0, 0.84, 0)` | what leaves |
| `in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | what moves between two places |

## Do's and Don'ts

- Do pick the component that owns the shape before writing markup.
- Do set a knob to move a scale; don't set a token.
- Don't pass `class`, `className`, `classList` or `style` to a component; a look the matrices lack is a new matrix cell.
- Do use tokens only: no literal color, pixel size or arbitrary value.
- Do draw one `title` per screen, no `heading` inside a row, no `caption` sentence; emphasis is weight, never size.
- Do keep text at 4.5:1 or more on its fill; the contract measures every pair it draws.
- Do time motion with a duration rung and a contract curve; don't write a literal duration.
- Do take every word a component draws from `words`; a sentence is a prop.
