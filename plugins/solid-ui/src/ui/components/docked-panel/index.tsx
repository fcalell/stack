import type { Accessor, ComponentProps, JSX } from "solid-js";
import { createSignal, mergeProps, onMount, splitProps } from "solid-js";
import { cn } from "#lib/cn";

// ─── Root ───

type DockedPanelProps = Omit<ComponentProps<"aside">, "style"> & {
	side?: "left" | "right";
	width?: number;
	defaultWidth?: number;
	minWidth?: number;
	maxWidth?: number;
	onWidthChange?: (width: number) => void;
	style?: JSX.CSSProperties;
};

function Root(rawProps: DockedPanelProps) {
	const props = mergeProps(
		{ side: "right" as const, defaultWidth: 320, minWidth: 240, maxWidth: 720 },
		rawProps,
	);
	const [local, others] = splitProps(props, [
		"side",
		"width",
		"defaultWidth",
		"minWidth",
		"maxWidth",
		"onWidthChange",
		"class",
		"style",
		"children",
	]);

	const [internalWidth, setInternalWidth] = createSignal(local.defaultWidth);
	const width = () => local.width ?? internalWidth();
	const setWidth = (value: number) => {
		const next = Math.min(local.maxWidth, Math.max(local.minWidth, value));
		if (local.onWidthChange) {
			return local.onWidthChange(next);
		}
		setInternalWidth(next);
	};

	const onHandlePointerDown = (event: PointerEvent) => {
		if (event.button !== 0) return;
		event.preventDefault();
		const handle = event.currentTarget as HTMLElement;
		handle.setPointerCapture(event.pointerId);
		const startX = event.clientX;
		const startWidth = width();
		const onMove = (move: PointerEvent) => {
			const delta = move.clientX - startX;
			setWidth(startWidth + (local.side === "right" ? -delta : delta));
		};
		const onUp = () => {
			handle.removeEventListener("pointermove", onMove);
			handle.removeEventListener("pointerup", onUp);
			handle.removeEventListener("pointercancel", onUp);
		};
		handle.addEventListener("pointermove", onMove);
		handle.addEventListener("pointerup", onUp);
		handle.addEventListener("pointercancel", onUp);
	};

	const onHandleKeyDown = (event: KeyboardEvent) => {
		const step = event.shiftKey ? 40 : 8;
		const grow = local.side === "right" ? "ArrowLeft" : "ArrowRight";
		if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
		event.preventDefault();
		setWidth(width() + (event.key === grow ? step : -step));
	};

	return (
		<aside
			data-side={local.side}
			style={{ width: `${width()}px`, ...local.style }}
			class={cn(
				"relative flex h-full shrink-0 flex-col bg-canvas",
				local.side === "right" ? "border-l" : "border-r",
				local.class,
			)}
			{...others}
		>
			{local.children}
			{/* ARIA window-splitter pattern: a focusable separator; <hr> cannot take focus or pointer resize */}
			{/* biome-ignore lint/a11y/useSemanticElements: see above */}
			<div
				role="separator"
				aria-orientation="vertical"
				aria-label="Resize panel"
				aria-valuenow={width()}
				aria-valuemin={local.minWidth}
				aria-valuemax={local.maxWidth}
				tabIndex={0}
				onPointerDown={onHandlePointerDown}
				onKeyDown={onHandleKeyDown}
				class={cn(
					"absolute inset-y-0 z-10 w-2 cursor-col-resize touch-none select-none outline-none",
					"after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:transition-[background-color] after:duration-base after:ease-ui hover:after:bg-edge-2 focus-visible:after:bg-interactive",
					local.side === "right" ? "-left-1" : "-right-1",
				)}
			/>
		</aside>
	);
}

// ─── Chrome / Content ───

// One row for the panel's controls (close, expand, title) so consumer
// chrome never collides with built-in chrome.
function Chrome(props: ComponentProps<"div">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<div
			class={cn(
				"flex h-12 shrink-0 items-center gap-1 border-b px-3",
				local.class,
			)}
			{...rest}
		/>
	);
}

function Content(props: ComponentProps<"div">) {
	const [local, rest] = splitProps(props, ["class"]);
	return (
		<div class={cn("min-h-0 flex-1 overflow-y-auto", local.class)} {...rest} />
	);
}

// ─── createPanelWidth ───

type CreatePanelWidthOptions = {
	key: string;
	defaultWidth: number;
};

// localStorage-backed width for a controlled DockedPanel:
// `<DockedPanel width={width()} onWidthChange={setWidth}>`. Reads in
// onMount so server renders stay deterministic.
function createPanelWidth(
	options: CreatePanelWidthOptions,
): [Accessor<number>, (width: number) => void] {
	const [width, setWidth] = createSignal(options.defaultWidth);

	onMount(() => {
		const stored = Number(localStorage.getItem(options.key));
		if (Number.isFinite(stored) && stored > 0) setWidth(stored);
	});

	return [
		width,
		(next: number) => {
			setWidth(next);
			localStorage.setItem(options.key, String(next));
		},
	];
}

// ─── Exports ───

export const DockedPanel = Object.assign(Root, {
	Chrome,
	Content,
});

export type { CreatePanelWidthOptions, DockedPanelProps };
export { createPanelWidth };
