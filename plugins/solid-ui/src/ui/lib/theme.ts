import { createSignal, onMount } from "solid-js";

type Theme = "light" | "dark";

const [theme, setTheme] = createSignal<Theme>("light");

function applyTheme(next: Theme): void {
	document.documentElement.classList.toggle("dark", next === "dark");
	localStorage.setItem("theme", next);
}

// The mode script (`node/mode.ts`) already chose before first paint: the
// stored choice, the theme's `defaultMode`, then the system preference. Its
// `dark` class is the answer, so the two never disagree.
function resolveInitialTheme(): Theme {
	return document.documentElement.classList.contains("dark") ? "dark" : "light";
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
