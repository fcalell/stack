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

// Text with its backtick spans drawn as inline code, as `Prose` draws them:
// mono on the group fill, never broken inside, so `--strict` never splits
// after its dashes.
const CODE_SPAN = /`([^`]+)`/;

export function Inline(props: { text: string }): JSX.Element {
	return (
		<For each={props.text.split(CODE_SPAN)}>
			{(piece, index) =>
				index() % 2 === 1 ? (
					<code class="whitespace-nowrap rounded-group bg-group px-1 font-mono text-mono">
						{piece}
					</code>
				) : (
					piece
				)
			}
		</For>
	);
}

// Parts joined by a middle dot; a `Quoted` part in typographic quotes, drawn
// in the slot's own role; a text part's backtick spans as inline code.
export function Parts(props: { parts: Part[]; cut?: boolean }): JSX.Element {
	return (
		<For each={props.parts}>
			{(part, index) => (
				<>
					<Show when={index() > 0}> · </Show>
					{typeof part === "string" ? (
						<Inline text={part} />
					) : (
						quotedText(part.quoted, props.cut ?? false)
					)}
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
