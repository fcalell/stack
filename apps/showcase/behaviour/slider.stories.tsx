import { Field } from "@base-ui/react/field";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Slider } from "@fcalell/plugin-react-ui/components/slider";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, within } from "storybook/test";

function Timeout() {
	const [value, setValue] = useState(30);
	return (
		<div className="w-popover">
			<Slider
				label="Timeout"
				value={value}
				onChange={setValue}
				min={0}
				max={60}
				step={5}
				unit="minute"
			/>
		</div>
	);
}

export default {
	title: "Behaviour/Slider",
	render: () => <Timeout />,
} satisfies Meta;

// The thumb is a named slider that moves by the arrow keys, by a page and to
// either end, and reports its value.
export const Thumb: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const thumb = await canvas.findByRole("slider", { name: "Timeout" });
		await userEvent.tab();
		await expect(thumb).toHaveFocus();
		await expect(thumb).toHaveAttribute("aria-valuenow", "30");
		await userEvent.keyboard("{ArrowRight}");
		await expect(thumb).toHaveAttribute("aria-valuenow", "35");
		await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
		await expect(thumb).toHaveAttribute("aria-valuenow", "25");
		await userEvent.keyboard("{Home}");
		await expect(thumb).toHaveAttribute("aria-valuenow", "0");
		await userEvent.keyboard("{End}");
		await expect(thumb).toHaveAttribute("aria-valuenow", "60");
	},
};

// A colour as [r, g, b, a], read by painting it: the computed value may be in
// any colour space.
function rgba(color: string): number[] {
	const canvas = document.createElement("canvas");
	canvas.width = 1;
	canvas.height = 1;
	const context = canvas.getContext("2d", { willReadFrequently: true });
	if (!context) throw new Error("no 2d context");
	context.fillStyle = color;
	context.fillRect(0, 0, 1, 1);
	return [...context.getImageData(0, 0, 1, 1).data];
}

function luminance(color: number[]): number {
	const [r = 0, g = 0, b = 0] = color.map((channel) => {
		const c = channel / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: number[], b: number[]): number {
	const [light = 0, dark = 0] = [luminance(a), luminance(b)].sort(
		(x, y) => y - x,
	);
	return (light + 0.05) / (dark + 0.05);
}

// The first opaque ground behind an element.
function groundOf(el: Element): number[] {
	for (let at = el.parentElement; at; at = at.parentElement) {
		const color = rgba(getComputedStyle(at).backgroundColor);
		if (color[3] === 255) return color;
	}
	throw new Error("no opaque ground");
}

// A class's background and height, read off a probe wearing it.
function probe(root: Element, className: string) {
	const el = document.createElement("div");
	el.className = className;
	root.append(el);
	const read = {
		color: rgba(getComputedStyle(el).backgroundColor),
		height: el.getBoundingClientRect().height,
	};
	el.remove();
	return read;
}

type Mode = "light" | "dark";

function Rails(props: { mode: Mode; disabled?: boolean }) {
	const [value, setValue] = useState(0);
	const slider = (
		<Slider
			label="Reserve"
			value={value}
			onChange={setValue}
			min={0}
			max={50}
			step={5}
			unit="percent"
		/>
	);
	const drawn = props.disabled ? (
		<Field.Root disabled>{slider}</Field.Root>
	) : (
		slider
	);
	return (
		<div
			data-scope
			className={`${props.mode} flex flex-col gap-pair p-card w-popover bg-canvas`}
		>
			<div data-testid="bare">{drawn}</div>
			<Group>
				<div data-testid="grouped">{drawn}</div>
			</Group>
		</div>
	);
}

// The unfilled part of the control: after the fill and the gap the thumb
// stands in, in the control the thumb sits in.
function railOf(root: HTMLElement, id: string): Element {
	const thumb = within(within(root).getByTestId(id)).getByRole("slider");
	const rest = thumb.parentElement?.parentElement?.children[2];
	if (!rest) throw new Error("the rail is not drawn");
	return rest;
}

// At value 0 the rail is the whole track: the track token tall, in the
// thumb's boundary ink at 3:1 against the surface it stands on; a disabled
// slider's rail is the hairline.
function rail(density: string, mode: Mode, disabled = false): StoryObj {
	return {
		render: () => <Rails mode={mode} disabled={disabled} />,
		play: async ({ canvasElement }) => {
			await expect(document.documentElement.dataset.density).toBe(density);
			// The probes stand in the mode the slider is drawn in.
			const scope = canvasElement.querySelector("[data-scope]");
			if (!scope) throw new Error("the scope is not drawn");
			for (const id of ["bare", "grouped"]) {
				const rest = railOf(canvasElement, id);
				await expect(rest.getBoundingClientRect().height).toBe(
					probe(scope, "h-track").height,
				);
				const drawn = rgba(getComputedStyle(rest).backgroundColor);
				if (disabled) {
					await expect(drawn).toEqual(probe(scope, "bg-edge").color);
					continue;
				}
				await expect(drawn).toEqual(probe(scope, "bg-edge-strong").color);
				const ratio = contrast(drawn, groundOf(rest));
				console.log(
					`${mode} ${id}: rail ${rest.getBoundingClientRect().height}px, ${ratio.toFixed(2)}:1`,
				);
				await expect(ratio).toBeGreaterThanOrEqual(3);
			}
		},
	};
}

function touch(story: StoryObj): StoryObj {
	return {
		...story,
		tags: ["touch"],
		globals: {
			density: "touch",
			viewport: { value: "phone", isRotated: false },
		},
		parameters: {
			...story.parameters,
			viewport: {
				options: {
					phone: {
						name: "Phone",
						styles: { width: "390px", height: "812px" },
						type: "mobile",
					},
				},
			},
		},
	};
}

export const RailLight = rail("desktop", "light");
export const RailDark = rail("desktop", "dark");
export const RailTouchLight = touch(rail("touch", "light"));
export const RailTouchDark = touch(rail("touch", "dark"));
export const RailDisabled = rail("desktop", "dark", true);
export const RailDisabledLight = rail("desktop", "light", true);
