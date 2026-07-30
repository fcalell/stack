// Framework-free descriptors: a composed region is data, so the owning
// primitive renders it. `TIcon` is a type parameter because the icon is a
// `lucide-solid` component on web and a `lucide-react-native` one on native,
// and ui-core depends on neither.
import type { BADGE } from "#variants";

export interface Action<TIcon = never> {
	label: string;
	onSelect: () => void;
	disabled?: boolean;
	loading?: boolean;
	icon?: TIcon;
}

export interface BadgeSpec {
	tone?: keyof (typeof BADGE)["variants"]["tone"];
	label: string;
}

export interface FooterAction<TIcon = never> {
	label: string;
	onSelect: () => void;
	loading?: boolean;
	disabled?: boolean;
	icon?: TIcon;
	iconPosition?: "leading" | "trailing";
	testID?: string;
}

export interface FooterDestructive<TIcon = never> {
	label: string;
	icon?: TIcon;
	tone?: "danger" | "neutral";
	confirmTitle: string;
	confirmBody: string;
	confirmLabel?: string;
	loading?: boolean;
	disabled?: boolean;
	// Receives the `option` toggle's value, `false` when there is no option.
	onConfirm: (optionChecked: boolean) => void;
	option?: { label: string; hint?: string };
}

interface FooterFields<TIcon> {
	primary?: FooterAction<TIcon>;
	secondary?: Action<TIcon>;
	tertiary?: Action<TIcon>;
	destructive?: FooterDestructive<TIcon>;
}

// At least one field must be set, which the union spells out rather than
// leaving every field optional.
export type FooterSpec<TIcon = never> =
	| (FooterFields<TIcon> & { primary: FooterAction<TIcon> })
	| (FooterFields<TIcon> & { secondary: Action<TIcon> })
	| (FooterFields<TIcon> & { tertiary: Action<TIcon> })
	| (FooterFields<TIcon> & { destructive: FooterDestructive<TIcon> });
