import { type MessageAuthor, message, text } from "@fcalell/ui-core/variants";
import { Show } from "solid-js";
import { ageOf, momentOf, useClock } from "#lib/age.ts";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { LoadingRows } from "#lib/loading.tsx";
import { Prose } from "../prose/index.tsx";

// One message of a thread: `you` in a soft bubble right, `other` as prose on
// the surface with the name above when given, `system` as one centered meta
// line. The body streams.
export type MessageProps = Closed & {
	author: MessageAuthor;
	name?: string;
	body: string;
	// An ISO moment, drawn as its age.
	at?: string;
	loading?: boolean;
};

export function Message(props: MessageProps) {
	const clock = useClock();
	return (
		<Show when={!props.loading} fallback={<LoadingRows />}>
			<article
				class={cn(
					"flex flex-col gap-pair",
					props.author === "you" && "items-end",
					props.author === "system" && "items-center",
				)}
			>
				<Show when={props.author === "other" && props.name}>
					<p class={text({ role: "label" })}>{props.name}</p>
				</Show>
				<div
					class={cn(
						message({ author: props.author }),
						props.author === "you" && "max-w-[85%]",
						props.author === "system" && "text-center",
					)}
				>
					<Show
						when={props.author === "other"}
						fallback={<span>{props.body}</span>}
					>
						<Prose markdown={props.body} />
					</Show>
				</div>
				<Show when={props.at}>
					{(at) => (
						<time
							datetime={at()}
							title={momentOf(at())}
							class={cn(text({ role: "meta" }), "tabular-nums")}
						>
							{ageOf(at(), clock())}
						</time>
					)}
				</Show>
			</article>
		</Show>
	);
}
