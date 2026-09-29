import { cn } from "@fcalell/ui-core/cn";
import {
	GROUP,
	SEGMENTED_CONTROL,
	segment,
	text,
} from "@fcalell/ui-core/variants";
import { useLayoutEffect, useState } from "react";
import {
	DENSITIES,
	MODES,
	type ShowcaseDensity,
	type ShowcaseFrame,
	type ShowcaseMode,
	showcaseFrames,
} from "./cells.ts";
import { registry } from "./registry.ts";

export { showcaseCells } from "./cells.ts";
export { registry } from "./registry.ts";

interface View {
	mode: ShowcaseMode;
	density: ShowcaseDensity;
}

const FRAMES = showcaseFrames();

function pick<T extends string>(
	value: string | null,
	options: readonly T[],
	fallback: T,
): T {
	return options.find((option) => option === value) ?? fallback;
}

// The URL decides; without a `mode` the page keeps what the mode script set,
// and without a `density` it draws touch.
function readView(): View {
	const params = new URLSearchParams(window.location.search);
	const current = document.documentElement.classList.contains("dark")
		? "dark"
		: "light";
	return {
		mode: pick(params.get("mode"), MODES, current),
		density: pick(params.get("density"), DENSITIES, "touch"),
	};
}

// The `dark` class exactly as the mode script sets it, and the density pinned
// on the root. Nothing is stored: the URL holds the view.
function applyView(view: View): void {
	const root = document.documentElement;
	root.classList.toggle("dark", view.mode === "dark");
	root.dataset.density = view.density;
}

function writeView(view: View): void {
	const url = new URL(window.location.href);
	url.searchParams.set("mode", view.mode);
	url.searchParams.set("density", view.density);
	window.history.replaceState(window.history.state, "", url);
}

// Every roster component's frames: each cell in every state it has, light
// and dark side by side, each frame scoped to its own mode, at the URL's
// density. A frame draws its registered component, or its component's name
// and the cell's strings.
export function Showcase() {
	const [view, setView] = useState(readView);
	useLayoutEffect(() => applyView(view), [view]);

	const change = (next: View) => {
		writeView(next);
		setView(next);
	};
	const frames = FRAMES.filter((frame) => frame.density === view.density);
	const components = [...new Set(frames.map((frame) => frame.component))];

	return (
		<main className="flex flex-col gap-section p-inset min-h-screen">
			<header className="flex flex-row flex-wrap items-center gap-row">
				<h1 className={text({ role: "title" })}>Showcase</h1>
				<Toggle
					label="Mode"
					options={MODES}
					value={view.mode}
					onChange={(mode) => change({ ...view, mode })}
				/>
				<Toggle
					label="Density"
					options={DENSITIES}
					value={view.density}
					onChange={(density) => change({ ...view, density })}
				/>
				<p className={text({ role: "meta" })}>{frames.length} frames</p>
			</header>
			{components.map((component) => (
				<Component
					key={component}
					name={component}
					frames={frames.filter((frame) => frame.component === component)}
				/>
			))}
		</main>
	);
}

function Toggle<T extends string>(props: {
	label: string;
	options: readonly T[];
	value: T;
	onChange: (value: T) => void;
}) {
	return (
		<fieldset
			aria-label={props.label}
			className={cn("flex flex-row", SEGMENTED_CONTROL)}
		>
			{props.options.map((option) => (
				<button
					key={option}
					type="button"
					aria-pressed={option === props.value}
					className={cn(
						"flex items-center justify-center",
						segment({ state: option === props.value ? "selected" : "idle" }),
					)}
					onClick={() => props.onChange(option)}
				>
					{option}
				</button>
			))}
		</fieldset>
	);
}

function Component(props: { name: string; frames: ShowcaseFrame[] }) {
	const rows = [
		...new Set(
			props.frames.map((frame) => `${frame.cell.name}/${frame.state}`),
		),
	];
	return (
		<section className="flex flex-col gap-stack">
			<h2 className={text({ role: "heading" })}>{props.name}</h2>
			<div className="flex flex-row flex-wrap gap-row">
				{rows.map((row) => (
					<div key={row} className="flex flex-row flex-wrap gap-pair">
						{props.frames
							.filter((frame) => `${frame.cell.name}/${frame.state}` === row)
							.map((frame) => (
								<Frame key={frame.id} frame={frame} />
							))}
					</div>
				))}
			</div>
		</section>
	);
}

function Frame(props: { frame: ShowcaseFrame }) {
	const { frame } = props;
	const Drawn = registry[frame.component];
	const strings = frame.cell.classes.join(" ");
	return (
		<div
			data-cell={frame.id}
			className={cn(frame.mode, GROUP, "flex flex-col gap-pair p-stack")}
		>
			<p className={text({ role: "label" })}>
				{frame.cell.name} · {frame.state} · {frame.mode}
			</p>
			{Drawn ? (
				<Drawn frame={frame} />
			) : (
				<>
					<p className={text({ role: "body" })}>{frame.component}</p>
					<p className={text({ role: "mono" })}>{strings}</p>
				</>
			)}
		</div>
	);
}
