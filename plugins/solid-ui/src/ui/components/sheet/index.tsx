import { SCRIM, SHEET, text } from "@fcalell/ui-core/variants";
import * as DialogPrimitive from "@kobalte/core/dialog";
import { ChevronLeft, X } from "lucide-solid";
import type { JSX } from "solid-js";
import { createEffect, createSignal, createUniqueId, on, Show } from "solid-js";
import { BarContext } from "#lib/bar.ts";
import { Circle } from "#lib/circle.tsx";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { FieldContext, SheetTitleContext } from "#lib/field.ts";
import { FitContext } from "#lib/fit.ts";
import { focusIsFree } from "#lib/focus.ts";
import { RING_INSET, TEXT_ACT } from "#lib/interact.ts";
import { Inline } from "#lib/parts.tsx";
import { reachable } from "#lib/reach.ts";
import { TouchedContext } from "#lib/touched.ts";
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
// width from tablet. It opens with focus on its first field, else on its
// close circle, and gives focus back to what held it when it opened; a
// control removed while it holds focus leaves focus on the sheet, so Escape
// still closes it. The title wraps to two lines, and it names a typing
// control inside that no `FormField` labels. A blocked submit says its
// reason once tapped or once a field on the page has taken input, and a new
// `title` or `description` is a new page.
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

const FIELD = "input:not([type=hidden]), textarea";

export function Sheet(props: SheetProps) {
	const words = useWords();
	const reason = createUniqueId();
	const titleId = createUniqueId();
	let content: HTMLElement | undefined;
	const [touched, setTouched] = createSignal(false);
	const [tapped, setTapped] = createSignal(false);
	const blocked = () => props.submit?.blocked !== undefined;
	const said = () => blocked() && (tapped() || touched());
	// What held focus when the sheet opened, given it back on close.
	let opener: HTMLElement | undefined;
	createEffect(() => {
		if (props.open) {
			const active = document.activeElement;
			opener =
				active instanceof HTMLElement && active !== document.body
					? active
					: undefined;
			return;
		}
		setTouched(false);
		setTapped(false);
	});
	createEffect(() => {
		if (!blocked()) setTapped(false);
	});
	// A wizard swaps its page in place: the new page has taken no input.
	createEffect(
		on(
			[() => props.title, () => props.description],
			() => {
				setTouched(false);
				setTapped(false);
			},
			{ defer: true },
		),
	);
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
						onInput={() => setTouched(true)}
						// Kobalte's trap hands focus back to the control that held it,
						// which a removed control cannot take: focus falls to the body,
						// where no keydown reaches its Escape listener. Once the
						// removal settles, the sheet takes focus itself.
						onFocusOut={() =>
							queueMicrotask(() => {
								if (props.open && focusIsFree(document.activeElement))
									content?.focus();
							})
						}
						ref={content}
						onCloseAutoFocus={(event) => {
							if (!opener?.isConnected) return;
							event.preventDefault();
							opener.focus();
						}}
						onOpenAutoFocus={(event) => {
							const field = content?.querySelector<HTMLElement>(FIELD);
							if (!field) return;
							event.preventDefault();
							field.focus();
						}}
						class={cn(
							SHEET,
							"flex max-h-[90dvh] w-full flex-col overflow-hidden outline-none tablet:max-w-sheet tablet:shadow-sheet",
							"tablet:rounded-sheet",
						)}
					>
						{/* A sheet opened from inside a `FormField` (a picker's search)
						    is never that field: its own fields take no outer id. */}
						<FieldContext.Provider value={undefined}>
							<SheetTitleContext.Provider value={titleId}>
								<BarContext.Provider value="flow">
									<TouchedContext.Provider value={touched}>
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
													id={titleId}
													class={cn(
														text({ role: "heading" }),
														"line-clamp-2 min-w-0 flex-1",
													)}
												>
													<Inline text={props.title} />
												</DialogPrimitive.Title>
												<Show when={props.submit}>
													{(submit) => (
														<button
															type="button"
															aria-disabled={blocked() || undefined}
															aria-describedby={said() ? reason : undefined}
															onClick={() => {
																if (blocked()) setTapped(true);
																else submit().onAct();
															}}
															class={cn(
																text({ role: "body" }),
																"min-h-floor shrink-0 px-row",
																TEXT_ACT,
															)}
														>
															{submit().label}
														</button>
													)}
												</Show>
											</header>
										</FitContext.Provider>
										<Show when={said()}>
											<p
												id={reason}
												class={cn(
													text({ role: "meta" }),
													"px-inset text-right",
												)}
											>
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
										<div
											ref={reachable}
											class={cn(
												"flex min-h-0 flex-1 flex-col gap-stack overflow-y-auto px-inset pb-[max(env(safe-area-inset-bottom),var(--spacing-inset))] *:shrink-0",
												RING_INSET,
											)}
										>
											{props.children}
										</div>
										<Show when={props.foot}>
											<div class="px-inset pb-[max(env(safe-area-inset-bottom),var(--spacing-inset))]">
												{props.foot}
											</div>
										</Show>
									</TouchedContext.Provider>
								</BarContext.Provider>
							</SheetTitleContext.Provider>
						</FieldContext.Provider>
					</DialogPrimitive.Content>
				</div>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
