import type { ComponentProps } from "solid-js";
import { createMemo, splitProps } from "solid-js";
import { cn } from "#lib/cn";
import { renderMarkdown } from "./markdown";

type ProseProps = Omit<ComponentProps<"div">, "children"> & {
	markdown: string;
};

function Prose(props: ProseProps) {
	const [local, rest] = splitProps(props, ["markdown", "class"]);
	const html = createMemo(() => renderMarkdown(local.markdown));

	return (
		<div
			class={cn(
				"text-sm leading-relaxed break-words text-foreground",
				"[&>*+*]:mt-3",
				"[&_h1]:text-xl [&_h1]:font-semibold [&_h1]:tracking-tight",
				"[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight",
				"[&_h3]:text-base [&_h3]:font-semibold",
				"[&_h4]:text-sm [&_h4]:font-semibold",
				"[&_strong]:font-semibold",
				"[&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-muted-foreground",
				"[&_code]:bg-muted [&_code]:rounded-sm [&_code]:px-[0.3em] [&_code]:py-[0.15em] [&_code]:font-mono [&_code]:text-[0.9em]",
				"[&_pre]:bg-muted [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
				"[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li+li]:mt-1",
				"[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
				"[&_hr]:border-border",
				"[&_table]:w-full [&_th]:border-b [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-medium [&_td]:border-b [&_td]:border-border [&_td]:px-2 [&_td]:py-1",
				"[&_img]:max-w-full [&_img]:rounded-md",
				local.class,
			)}
			// safe: renderMarkdown escapes raw HTML and rejects unsafe URL schemes
			innerHTML={html()}
			{...rest}
		/>
	);
}

export type { ProseProps };
export { Prose };
