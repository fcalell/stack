import { useEffect } from "react";

// How the viewer last drove the page, kept on the root as `data-modality`:
// `pointer` after a press, `keyboard` after any key, keyboard before either.
// A browser counts a clicked text field as `:focus-visible`, so a field's ring
// reads the root: it draws for the keyboard and stays quiet for the pointer,
// whose box takes the hover edge. One capture listener pair serves the page,
// installed by the first field to mount and dropped with the last; no
// provider, no prop.
let mounted = 0;
let remove: (() => void) | undefined;

function install(): () => void {
	const root = document.documentElement;
	const pointer = () => {
		root.dataset.modality = "pointer";
	};
	const keyboard = () => {
		root.dataset.modality = "keyboard";
	};
	document.addEventListener("pointerdown", pointer, true);
	document.addEventListener("keydown", keyboard, true);
	return () => {
		document.removeEventListener("pointerdown", pointer, true);
		document.removeEventListener("keydown", keyboard, true);
	};
}

// A field calls this once; the listeners follow the page's fields.
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
// Under the pointer the box takes the hover edge instead (`BOX_HOVER`). An act
// inside the box rings on its own focus, so the box yields to it.
export const BOX_FOCUS =
	"not-has-[button:focus-visible]:not-in-data-[modality=pointer]:has-focus-visible:outline-2 not-has-[button:focus-visible]:not-in-data-[modality=pointer]:has-focus-visible:outline-offset-(--focus-ring-edge-offset) not-has-[button:focus-visible]:not-in-data-[modality=pointer]:has-focus-visible:outline-ring";
// The quiet cue for a pointer focus: the hover edge.
export const POINTER_FOCUS_EDGE =
	"in-data-[modality=pointer]:has-focus-visible:border-edge-hover";
