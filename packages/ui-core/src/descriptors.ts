// Framework-free descriptors: a composed region is data, so the owning
// molecule renders it. `TIcon` is a type parameter because the icon is a
// `lucide-solid` component on web and a `lucide-react-native` one on native,
// and ui-core depends on neither.
import type { StatusState, Words } from "./tokens.ts";

export type { StatusState, Words };

// A labelled text act, 44 px, with an optional `blocked` reason drawn under it.
export interface Act {
	label: string;
	onAct: () => void;
	blocked?: string;
	loading?: boolean;
}

// An icon-only act: the label is read aloud, never drawn.
export interface IconAct<TIcon = never> {
	icon: TIcon;
	label: string;
	onAct: () => void;
}

// A model-written name: typographic quotes around it, drawn in the slot's own
// role; cut at 40 characters in a `meta` part, wrapped to two lines in a title.
export interface Quoted {
	quoted: string;
}

export type Part = string | Quoted;

// A mark on a row: an icon from the consumer's set, its label read aloud.
export interface Mark<TIcon = never> {
	icon: TIcon;
	label: string;
}

export interface Option {
	value: string;
	label: string;
	description?: string;
	recommended?: boolean;
}

// A place in the shell: a route, a label, an icon, an optional count.
export interface PlaceSpec<TIcon = never> {
	route: string;
	label: string;
	icon: TIcon;
	count?: number;
}

// One line of a diff hunk; `before` and `after` are line numbers.
export interface DiffLine {
	kind: "context" | "added" | "removed";
	text: string;
	before?: number;
	after?: number;
}

export interface Hunk {
	header: string;
	lines: DiffLine[];
}

export interface ComparisonCell {
	label: string;
	value: string;
}

export interface ComparisonRow {
	label: string;
	cells: ComparisonCell[];
	chips?: Array<{ label: string }>;
}

// One bar: a label, its total, the parts it stacks by one dimension, the time
// under it.
export interface BarSeries {
	label: string;
	value: number;
	parts?: Array<{ label: string; value: number }>;
	at?: string;
}

export interface Attachment {
	id: string;
	name: string;
}

// A sentence and an act under a message input.
export interface Notice {
	sentence: string;
	act?: Act;
}
