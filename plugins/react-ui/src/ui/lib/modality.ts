import { useEffect } from "react";

// How the viewer last drove the page, kept on the root as `data-modality`:
// `keyboard` once a key moves through the page, `pointer` after a press, and
// neither before the first. A ring draws only under `keyboard`
// (`in-data-[modality=keyboard]`): a browser also counts a clicked text field,
// and focus a script moves after one, as `:focus-visible`, which rang the
// page under the pointer. A key counts as moving through the page as React
// Aria counts it: never with Meta, Control or Alt held (a shortcut), never a
// modifier alone, and in a field that takes typing only Tab and Escape (typing
// moves nothing). One capture listener pair serves the page, installed by the
// first frame or field to mount and dropped with the last; no provider, no
// prop.
let mounted = 0;
let remove: (() => void) | undefined;

const MODIFIERS = new Set(["Shift", "Control", "Alt", "Meta"]);
const LEAVES_FIELD = new Set(["Tab", "Escape"]);
// The input types that take no typing.
const UNTYPED = new Set([
	"checkbox",
	"radio",
	"range",
	"color",
	"file",
	"image",
	"button",
	"submit",
	"reset",
]);

function typesInto(target: EventTarget | null): boolean {
	if (target instanceof HTMLTextAreaElement) return true;
	if (target instanceof HTMLInputElement) return !UNTYPED.has(target.type);
	return target instanceof HTMLElement && target.isContentEditable;
}

function moves(event: KeyboardEvent): boolean {
	if (event.metaKey || event.ctrlKey || event.altKey) return false;
	if (MODIFIERS.has(event.key)) return false;
	return !typesInto(event.target) || LEAVES_FIELD.has(event.key);
}

function install(): () => void {
	const root = document.documentElement;
	const pointer = () => {
		root.dataset.modality = "pointer";
	};
	const keyboard = (event: KeyboardEvent) => {
		if (moves(event)) root.dataset.modality = "keyboard";
	};
	document.addEventListener("pointerdown", pointer, true);
	document.addEventListener("keydown", keyboard, true);
	return () => {
		document.removeEventListener("pointerdown", pointer, true);
		document.removeEventListener("keydown", keyboard, true);
	};
}

// A frame or a field calls this once; the listeners follow them.
export function useModality() {
	useEffect(() => {
		if (mounted++ === 0) remove = install();
		return () => {
			if (--mounted === 0) {
				remove?.();
				remove = undefined;
			}
		};
	}, []);
}

// A field box's ring: 2 px centred on its 1 px edge, for the keyboard alone.
// Under the pointer the box takes the accent edge alone (`FOCUS_EDGE`). An act
// inside the box rings on its own focus, so the box yields to it.
export const BOX_FOCUS =
	"not-has-[button:focus-visible]:in-data-[modality=keyboard]:has-focus-visible:outline-2 not-has-[button:focus-visible]:in-data-[modality=keyboard]:has-focus-visible:outline-offset-(--focus-ring-edge-offset) not-has-[button:focus-visible]:in-data-[modality=keyboard]:has-focus-visible:outline-ring";
// A focused field takes the accent edge, under the pointer and the keyboard
// alike (the keyboard adds the ring); the hover edge yields to it.
export const FOCUS_EDGE = "has-focus-visible:border-accent";
