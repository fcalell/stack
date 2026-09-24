import { row, text } from "@fcalell/ui-core/variants";
import { CircleCheck, Circle as Ring } from "lucide-react-native";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Glyph } from "../../lib/glyph";
import { LoadingRows } from "../../lib/loading";
import { navigate } from "../../lib/navigate";

export interface FileRowProps extends Closed {
	path: string;
	added: number;
	removed: number;
	seen?: boolean;
	href?: string;
	onOpen?: () => void;
	loading?: boolean;
}

// A row for a Group: a ring that becomes a tick when seen, the path in mono,
// the counts trailing.
export function FileRow({
	path,
	added,
	removed,
	seen,
	href,
	onOpen,
	loading,
}: FileRowProps) {
	if (loading) return <LoadingRows />;
	const open = href !== undefined ? () => navigate(href) : onOpen;
	return (
		<Pressable
			accessibilityRole={open ? "button" : undefined}
			accessibilityState={{ checked: seen }}
			disabled={!open}
			onPress={open}
			className={cn(
				row({ state: "rest" }),
				"flex-row items-center",
				open && "active:bg-edge",
			)}
		>
			<Glyph icon={seen ? CircleCheck : Ring} tone={seen ? "ok" : "edge"} />
			<RNText
				numberOfLines={1}
				className={cn(text({ role: "mono" }), "min-w-0 flex-1")}
			>
				{path}
			</RNText>
			<View className="flex-row gap-row">
				<RNText className={cn(text({ role: "meta" }), "text-ok")}>
					+{added}
				</RNText>
				<RNText className={cn(text({ role: "meta" }), "text-danger")}>
					−{removed}
				</RNText>
			</View>
		</Pressable>
	);
}
