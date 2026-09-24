import { text } from "@fcalell/ui-core/variants";
import { createMemo, Show } from "solid-js";
import type { Closed } from "#lib/closed";
import { cn } from "#lib/cn";
import { LoadingRows } from "#lib/loading";
import { renderMarkdown } from "./markdown.ts";

// Rendered markdown at `body`, measured at the reading width; code fences
// draw as code blocks.
export type ProseProps = Closed & {
	markdown: string;
	loading?: boolean;
};

export function Prose(props: ProseProps) {
	const html = createMemo(() => renderMarkdown(props.markdown));
	return (
		<Show when={!props.loading} fallback={<LoadingRows />}>
			<div
				class={cn(
					text({ role: "body" }),
					"max-w-reading break-words",
					"[&>*+*]:mt-stack",
					"[&_h1]:text-heading [&_h1]:leading-heading [&_h1]:font-semibold [&_h1]:tracking-heading",
					"[&_h2]:text-heading [&_h2]:leading-heading [&_h2]:font-semibold [&_h2]:tracking-heading",
					"[&_h3]:font-semibold [&_h4]:font-semibold",
					"[&_strong]:font-semibold",
					"[&_a]:text-tint [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-ink",
					"[&_code]:rounded-group [&_code]:bg-group [&_code]:px-1 [&_code]:font-mono [&_code]:text-mono",
					"[&_pre]:rounded-group [&_pre]:bg-group [&_pre]:p-stack [&_pre]:overflow-x-auto [&_pre]:font-mono [&_pre]:text-mono [&_pre]:leading-mono [&_pre_code]:bg-transparent [&_pre_code]:p-0",
					"[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-inset [&_ol]:pl-inset [&_li+li]:mt-pair",
					"[&_blockquote]:border-l-2 [&_blockquote]:pl-stack [&_blockquote]:text-ink-meta",
					"[&_table]:w-full [&_th]:border-b [&_th]:px-row [&_th]:py-pair [&_th]:text-left [&_th]:font-medium [&_td]:border-b [&_td]:px-row [&_td]:py-pair",
					"[&_img]:max-w-full [&_img]:rounded-group",
				)}
				// safe: renderMarkdown escapes raw HTML and rejects unsafe URL schemes
				innerHTML={html()}
			/>
		</Show>
	);
}
