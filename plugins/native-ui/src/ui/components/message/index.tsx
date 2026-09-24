import type { MessageAuthor } from "@fcalell/ui-core/variants";
import { message, text } from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { LoadingRows } from "../../lib/loading";
import { Prose } from "../prose";

export interface MessageProps extends Closed {
	author: MessageAuthor;
	name?: string;
	body: string;
	at?: string;
	loading?: boolean;
}

// `you` in a soft bubble right, `other` as prose on the surface with the name
// above, `system` as one centered meta line. The body streams.
export function Message({ author, name, body, at, loading }: MessageProps) {
	if (loading) return <LoadingRows />;
	if (author === "system") {
		return (
			<RNText className={cn(message({ author }), "text-center")}>{body}</RNText>
		);
	}
	return (
		<View
			className={cn(
				"gap-pair",
				author === "you" ? "items-end" : "items-stretch",
			)}
		>
			{author === "other" && name ? (
				<RNText className={text({ role: "label" })}>{name}</RNText>
			) : null}
			<View
				className={cn(message({ author }), author === "you" && "max-w-full")}
			>
				{author === "you" ? (
					<RNText className={text({ role: "body" })}>{body}</RNText>
				) : (
					<Prose markdown={body} />
				)}
			</View>
			{at ? <RNText className={text({ role: "meta" })}>{at}</RNText> : null}
		</View>
	);
}
