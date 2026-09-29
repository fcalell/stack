import type { Act, StatusState } from "@fcalell/ui-core/descriptors";
import { row, text, textStrong } from "@fcalell/ui-core/variants";
import * as Clipboard from "expo-clipboard";
import { Check, Copy } from "lucide-react-native";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { Circle } from "../../lib/circle";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { navigate } from "../../lib/navigate";
import { RowContext } from "../../lib/row";
import { useWords } from "../../lib/words";
import { RowAct } from "../list-row";
import { Status } from "../status";

export type DefinitionValue =
	| string
	| { status: StatusState; label?: string }
	| ReactNode;

export interface DefinitionRowProps extends Closed {
	label: string;
	description?: string;
	value?: DefinitionValue;
	copyable?: boolean;
	act?: Act;
	href?: string;
	onOpen?: () => void;
}

const COPIED_MS = 2000;

function isStatus(
	value: DefinitionValue,
): value is { status: StatusState; label?: string } {
	return typeof value === "object" && value !== null && "status" in value;
}

// A labelled fact: the label left, the value or the in-place control right,
// and the description under both at the row's width. A control whose width
// is its words (a `Picker`) claims the row (`lib/row.ts`), and the row then
// stacks, as the web's does under tablet: the label and the description,
// then the control across the row with the act at its end.
export function DefinitionRow({
	label,
	description,
	value,
	copyable,
	act,
	href,
	onOpen,
}: DefinitionRowProps) {
	const [stacked, setStacked] = useState(false);
	const claim = useCallback((next: boolean) => setStacked(next), []);
	const open = href !== undefined ? () => navigate(href) : onOpen;
	const shown = (
		<RowContext.Provider value={claim}>
			{typeof value === "string" ? (
				<RNText className={cn(text({ role: "meta" }), "shrink text-right")}>
					{value}
				</RNText>
			) : isStatus(value) ? (
				<Status state={value.status} label={value.label} />
			) : (
				value
			)}
		</RowContext.Provider>
	);
	const acts = (
		<>
			{copyable && typeof value === "string" ? <CopyAct value={value} /> : null}
			{act ? <RowAct act={act} /> : null}
		</>
	);
	return (
		<Pressable
			accessibilityRole={open ? "button" : undefined}
			disabled={!open}
			onPress={open}
			className={cn(
				row({ state: "rest" }),
				"justify-center gap-pair",
				open && "active:bg-wash-press",
			)}
		>
			<View className="flex-row items-center gap-pair">
				<RNText
					className={cn(
						text({ role: "body" }),
						textStrong({ role: "body" }),
						"flex-1",
					)}
				>
					{label}
				</RNText>
				{stacked ? null : shown}
				{stacked ? null : acts}
			</View>
			{description ? (
				<RNText className={text({ role: "meta" })}>{description}</RNText>
			) : null}
			{stacked ? (
				<View className="flex-row items-center gap-pair">
					<View className="min-w-0 flex-1">{shown}</View>
					{acts}
				</View>
			) : null}
		</Pressable>
	);
}

function CopyAct({ value }: { value: string }) {
	const words = useWords();
	const [copied, setCopied] = useState(false);
	useEffect(() => {
		if (!copied) return;
		const timer = setTimeout(() => setCopied(false), COPIED_MS);
		return () => clearTimeout(timer);
	}, [copied]);
	return (
		<Circle
			icon={copied ? Check : Copy}
			label={copied ? words.copied : words.copy}
			onAct={() => {
				Clipboard.setStringAsync(value).then(() => setCopied(true));
			}}
		/>
	);
}
