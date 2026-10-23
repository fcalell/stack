import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Switch } from "@fcalell/plugin-react-ui/components/switch";
import { Text } from "@fcalell/plugin-react-ui/components/text";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";

const pressed = fn();

// The options an option list reads its value's type from: the value is text.
const _FIRST_SECOND: { value: string; label: string }[] = [
	{ value: "a", label: "First" },
	{ value: "b", label: "Second" },
];

// Answer, give and toggle (`motion.md` §3): the cells the matrices compose, read
// back as the browser resolves them. A state's look eases in on `fast` and a
// press lands on `instant`, a filled control gives to `--scale-press`, the
// focus ring never transitions, and a toggle's thumb, mark, dot and chevron
// move on `fast`. Reduced motion zeroes every rung on the root, so each of them
// resolves to 0 s.
export default {
	title: "Behaviour/Answer",
} satisfies Meta;

const secondsOf = (value: string) => Number.parseFloat(value) * 1000;
const first = (list: string) => list.split(",")[0]?.trim() ?? "";

function fastMs(): number {
	return Number.parseFloat(
		getComputedStyle(document.documentElement).getPropertyValue(
			"--transition-duration-fast",
		),
	);
}

// The declarations of the rules whose selector is `selector` exactly, found
// through the sheets (a pseudo-class cannot be forced on in a story).
function declared(selector: string, property: string): string[] {
	const found: string[] = [];
	const visit = (rules: CSSRuleList) => {
		for (const rule of Array.from(rules)) {
			if (rule instanceof CSSStyleRule && rule.selectorText === selector) {
				const value = rule.style.getPropertyValue(property);
				if (value) found.push(value);
			}
			if ("cssRules" in rule) visit((rule as CSSGroupingRule).cssRules);
		}
	};
	for (const sheet of Array.from(document.styleSheets)) {
		try {
			visit(sheet.cssRules);
		} catch {
			// A sheet from another origin cannot be read.
		}
	}
	return found;
}

export const Button_: StoryObj = {
	name: "A Button answers and gives",
	render: () => (
		<>
			<Button label="Save" onAct={pressed} />
			<Button label="Save all" fit="field" onAct={pressed} />
		</>
	),
	play: async ({ canvas }) => {
		const button = canvas.getByRole("button", { name: "Save" });
		const style = getComputedStyle(button);
		// The state's look eases on `fast`, out; the ring is not on the list.
		await expect(secondsOf(first(style.transitionDuration))).toBe(fastMs());
		await expect(first(style.transitionTimingFunction)).toMatch(
			/cubic-bezier|ease/,
		);
		for (const property of [
			"background-color",
			"border-color",
			"color",
			"opacity",
			"scale",
		]) {
			await expect(style.transitionProperty).toContain(property);
		}
		await expect(style.transitionProperty).not.toMatch(
			/outline|width|height|margin|padding|all/,
		);
		// A press lands on `instant` and scales to the press scale.
		await expect(
			declared(".active\\:duration-instant:active", "transition-duration")
				.length,
		).toBeGreaterThan(0);
		await expect(
			declared(".active\\:scale-\\(--scale-press\\):active", "scale"),
		).toContain("var(--scale-press)");
		await expect(
			getComputedStyle(document.documentElement).getPropertyValue(
				"--scale-press",
			),
		).toBe("0.97");
		// The ring snaps in: focusing it changes no transition.
		button.focus();
		await expect(getComputedStyle(button).transitionProperty).toBe(
			style.transitionProperty,
		);
		// A full-width act answers and does not give.
		const wide = canvas.getByRole("button", { name: "Save all" });
		await expect(wide.className.includes("active:scale-(--scale-press)")).toBe(
			false,
		);
		await expect(
			button.className.includes("active:scale-(--scale-press)"),
		).toBe(true);
	},
};

export const Quiet: StoryObj = {
	name: "An icon Button and a link Button answer",
	render: () => (
		<>
			<Button glyph icon="RefreshCw" label="Refresh" onAct={pressed} />
			<Button href="/overview" label="Overview" />
			<Button href="/overview" fit="inline" label="Inline" />
		</>
	),
	play: async ({ canvas }) => {
		const act = canvas.getByRole("button", { name: "Refresh" });
		await expect(
			secondsOf(first(getComputedStyle(act).transitionDuration)),
		).toBe(fastMs());
		await expect(act.className).toContain("active:scale-(--scale-press)");
		// The underline is a colour that comes and goes, so it eases: the line is
		// always drawn.
		for (const link of canvas.getAllByRole("link")) {
			const style = getComputedStyle(link);
			await expect(style.transitionProperty).toContain("text-decoration-color");
			await expect(style.textDecorationLine).toBe("underline");
		}
	},
};

function Toggles() {
	const [on, setOn] = useState(false);
	const [one, setOne] = useState<"a" | "b" | null>("a");
	return (
		<>
			<Switch checked={on} onChange={setOn} label="Switch" />
			<Picker
				fit="list"
				label="Options"
				options={[
					{ value: "a", label: "First" },
					{ value: "b", label: "Second" },
				]}
				value={one}
				onChange={setOne}
			/>
			<Section title="Fold" folded={false}>
				<Text>The chevron turns.</Text>
			</Section>
		</>
	);
}

export const Toggle: StoryObj = {
	name: "A toggle moves its own value on fast",
	render: () => <Toggles />,
	play: async ({ canvas, userEvent }) => {
		const root = document.documentElement;
		// The thumb travels by transform on `fast`, in and out.
		const thumb = canvas
			.getByRole("switch", { name: "Switch" })
			.querySelector("span > span");
		await expect(thumb).not.toBeNull();
		if (!thumb) return;
		const moving = getComputedStyle(thumb);
		await expect(moving.transitionProperty).toContain("transform");
		await expect(secondsOf(moving.transitionDuration)).toBe(fastMs());
		// The check grows from 0.6: its starting style is a scale and a clear mark.
		await userEvent.click(canvas.getByRole("checkbox", { name: "Box" }));
		const mark = await waitFor(() => {
			const found = canvas
				.getByRole("checkbox", { name: "Box" })
				.querySelector("[data-checked]:not(button)");
			if (!found) throw new Error("the mark has not mounted");
			return found;
		});
		await expect(getComputedStyle(mark).transitionProperty).toMatch(
			/scale.*opacity|opacity.*scale/,
		);
		await expect(
			declared(".data-starting-style\\:scale-60[data-starting-style]", "scale")
				.length,
		).toBeGreaterThan(0);
		// The radio's dot grows from nothing.
		await expect(
			declared(".data-starting-style\\:scale-0[data-starting-style]", "scale")
				.length,
		).toBeGreaterThan(0);
		// The chevron turns a quarter when the fold closes, and does not swap.
		const toggle = canvas.getByRole("button", { name: /Fold/ });
		const chevron = toggle.querySelector("svg")?.parentElement;
		await expect(chevron).toBeTruthy();
		if (!chevron) return;
		await expect(getComputedStyle(chevron).rotate).toBe("none");
		await userEvent.click(toggle);
		await waitFor(() =>
			expect(getComputedStyle(chevron).rotate).toBe("-90deg"),
		);
		await expect(getComputedStyle(chevron).transitionProperty).toContain(
			"transform",
		);
		// Reduced motion zeroes the rungs, so the thumb and the chevron resolve to 0.
		root.style.setProperty("--transition-duration-fast", "0ms");
		try {
			await expect(getComputedStyle(thumb).transitionDuration).toBe("0s");
			await expect(getComputedStyle(chevron).transitionDuration).toBe("0s");
		} finally {
			root.style.removeProperty("--transition-duration-fast");
		}
	},
};
