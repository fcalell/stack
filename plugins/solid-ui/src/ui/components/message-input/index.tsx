import type { Attachment, Notice } from "@fcalell/ui-core/descriptors";
import { COUNT, field, text } from "@fcalell/ui-core/variants";
import { ArrowUp, Plus, Square } from "lucide-solid";
import { For, Show } from "solid-js";
import { Circle } from "#lib/circle";
import type { Closed } from "#lib/closed";
import { cn } from "#lib/cn";
import { useWords } from "#lib/words";

// A plus for files, the text in a pill, one circle that sends or stops; the
// notice under it. Dictation is the keyboard's.
export type MessageInputProps = Closed & {
	value: string;
	onChange: (value: string) => void;
	attachments?: Attachment[];
	onAttach?: () => void;
	placeholder?: string;
	notice?: Notice;
	working?: boolean;
	onSend: () => void;
	onStop?: () => void;
};

export function MessageInput(props: MessageInputProps) {
	const words = useWords();
	const empty = () => props.value.trim().length === 0;
	return (
		<div class="flex flex-col gap-row">
			<Show when={props.attachments?.length}>
				<div class="flex flex-wrap gap-pair">
					<For each={props.attachments}>
						{(attachment) => (
							<span class={cn(COUNT, "inline-flex items-center")}>
								{attachment.name}
							</span>
						)}
					</For>
				</div>
			</Show>
			<div class="flex items-end gap-row">
				<Show when={props.onAttach}>
					{(onAttach) => (
						<Circle glyph={Plus} label={words.attach} onAct={onAttach()} />
					)}
				</Show>
				<div
					class={cn(
						field({ kind: "search", state: "default" }),
						"flex min-w-0 flex-1 items-center focus-within:border-tint",
					)}
				>
					<textarea
						rows={1}
						value={props.value}
						placeholder={props.placeholder}
						onInput={(event) => {
							props.onChange(event.currentTarget.value);
							event.currentTarget.style.height = "auto";
							event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
						}}
						onKeyDown={(event) => {
							if (
								event.key === "Enter" &&
								!event.shiftKey &&
								!empty() &&
								!props.working
							) {
								event.preventDefault();
								props.onSend();
							}
						}}
						class="max-h-40 min-w-0 flex-1 resize-none bg-transparent py-2 outline-none placeholder:text-ink-faint"
					/>
				</div>
				<Show
					when={props.working}
					fallback={
						<Circle
							glyph={ArrowUp}
							label={words.send}
							onAct={props.onSend}
							disabled={empty()}
						/>
					}
				>
					<Circle glyph={Square} label={words.stop} onAct={props.onStop} />
				</Show>
			</div>
			<Show when={props.notice}>
				{(notice) => (
					<div
						class={cn(
							text({ role: "meta" }),
							"flex items-center justify-between gap-row px-inset",
						)}
					>
						<span class="min-w-0 flex-1">{notice().sentence}</span>
						<Show when={notice().act}>
							{(act) => (
								<button
									type="button"
									disabled={act().blocked !== undefined}
									onClick={() => act().onAct()}
									class="shrink-0 cursor-pointer font-medium text-tint disabled:text-ink-faint"
								>
									{act().label}
								</button>
							)}
						</Show>
					</div>
				)}
			</Show>
		</div>
	);
}
