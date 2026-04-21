import { createSignal, onMount } from "solid-js";

type Theme = "light" | "dark";

const [theme, setTheme] = createSignal<Theme>("light");

function applyTheme(next: Theme): void {
	document.documentElement.classList.toggle("dark", next === "dark");
	localStorage.setItem("theme", next);
}

function resolveInitialTheme(): Theme {
	const stored = localStorage.getItem("theme") as Theme | null;
	if (stored === "light" || stored === "dark") return stored;
	return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme(): [() => Theme, (next: Theme) => void] {
	onMount(() => {
		setTheme(resolveInitialTheme());
	});

	return [
		theme,
		(next: Theme) => {
			setTheme(next);
			applyTheme(next);
		},
	];
}
