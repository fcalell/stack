import type { FormGroup, FormProps } from "../src/ui/components/form/index.tsx";
import type { PaneProps } from "../src/ui/components/pane/index.tsx";
import type { SectionProps } from "../src/ui/components/section/index.tsx";
import type { SheetProps } from "../src/ui/components/sheet/index.tsx";

// A frame says no sentence of its own: every failed read draws the generic
// one with Retry, so none of them takes a `failed` prop.
type Without<T> = "failed" extends keyof T ? never : true;
export const frames: [
	Without<PaneProps>,
	Without<SectionProps>,
	Without<SheetProps>,
	Without<FormProps>,
	Without<FormGroup>,
] = [true, true, true, true, true];
