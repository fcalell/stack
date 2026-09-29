import { cn } from "@fcalell/ui-core/cn";
import { SEGMENTED_CONTROL, segment, text } from "@fcalell/ui-core/variants";
import { useLayoutEffect, useState } from "react";
import {
	DENSITIES,
	MODES,
	type ShowcaseDensity,
	type ShowcaseMode,
} from "./cells.ts";

export interface View {
	mode: ShowcaseMode;
	density: ShowcaseDensity;
}

function pick<T extends string>(
	value: string | null,
	options: readonly T[],
	fallback: T,
): T {
	return options.find((option) => option === value) ?? fallback;
}

// The URL decides; without a `mode` the page keeps what the mode script set,
// and without a `density` it draws the desktop set.
function readView(): View {
	const params = new URLSearchParams(window.location.search);
	const current = document.documentElement.classList.contains("dark")
		? "dark"
		: "light";
	return {
		mode: pick(params.get("mode"), MODES, current),
		density: pick(params.get("density"), DENSITIES, "desktop"),
	};
}

// The `dark` class exactly as the mode script sets it, and the density pinned
// on the root. Nothing is stored: the URL holds the view.
function applyView(view: View): void {
	const root = document.documentElement;
	root.classList.toggle("dark", view.mode === "dark");
	root.dataset.density = view.density;
}

function search(view: View): string {
	return `?${new URLSearchParams({ mode: view.mode, density: view.density })}`;
}

function writeView(view: View): void {
	const url = new URL(window.location.href);
	url.search = search(view);
	window.history.replaceState(window.history.state, "", url);
}

// The page's view, read from the URL, applied to the root before paint and
// written back on every change.
export function useView(): [View, (next: View) => void] {
	const [view, setView] = useState(readView);
	useLayoutEffect(() => applyView(view), [view]);
	const change = (next: View) => {
		writeView(next);
		setView(next);
	};
	return [view, change];
}

// A header's mode and density toggles, and the link to the sibling page at
// the same view.
export function ViewBar(props: {
	view: View;
	onChange: (next: View) => void;
	to: { path: string; label: string };
}) {
	const { view, onChange } = props;
	return (
		<>
			<Toggle
				label="Mode"
				options={MODES}
				value={view.mode}
				onChange={(mode) => onChange({ ...view, mode })}
			/>
			<Toggle
				label="Density"
				options={DENSITIES}
				value={view.density}
				onChange={(density) => onChange({ ...view, density })}
			/>
			<a
				href={`${props.to.path}${search(view)}`}
				className={cn(text({ role: "body" }), "text-accent-ink")}
			>
				{props.to.label}
			</a>
		</>
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
