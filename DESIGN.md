---
version: alpha
name: "@fcalell/stack"
description: "The design contract both stack UI plugins render: tokens derived from a few knobs, the platform-invariant matrices, and the component roster."
colors:
  primary: "{colors.accent}"
  canvas: "oklch(0.966 0.006 261)"
  surface: "oklch(1 0 0)"
  group: "oklch(0.935 0.009 261)"
  edge: "oklch(0.91 0.01 261)"
  ink: "oklch(0.22 0.043 261)"
  ink-meta: "oklch(0.44 0.036 261)"
  ink-faint: "oklch(0.75 0.02 261)"
  accent: "oklch(0.22 0.043 261)"
  accent-soft: "oklch(0.925 0.04 261)"
  on-accent: "oklch(0.966 0.006 261)"
  tint: "oklch(0.5 0.16 261)"
  ok: "oklch(0.5 0.105 160)"
  ok-soft: "oklch(0.92 0.04 160)"
  warn: "oklch(0.5 0.106 75)"
  warn-soft: "oklch(0.912 0.048 80)"
  danger: "oklch(0.5 0.18 28)"
  danger-soft: "oklch(0.915 0.045 28)"
  avatar-1: "oklch(0.88 0.06 261)"
  avatar-2: "oklch(0.88 0.06 306)"
  avatar-3: "oklch(0.88 0.06 351)"
  avatar-4: "oklch(0.88 0.06 36)"
  avatar-5: "oklch(0.88 0.06 81)"
  avatar-6: "oklch(0.88 0.06 126)"
  avatar-7: "oklch(0.88 0.06 171)"
  avatar-8: "oklch(0.88 0.06 216)"
  chip-1: "oklch(0.9 0.07 291)"
  chip-2: "oklch(0.9 0.07 351)"
  chip-3: "oklch(0.9 0.07 51)"
  chip-4: "oklch(0.9 0.07 111)"
  chip-5: "oklch(0.9 0.07 171)"
  chip-6: "oklch(0.9 0.07 231)"
  canvas-dark: "oklch(0.2 0.034 261)"
  surface-dark: "oklch(0.285 0.044 261)"
  group-dark: "oklch(0.35 0.052 261)"
  edge-dark: "oklch(0.37 0.056 261)"
  ink-dark: "oklch(0.967 0.008 261)"
  ink-meta-dark: "oklch(0.755 0.028 261)"
  ink-faint-dark: "oklch(0.45 0.048 261)"
  accent-dark: "oklch(0.967 0.008 261)"
  accent-soft-dark: "oklch(0.34 0.095 261)"
  on-accent-dark: "oklch(0.2 0.034 261)"
  tint-dark: "oklch(0.75 0.155 261)"
  ok-dark: "oklch(0.75 0.14 160)"
  ok-soft-dark: "oklch(0.32 0.07 160)"
  warn-dark: "oklch(0.75 0.14 75)"
  warn-soft-dark: "oklch(0.32 0.06 75)"
  danger-dark: "oklch(0.76 0.17 28)"
  danger-soft-dark: "oklch(0.32 0.08 28)"
  avatar-1-dark: "oklch(0.38 0.09 261)"
  avatar-2-dark: "oklch(0.38 0.09 306)"
  avatar-3-dark: "oklch(0.38 0.09 351)"
  avatar-4-dark: "oklch(0.38 0.09 36)"
  avatar-5-dark: "oklch(0.38 0.09 81)"
  avatar-6-dark: "oklch(0.38 0.09 126)"
  avatar-7-dark: "oklch(0.38 0.09 171)"
  avatar-8-dark: "oklch(0.38 0.09 216)"
  chip-1-dark: "oklch(0.36 0.09 291)"
  chip-2-dark: "oklch(0.36 0.09 351)"
  chip-3-dark: "oklch(0.36 0.09 51)"
  chip-4-dark: "oklch(0.36 0.09 111)"
  chip-5-dark: "oklch(0.36 0.09 171)"
  chip-6-dark: "oklch(0.36 0.09 231)"
  scrim: "oklch(0.22 0.043 261 / 0.8)"
  thumb: "oklch(1 0 0)"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: "40px"
    letterSpacing: "-0.025em"
  title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: "36px"
    letterSpacing: "-0.02em"
  heading:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "24px"
    letterSpacing: "-0.005em"
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  meta:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  label:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "16px"
  mono:
    fontFamily: "\"JetBrains Mono Variable\", \"JetBrains Mono Variable Fallback\", ui-monospace, SFMono-Regular, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
    fontFeature: "\"liga\" 0, \"calt\" 0"
rounded:
  group: "14px"
  sheet: "24px"
  full: "9999px"
spacing:
  pair: "4px"
  row: "8px"
  stack: "12px"
  inset: "16px"
  section: "24px"
  room: "32px"
  floor: "44px"
  row-y: "12px"
  control-y: "8px"
  segment: "36px"
  floor-compact: "32px"
  row-y-compact: "4px"
  control-y-compact: "4px"
  segment-compact: "24px"
components:
  text-display:
    typography: "{typography.display}"
    textColor: "{colors.ink}"
  text-display-dark:
    typography: "{typography.display}"
    textColor: "{colors.ink-dark}"
  text-title:
    typography: "{typography.title}"
    textColor: "{colors.ink}"
  text-title-dark:
    typography: "{typography.title}"
    textColor: "{colors.ink-dark}"
  text-heading:
    typography: "{typography.heading}"
    textColor: "{colors.ink}"
  text-heading-dark:
    typography: "{typography.heading}"
    textColor: "{colors.ink-dark}"
  text-body:
    typography: "{typography.body}"
    textColor: "{colors.ink}"
  text-body-dark:
    typography: "{typography.body}"
    textColor: "{colors.ink-dark}"
  text-meta:
    typography: "{typography.meta}"
    textColor: "{colors.ink-meta}"
  text-meta-dark:
    typography: "{typography.meta}"
    textColor: "{colors.ink-meta-dark}"
  text-label:
    typography: "{typography.label}"
    textColor: "{colors.ink-meta}"
  text-label-dark:
    typography: "{typography.label}"
    textColor: "{colors.ink-meta-dark}"
  text-mono:
    typography: "{typography.mono}"
    textColor: "{colors.ink}"
  text-mono-dark:
    typography: "{typography.mono}"
    textColor: "{colors.ink-dark}"
  button-primary:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.accent}"
    height: "{spacing.floor}"
    textColor: "{colors.on-accent}"
    typography: "{typography.body}"
  button-primary-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.accent-dark}"
    height: "{spacing.floor}"
    textColor: "{colors.on-accent-dark}"
    typography: "{typography.body}"
  button-secondary:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.group}"
    height: "{spacing.floor}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  button-secondary-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.group-dark}"
    height: "{spacing.floor}"
    textColor: "{colors.ink-dark}"
    typography: "{typography.body}"
  button-destructive:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.group}"
    height: "{spacing.floor}"
    textColor: "{colors.danger}"
    typography: "{typography.body}"
  button-destructive-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.group-dark}"
    height: "{spacing.floor}"
    textColor: "{colors.danger-dark}"
    typography: "{typography.body}"
  button-body:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.accent}"
    height: "{spacing.floor}"
    textColor: "{colors.on-accent}"
    typography: "{typography.body}"
  button-body-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.accent-dark}"
    height: "{spacing.floor}"
    textColor: "{colors.on-accent-dark}"
    typography: "{typography.body}"
  button-bar:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.meta}"
  button-bar-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.accent-dark}"
    textColor: "{colors.on-accent-dark}"
    typography: "{typography.meta}"
  status-active:
    typography: "{typography.meta}"
    textColor: "{colors.tint}"
  status-active-dark:
    typography: "{typography.meta}"
    textColor: "{colors.tint-dark}"
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
    backgroundColor: "{colors.group}"
    textColor: "{colors.ink}"
    rounded: "{rounded.group}"
    height: "{spacing.floor}"
    typography: "{typography.body}"
  field-text-dark:
    backgroundColor: "{colors.group-dark}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.group}"
    height: "{spacing.floor}"
    typography: "{typography.body}"
  field-search:
    backgroundColor: "{colors.group}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    height: "{spacing.floor}"
    typography: "{typography.body}"
  field-search-dark:
    backgroundColor: "{colors.group-dark}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.full}"
    height: "{spacing.floor}"
    typography: "{typography.body}"
  field-code:
    backgroundColor: "{colors.group}"
    textColor: "{colors.ink}"
    rounded: "{rounded.group}"
    height: "{spacing.floor}"
    typography: "{typography.mono}"
  field-code-dark:
    backgroundColor: "{colors.group-dark}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.group}"
    height: "{spacing.floor}"
    typography: "{typography.mono}"
  field-default:
    backgroundColor: "{colors.group}"
    textColor: "{colors.ink}"
    rounded: "{rounded.group}"
    height: "{spacing.floor}"
    typography: "{typography.body}"
  field-default-dark:
    backgroundColor: "{colors.group-dark}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.group}"
    height: "{spacing.floor}"
    typography: "{typography.body}"
  field-focused:
    backgroundColor: "{colors.group}"
    textColor: "{colors.ink}"
    rounded: "{rounded.group}"
    height: "{spacing.floor}"
    typography: "{typography.body}"
  field-focused-dark:
    backgroundColor: "{colors.group-dark}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.group}"
    height: "{spacing.floor}"
    typography: "{typography.body}"
  field-error:
    backgroundColor: "{colors.group}"
    textColor: "{colors.ink}"
    rounded: "{rounded.group}"
    height: "{spacing.floor}"
    typography: "{typography.body}"
  field-error-dark:
    backgroundColor: "{colors.group-dark}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.group}"
    height: "{spacing.floor}"
    typography: "{typography.body}"
  otp-box-default:
    rounded: "{rounded.group}"
    backgroundColor: "{colors.group}"
    height: "{spacing.floor}"
    width: "{spacing.floor}"
  otp-box-default-dark:
    rounded: "{rounded.group}"
    backgroundColor: "{colors.group-dark}"
    height: "{spacing.floor}"
    width: "{spacing.floor}"
  otp-box-focused:
    rounded: "{rounded.group}"
    backgroundColor: "{colors.group}"
    height: "{spacing.floor}"
    width: "{spacing.floor}"
  otp-box-focused-dark:
    rounded: "{rounded.group}"
    backgroundColor: "{colors.group-dark}"
    height: "{spacing.floor}"
    width: "{spacing.floor}"
  otp-box-error:
    rounded: "{rounded.group}"
    backgroundColor: "{colors.group}"
    height: "{spacing.floor}"
    width: "{spacing.floor}"
  otp-box-error-dark:
    rounded: "{rounded.group}"
    backgroundColor: "{colors.group-dark}"
    height: "{spacing.floor}"
    width: "{spacing.floor}"
  row-rest:
    height: "{spacing.floor}"
  row-pressed:
    height: "{spacing.floor}"
    backgroundColor: "{colors.edge}"
  row-pressed-dark:
    height: "{spacing.floor}"
    backgroundColor: "{colors.edge-dark}"
  row-selected:
    height: "{spacing.floor}"
    backgroundColor: "{colors.accent-soft}"
  row-selected-dark:
    height: "{spacing.floor}"
    backgroundColor: "{colors.accent-soft-dark}"
  switch-off:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.edge}"
  switch-off-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.edge-dark}"
  switch-on:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.accent}"
  switch-on-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.accent-dark}"
  table-row-selected:
    backgroundColor: "{colors.accent-soft}"
  table-row-selected-dark:
    backgroundColor: "{colors.accent-soft-dark}"
  checkbox-unchecked:
    rounded: "{rounded.full}"
  checkbox-checked:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.accent}"
  checkbox-checked-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.accent-dark}"
  segment-idle:
    rounded: "{rounded.full}"
    height: "{spacing.segment}"
    typography: "{typography.meta}"
    textColor: "{colors.ink-meta}"
  segment-idle-dark:
    rounded: "{rounded.full}"
    height: "{spacing.segment}"
    typography: "{typography.meta}"
    textColor: "{colors.ink-meta-dark}"
  segment-selected:
    rounded: "{rounded.full}"
    height: "{spacing.segment}"
    typography: "{typography.meta}"
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
  segment-selected-dark:
    rounded: "{rounded.full}"
    height: "{spacing.segment}"
    typography: "{typography.meta}"
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.ink-dark}"
  banner-note:
    typography: "{typography.meta}"
    textColor: "{colors.ink}"
    backgroundColor: "{colors.accent-soft}"
  banner-note-dark:
    typography: "{typography.meta}"
    textColor: "{colors.ink-dark}"
    backgroundColor: "{colors.accent-soft-dark}"
  banner-warn:
    typography: "{typography.meta}"
    textColor: "{colors.ink}"
    backgroundColor: "{colors.warn-soft}"
  banner-warn-dark:
    typography: "{typography.meta}"
    textColor: "{colors.ink-dark}"
    backgroundColor: "{colors.warn-soft-dark}"
  banner-danger:
    typography: "{typography.meta}"
    textColor: "{colors.ink}"
    backgroundColor: "{colors.danger-soft}"
  banner-danger-dark:
    typography: "{typography.meta}"
    textColor: "{colors.ink-dark}"
    backgroundColor: "{colors.danger-soft-dark}"
  toast-state-done:
    backgroundColor: "{colors.ok-soft}"
    textColor: "{colors.ink}"
  toast-state-done-dark:
    backgroundColor: "{colors.ok-soft-dark}"
    textColor: "{colors.ink-dark}"
  toast-state-attention:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.ink}"
  toast-state-attention-dark:
    backgroundColor: "{colors.warn-soft-dark}"
    textColor: "{colors.ink-dark}"
  toast-state-failed:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.ink}"
  toast-state-failed-dark:
    backgroundColor: "{colors.danger-soft-dark}"
    textColor: "{colors.ink-dark}"
  diff-line-context:
    typography: "{typography.mono}"
    textColor: "{colors.ink}"
  diff-line-context-dark:
    typography: "{typography.mono}"
    textColor: "{colors.ink-dark}"
  diff-line-added:
    typography: "{typography.mono}"
    textColor: "{colors.ink}"
    backgroundColor: "{colors.ok-soft}"
  diff-line-added-dark:
    typography: "{typography.mono}"
    textColor: "{colors.ink-dark}"
    backgroundColor: "{colors.ok-soft-dark}"
  diff-line-removed:
    typography: "{typography.mono}"
    textColor: "{colors.ink}"
    backgroundColor: "{colors.danger-soft}"
  diff-line-removed-dark:
    typography: "{typography.mono}"
    textColor: "{colors.ink-dark}"
    backgroundColor: "{colors.danger-soft-dark}"
  diff-line-header:
    typography: "{typography.mono}"
    textColor: "{colors.ink-meta}"
    backgroundColor: "{colors.group}"
  diff-line-header-dark:
    typography: "{typography.mono}"
    textColor: "{colors.ink-meta-dark}"
    backgroundColor: "{colors.group-dark}"
  message-you:
    rounded: "{rounded.sheet}"
    backgroundColor: "{colors.group}"
  message-you-dark:
    rounded: "{rounded.sheet}"
    backgroundColor: "{colors.group-dark}"
  message-system:
    typography: "{typography.meta}"
    textColor: "{colors.ink-meta}"
  message-system-dark:
    typography: "{typography.meta}"
    textColor: "{colors.ink-meta-dark}"
  avatar-1:
    rounded: "{rounded.full}"
    textColor: "{colors.ink}"
    backgroundColor: "{colors.avatar-1}"
  avatar-1-dark:
    rounded: "{rounded.full}"
    textColor: "{colors.ink-dark}"
    backgroundColor: "{colors.avatar-1-dark}"
  avatar-2:
    rounded: "{rounded.full}"
    textColor: "{colors.ink}"
    backgroundColor: "{colors.avatar-2}"
  avatar-2-dark:
    rounded: "{rounded.full}"
    textColor: "{colors.ink-dark}"
    backgroundColor: "{colors.avatar-2-dark}"
  avatar-3:
    rounded: "{rounded.full}"
    textColor: "{colors.ink}"
    backgroundColor: "{colors.avatar-3}"
  avatar-3-dark:
    rounded: "{rounded.full}"
    textColor: "{colors.ink-dark}"
    backgroundColor: "{colors.avatar-3-dark}"
  avatar-4:
    rounded: "{rounded.full}"
    textColor: "{colors.ink}"
    backgroundColor: "{colors.avatar-4}"
  avatar-4-dark:
    rounded: "{rounded.full}"
    textColor: "{colors.ink-dark}"
    backgroundColor: "{colors.avatar-4-dark}"
  avatar-5:
    rounded: "{rounded.full}"
    textColor: "{colors.ink}"
    backgroundColor: "{colors.avatar-5}"
  avatar-5-dark:
    rounded: "{rounded.full}"
    textColor: "{colors.ink-dark}"
    backgroundColor: "{colors.avatar-5-dark}"
  avatar-6:
    rounded: "{rounded.full}"
    textColor: "{colors.ink}"
    backgroundColor: "{colors.avatar-6}"
  avatar-6-dark:
    rounded: "{rounded.full}"
    textColor: "{colors.ink-dark}"
    backgroundColor: "{colors.avatar-6-dark}"
  avatar-7:
    rounded: "{rounded.full}"
    textColor: "{colors.ink}"
    backgroundColor: "{colors.avatar-7}"
  avatar-7-dark:
    rounded: "{rounded.full}"
    textColor: "{colors.ink-dark}"
    backgroundColor: "{colors.avatar-7-dark}"
  avatar-8:
    rounded: "{rounded.full}"
    textColor: "{colors.ink}"
    backgroundColor: "{colors.avatar-8}"
  avatar-8-dark:
    rounded: "{rounded.full}"
    textColor: "{colors.ink-dark}"
    backgroundColor: "{colors.avatar-8-dark}"
  chip-1:
    rounded: "{rounded.full}"
    typography: "{typography.label}"
    textColor: "{colors.ink}"
    backgroundColor: "{colors.chip-1}"
  chip-1-dark:
    rounded: "{rounded.full}"
    typography: "{typography.label}"
    textColor: "{colors.ink-dark}"
    backgroundColor: "{colors.chip-1-dark}"
  chip-2:
    rounded: "{rounded.full}"
    typography: "{typography.label}"
    textColor: "{colors.ink}"
    backgroundColor: "{colors.chip-2}"
  chip-2-dark:
    rounded: "{rounded.full}"
    typography: "{typography.label}"
    textColor: "{colors.ink-dark}"
    backgroundColor: "{colors.chip-2-dark}"
  chip-3:
    rounded: "{rounded.full}"
    typography: "{typography.label}"
    textColor: "{colors.ink}"
    backgroundColor: "{colors.chip-3}"
  chip-3-dark:
    rounded: "{rounded.full}"
    typography: "{typography.label}"
    textColor: "{colors.ink-dark}"
    backgroundColor: "{colors.chip-3-dark}"
  chip-4:
    rounded: "{rounded.full}"
    typography: "{typography.label}"
    textColor: "{colors.ink}"
    backgroundColor: "{colors.chip-4}"
  chip-4-dark:
    rounded: "{rounded.full}"
    typography: "{typography.label}"
    textColor: "{colors.ink-dark}"
    backgroundColor: "{colors.chip-4-dark}"
  chip-5:
    rounded: "{rounded.full}"
    typography: "{typography.label}"
    textColor: "{colors.ink}"
    backgroundColor: "{colors.chip-5}"
  chip-5-dark:
    rounded: "{rounded.full}"
    typography: "{typography.label}"
    textColor: "{colors.ink-dark}"
    backgroundColor: "{colors.chip-5-dark}"
  chip-6:
    rounded: "{rounded.full}"
    typography: "{typography.label}"
    textColor: "{colors.ink}"
    backgroundColor: "{colors.chip-6}"
  chip-6-dark:
    rounded: "{rounded.full}"
    typography: "{typography.label}"
    textColor: "{colors.ink-dark}"
    backgroundColor: "{colors.chip-6-dark}"
  place-idle:
    typography: "{typography.label}"
    textColor: "{colors.ink-meta}"
  place-idle-dark:
    typography: "{typography.label}"
    textColor: "{colors.ink-meta-dark}"
  place-selected:
    typography: "{typography.label}"
    textColor: "{colors.accent}"
  place-selected-dark:
    typography: "{typography.label}"
    textColor: "{colors.accent-dark}"
  button-muted:
    backgroundColor: "{colors.group}"
  button-muted-dark:
    backgroundColor: "{colors.group-dark}"
  button-muted-label:
    textColor: "{colors.ink-faint}"
  button-muted-label-dark:
    textColor: "{colors.ink-faint-dark}"
  checkbox-mark:
    textColor: "{colors.on-accent}"
  checkbox-mark-dark:
    textColor: "{colors.on-accent-dark}"
  code:
    rounded: "{rounded.group}"
    backgroundColor: "{colors.group}"
    padding: "{spacing.stack}"
  code-dark:
    rounded: "{rounded.group}"
    backgroundColor: "{colors.group-dark}"
    padding: "{spacing.stack}"
  count:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.group}"
    typography: "{typography.label}"
    textColor: "{colors.tint}"
  count-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.group-dark}"
    typography: "{typography.label}"
    textColor: "{colors.tint-dark}"
  diff-gutter:
    textColor: "{colors.ink-faint}"
  diff-gutter-dark:
    textColor: "{colors.ink-faint-dark}"
  field-placeholder:
    textColor: "{colors.ink-faint}"
  field-placeholder-dark:
    textColor: "{colors.ink-faint-dark}"
  group:
    rounded: "{rounded.group}"
    backgroundColor: "{colors.group}"
  group-dark:
    rounded: "{rounded.group}"
    backgroundColor: "{colors.group-dark}"
  icon-button:
    rounded: "{rounded.full}"
    height: "{spacing.floor}"
    width: "{spacing.floor}"
    backgroundColor: "{colors.group}"
    textColor: "{colors.ink}"
  icon-button-dark:
    rounded: "{rounded.full}"
    height: "{spacing.floor}"
    width: "{spacing.floor}"
    backgroundColor: "{colors.group-dark}"
    textColor: "{colors.ink-dark}"
  icon-button-bar:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.group}"
    textColor: "{colors.ink}"
  icon-button-bar-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.group-dark}"
    textColor: "{colors.ink-dark}"
  meter-fill:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.tint}"
  meter-fill-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.tint-dark}"
  meter-track:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.group}"
  meter-track-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.group-dark}"
  pending-bar:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.group}"
    height: "{spacing.floor}"
  pending-bar-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.group-dark}"
    height: "{spacing.floor}"
  pending-fill:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.accent-soft}"
  pending-fill-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.accent-soft-dark}"
  picker-empty:
    textColor: "{colors.ink-meta}"
  picker-empty-dark:
    textColor: "{colors.ink-meta-dark}"
  place-row-selected:
    backgroundColor: "{colors.accent-soft}"
  place-row-selected-dark:
    backgroundColor: "{colors.accent-soft-dark}"
  scrim:
    backgroundColor: "{colors.scrim}"
  segmented-control:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.group}"
    padding: "{spacing.pair}"
  segmented-control-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.group-dark}"
    padding: "{spacing.pair}"
  sheet:
    backgroundColor: "{colors.surface}"
  sheet-dark:
    backgroundColor: "{colors.surface-dark}"
  sheet-centered:
    rounded: "{rounded.sheet}"
  status-chip:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.group}"
    height: "{spacing.floor}"
  status-chip-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.group-dark}"
    height: "{spacing.floor}"
  switch-thumb:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.thumb}"
  table-cell:
    height: "{spacing.floor}"
  toast:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.ink}"
    typography: "{typography.meta}"
    textColor: "{colors.canvas}"
  toast-dark:
    rounded: "{rounded.full}"
    backgroundColor: "{colors.ink-dark}"
    typography: "{typography.meta}"
    textColor: "{colors.canvas-dark}"
---

# @fcalell/stack

Emitted from `@fcalell/ui-core` by `pnpm --filter @fcalell/ui-core design-md`. Never edit it by hand: change the contract and emit again.

## Overview

One closed token contract, derived from a few knobs, drawn by two UI plugins: `react-ui` on the web and `native-ui` on React Native. A product sets knobs, never tokens; a component renders its matrix cells and takes no class or style. Every color has a light and a dark value: the front matter names the light one bare and the dark one with a `-dark` suffix, and each component entry that names a color has a `-dark` twin. `primary` is `accent`, the primary act's fill.

| Knob | Value |
| --- | --- |
| accentHue | 261 |
| neutralHue | 261 |
| neutralChroma | 1 |
| okHue, warnHue, dangerHue | 160, 75, 28 |
| primary | `ink` |
| space | 4 px |
| radius | 14 px |
| text | 16 px |
| elevation | `soft` |
| density | `touch` |
| motion | 200 ms |

## Colors

Colors are OKLCH, named by use. One accent hue, near-achromatic greys, three state hues. `on-accent` is `canvas`; under `primary: ink` `accent` is `ink`.

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| `canvas` | `oklch(0.966 0.006 261)` | `oklch(0.2 0.034 261)` | the frame behind the content, the page around a group |
| `surface` | `oklch(1 0 0)` | `oklch(0.285 0.044 261)` | the content column, a sheet, a picker's list |
| `group` | `oklch(0.935 0.009 261)` | `oklch(0.35 0.052 261)` | a group's fill, an input, a search field |
| `edge` | `oklch(0.91 0.01 261)` | `oklch(0.37 0.056 261)` | the hairline between columns and rows; a pressed row's fill |
| `ink` | `oklch(0.22 0.043 261)` | `oklch(0.967 0.008 261)` | titles and body |
| `ink-meta` | `oklch(0.44 0.036 261)` | `oklch(0.755 0.028 261)` | meta lines, section labels, descriptions |
| `ink-faint` | `oklch(0.75 0.02 261)` | `oklch(0.45 0.048 261)` | an input's placeholder and a disabled control |
| `accent` | `oklch(0.22 0.043 261)` | `oklch(0.967 0.008 261)` | the primary act's fill, a switch that is on, the selected place |
| `accent-soft` | `oklch(0.925 0.04 261)` | `oklch(0.34 0.095 261)` | a selected row |
| `on-accent` | `oklch(0.966 0.006 261)` | `oklch(0.2 0.034 261)` | text on `accent` |
| `tint` | `oklch(0.5 0.16 261)` | `oklch(0.75 0.155 261)` | focus, a link, a count, an `active` status |
| `ok` | `oklch(0.5 0.105 160)` | `oklch(0.75 0.14 160)` | a `done` mark, an added line |
| `ok-soft` | `oklch(0.92 0.04 160)` | `oklch(0.32 0.07 160)` | the fill under an `ok` mark |
| `warn` | `oklch(0.5 0.106 75)` | `oklch(0.75 0.14 75)` | an `attention` mark |
| `warn-soft` | `oklch(0.912 0.048 80)` | `oklch(0.32 0.06 75)` | the fill under a `warn` mark |
| `danger` | `oklch(0.5 0.18 28)` | `oklch(0.76 0.17 28)` | a `failed` mark, a destructive act's text, an error ring |
| `danger-soft` | `oklch(0.915 0.045 28)` | `oklch(0.32 0.08 28)` | the fill under a `danger` mark, a removed line |
| `avatar-1` | `oklch(0.88 0.06 261)` | `oklch(0.38 0.09 261)` | an `Avatar`'s fill, one step per name |
| `avatar-2` | `oklch(0.88 0.06 306)` | `oklch(0.38 0.09 306)` | an `Avatar`'s fill, one step per name |
| `avatar-3` | `oklch(0.88 0.06 351)` | `oklch(0.38 0.09 351)` | an `Avatar`'s fill, one step per name |
| `avatar-4` | `oklch(0.88 0.06 36)` | `oklch(0.38 0.09 36)` | an `Avatar`'s fill, one step per name |
| `avatar-5` | `oklch(0.88 0.06 81)` | `oklch(0.38 0.09 81)` | an `Avatar`'s fill, one step per name |
| `avatar-6` | `oklch(0.88 0.06 126)` | `oklch(0.38 0.09 126)` | an `Avatar`'s fill, one step per name |
| `avatar-7` | `oklch(0.88 0.06 171)` | `oklch(0.38 0.09 171)` | an `Avatar`'s fill, one step per name |
| `avatar-8` | `oklch(0.88 0.06 216)` | `oklch(0.38 0.09 216)` | an `Avatar`'s fill, one step per name |
| `chip-1` | `oklch(0.9 0.07 291)` | `oklch(0.36 0.09 291)` | a `Chip`'s fill, one per data family |
| `chip-2` | `oklch(0.9 0.07 351)` | `oklch(0.36 0.09 351)` | a `Chip`'s fill, one per data family |
| `chip-3` | `oklch(0.9 0.07 51)` | `oklch(0.36 0.09 51)` | a `Chip`'s fill, one per data family |
| `chip-4` | `oklch(0.9 0.07 111)` | `oklch(0.36 0.09 111)` | a `Chip`'s fill, one per data family |
| `chip-5` | `oklch(0.9 0.07 171)` | `oklch(0.36 0.09 171)` | a `Chip`'s fill, one per data family |
| `chip-6` | `oklch(0.9 0.07 231)` | `oklch(0.36 0.09 231)` | a `Chip`'s fill, one per data family |

| Invariant | Both modes | Use |
| --- | --- | --- |
| `scrim` | `oklch(0.22 0.043 261 / 0.8)` | the veil behind a sheet |
| `thumb` | `oklch(1 0 0)` | the switch's knob, white in both modes |

Status colors: `active` is `tint`, `waiting` is `ink-meta`, `done` is `ok`, `attention` is `warn`, `failed` is `danger`, `idle` is `ink-meta`.

## Typography

Seven roles named by use, one scale at every width. A role carries its size, line box, weight, ink and family; a component draws copy only through a role.

| Role | Size / line | Weight | Ink | Use |
| --- | --- | --- | --- | --- |
| `display` | 34px / 40px | 700 | `ink` | one line on a screen with nothing else to read |
| `title` | 28px / 36px | 700 | `ink` | a place's large title, an item's title |
| `heading` | 18px / 24px | 600 | `ink` | a sheet's title, a heading inside an item |
| `body` | 16px / 24px | 400 | `ink` | prose, a row's title, an input's text |
| `meta` | 14px / 20px | 400 | `ink-meta` | a row's second lines, a description, an age |
| `label` | 13px / 16px | 500 | `ink-meta` | the header over a list or a group |
| `mono` | 14px / 20px | 400 | `ink` | code, a commit, a key, the diff |

`sans` is `ui-sans-serif, system-ui, sans-serif`; `mono` is `"JetBrains Mono Variable", "JetBrains Mono Variable Fallback", ui-monospace, SFMono-Regular, monospace` with its ligatures off. Each named family is followed by its metric fallback face.

## Layout

Rungs are multiples of `space` (4 px), named by what they separate:

| Rung | Value | Separates |
| --- | --- | --- |
| `pair` | 4px | a label from its value |
| `row` | 8px | atoms side by side |
| `stack` | 12px | fields of a form |
| `inset` | 16px | the screen's side inset, a group's interior |
| `section` | 24px | sections of a screen |
| `room` | 32px | the item header from its body |

Density moves four sizes, never a rung or a type size. Touch is every platform's set; the compact set draws where the primary pointer is fine under `density: desktop`.

| Size | Touch | Compact | Is |
| --- | --- | --- | --- |
| `floor` | 44px | 32px | the minimum height of a control, a row and a header |
| `row-y` | 12px | 4px | a row's vertical padding |
| `control-y` | 8px | 4px | a button's, a field's and a chip's vertical padding |
| `segment` | 36px | 24px | a segment inside its padded control |

Widths: `rail` 220px, `list` 360px, `column` 300px, `sheet` 560px, `reading` 720px. Breakpoints: `tablet` 768px, `desktop` 1024px, `wide` 1440px; they are the only responsive variants.

## Elevation & Depth

Groups, rows and cards are flat. Two shadows lift a layer: `shadow-float` (`0 7px 18px rgba(15, 26, 46, 0.13)`) and `shadow-sheet` (`0 12px 28px rgba(15, 26, 46, 0.16)`). `shadow-float` lifts a picker's list, a menu, a toast, the selected segment and a thumb; `shadow-sheet` lifts a sheet.

## Shapes

| Radius | Value | Rounds |
| --- | --- | --- |
| `group` | 14px | groups, inputs, code, pickers and menus |
| `sheet` | 24px | a sheet's corners |
| `full` | 9999px | buttons, chips, a search field, a count |

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

Durations are ratios of `motion` (200 ms), read as `duration-<rung>`; every one is 0 under `prefers-reduced-motion: reduce`.

| Duration | Value | Times |
| --- | --- | --- |
| `instant` | 100 ms | a color or opacity change under the pointer |
| `fast` | 150 ms | a control answering a press |
| `base` | 200 ms | a popover, a menu or a toast entering |
| `slow` | 300 ms | a sheet or a pane moving in |

| Curve | Value | Eases |
| --- | --- | --- |
| `out` | `cubic-bezier(0.33, 1, 0.68, 1)` | what enters or answers a touch |
| `in` | `cubic-bezier(0.32, 0, 0.67, 0)` | what leaves |
| `in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | what moves between two places |

## Do's and Don'ts

- Do pick the component that owns the shape before writing markup.
- Do set a knob to move a scale; don't set a token.
- Don't pass `class`, `className`, `classList` or `style` to a component; a look the matrices lack is a new matrix cell.
- Do use tokens only: no literal color, pixel size or arbitrary value.
- Do keep text at 4.5:1 or more on its fill; the contract measures every pair it draws.
- Do time motion with a duration rung and a contract curve; don't write a literal duration.
- Do take every word a component draws from `words`; a sentence is a prop.
