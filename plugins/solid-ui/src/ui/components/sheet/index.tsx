import { SCRIM, SHEET, text } from "@fcalell/ui-core/variants";
import * as DialogPrimitive from "@kobalte/core/dialog";
import { ChevronLeft, X } from "lucide-solid";
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import { BarContext } from "#lib/bar.ts";
import { Circle } from "#lib/circle.tsx";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { FitContext } from "#lib/fit.ts";
import { useWords } from "#lib/words.tsx";

export interface SheetSubmit {
	label: string;
	onAct: () => void;
	blocked?: string;
}

// A sheet: a close circle left (a back circle with `back`), the title, and
// `submit` top right where a keyboard would cover a bar; a decision sheet
// puts an `ActionBar` in its children instead, and the two exclude each
// other. Content-tall from the bottom on the phone; centered at the sheet
// width from tablet.
export type SheetProps = Closed & {
	open: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	back?: () => void;
	submit?: SheetSubmit;
	foot?: JSX.Element;
	children?: JSX.Element;
};

export function Sheet(props: SheetProps) {
	const words = useWords();
	return (
		<DialogPrimitive.Root
			open={props.open}
			onOpenChange={(open) => {
				if (!open) props.onClose();
			}}
		>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay
					class={cn(
						SCRIM,
						"fixed inset-0 z-50 data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0",
					)}
				/>
				<div class="fixed inset-0 z-50 flex items-end justify-center tablet:items-center tablet:p-section">
					<DialogPrimitive.Content
						class={cn(
							SHEET,
							"flex max-h-[90dvh] w-full flex-col overflow-hidden outline-none tablet:max-w-sheet tablet:shadow-sheet",
							"tablet:rounded-sheet",
						)}
					>
						<BarContext.Provider value="flow">
							<FitContext.Provider value="bar">
								<header class="flex min-h-14 items-center gap-row px-inset">
									<Show
										when={props.back}
										fallback={
											<Circle
												glyph={X}
												label={words.close}
												onAct={props.onClose}
											/>
										}
									>
										{(back) => (
											<Circle
												glyph={ChevronLeft}
												label={words.back}
												onAct={back()}
											/>
										)}
									</Show>
									<DialogPrimitive.Title
										class={cn(
											text({ role: "heading" }),
											"min-w-0 flex-1 truncate",
										)}
									>
										{props.title}
									</DialogPrimitive.Title>
									<Show when={props.submit}>
										{(submit) => (
											<button
												type="button"
												disabled={submit().blocked !== undefined}
												onClick={() => submit().onAct()}
												class={cn(
													text({ role: "body" }),
													"min-h-11 shrink-0 cursor-pointer px-row font-medium text-tint disabled:text-ink-faint",
												)}
											>
												{submit().label}
											</button>
										)}
									</Show>
								</header>
							</FitContext.Provider>
							<Show when={props.submit?.blocked}>
								<p class={cn(text({ role: "meta" }), "px-inset text-right")}>
									{props.submit?.blocked}
								</p>
							</Show>
							<Show when={props.description}>
								<DialogPrimitive.Description
									class={cn(text({ role: "meta" }), "px-inset pb-stack")}
								>
									{props.description}
								</DialogPrimitive.Description>
							</Show>
							<div class="flex min-h-0 flex-1 flex-col gap-stack overflow-y-auto px-inset pb-[max(env(safe-area-inset-bottom),var(--spacing-inset))] *:shrink-0">
								{props.children}
							</div>
							<Show when={props.foot}>
								<div class="px-inset pb-[max(env(safe-area-inset-bottom),var(--spacing-inset))]">
									{props.foot}
								</div>
							</Show>
						</BarContext.Provider>
					</DialogPrimitive.Content>
				</div>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
