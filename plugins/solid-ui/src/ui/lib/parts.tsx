import type { Part } from "@fcalell/ui-core/descriptors";
import { For, type JSX, Show } from "solid-js";

// A quoted name in a `meta` part is cut at 40 characters; in a title it wraps
// to two lines instead, which the caller's line clamp does.
const META_CUT = 40;

function quotedText(text: string, cut: boolean): string {
	const inner =
		cut && text.length > META_CUT ? `${text.slice(0, META_CUT - 1)}…` : text;
	return `“${inner}”`;
}

// Parts joined by a middle dot; a `Quoted` part in typographic quotes, drawn
// in the slot's own role, so this renders no class of its own.
export function Parts(props: { parts: Part[]; cut?: boolean }): JSX.Element {
	return (
		<For each={props.parts}>
			{(part, index) => (
				<>
					<Show when={index() > 0}> · </Show>
					{typeof part === "string"
						? part
						: quotedText(part.quoted, props.cut ?? false)}
				</>
			)}
		</For>
	);
}

export function partsText(parts: Part[]): string {
	return parts
		.map((part) =>
			typeof part === "string" ? part : quotedText(part.quoted, true),
		)
		.join(" · ");
}
