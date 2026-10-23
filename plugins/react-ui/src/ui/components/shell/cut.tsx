import { Tooltip } from "@base-ui/react/tooltip";
import { useEffect, useState } from "react";
import { useTouch } from "../../lib/media.ts";
import { hid, recently } from "../../lib/rest.ts";
import { NamePopup, SHOW_AFTER } from "../button/glyph.tsx";

// A truncating element: one line cut with an ellipsis (`truncate`), or a line
// clamp. Cut only when its text runs past its box.
function cutOf(element: Element): boolean | null {
	const style = getComputedStyle(element);
	if (style.textOverflow === "ellipsis")
		return element.scrollWidth > element.clientWidth;
	if (style.webkitLineClamp !== "none")
		return element.scrollHeight > element.clientHeight;
	return null;
}

// The nearest truncating ancestor of what the pointer is on, if its text is cut.
function cutAbove(target: Element): Element | null {
	for (let up: Element | null = target; up; up = up.parentElement) {
		const cut = cutOf(up);
		if (cut !== null) return cut ? up : null;
	}
	return null;
}

// Keyboard focus lands on a row or a link whose text is a descendant.
function cutWithin(target: Element): Element | null {
	return (
		cutAbove(target) ??
		[...target.querySelectorAll("*")].find((e) => cutOf(e) === true) ??
		null
	);
}

// An element that already names itself (a native `title`) keeps its own.
function named(element: Element): boolean {
	return element.closest("[title]") !== null;
}

/** The one tooltip for text that is cut: a pointer resting on it or the keyboard reaching it shows the whole text; Escape, a press, a scroll or leaving hides it; touch draws none. Outside the package's exports; the frame host mounts it once. */
export function CutText() {
	const touch = useTouch();
	// `instant` is a tooltip that opened with no rest (the keyboard's focus, or
	// a pointer within `RECENT` of the last one going): it shows with no fade.
	const [shown, setShown] = useState<{
		element: Element;
		instant: boolean;
	} | null>(null);

	useEffect(() => {
		if (touch) return;
		let timer: number | undefined;
		let open: Element | null = null;
		const show = (element: Element | null, instant: boolean) => {
			open = element && !named(element) ? element : null;
			setShown(open && { element: open, instant });
		};
		const hide = () => {
			window.clearTimeout(timer);
			if (!open) return;
			show(null, false);
			hid();
		};
		const onMove = (event: PointerEvent) => {
			if (event.pointerType === "touch") return;
			const target = event.target;
			if (!(target instanceof Element)) return;
			if (open?.contains(target)) return;
			hide();
			const rest = recently() ? 0 : SHOW_AFTER;
			timer = window.setTimeout(
				() => show(target.isConnected ? cutAbove(target) : null, rest === 0),
				rest,
			);
		};
		const onFocus = (event: FocusEvent) => {
			hide();
			const target = event.target;
			if (target instanceof Element && target.matches(":focus-visible"))
				show(cutWithin(target), true);
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") hide();
		};
		const options = { capture: true, passive: true };
		const on: [string, EventListener][] = [
			["pointermove", onMove as EventListener],
			["pointerdown", hide],
			["pointerleave", hide],
			["scroll", hide],
			["wheel", hide],
			["focusin", onFocus as EventListener],
			["focusout", hide],
			["keydown", onKey as EventListener],
		];
		for (const [type, fn] of on) document.addEventListener(type, fn, options);
		document.documentElement.addEventListener("pointerleave", hide);
		return () => {
			hide();
			for (const [type, fn] of on)
				document.removeEventListener(type, fn, options);
			document.documentElement.removeEventListener("pointerleave", hide);
		};
	}, [touch]);

	if (!shown) return null;
	return (
		<Tooltip.Root open>
			<NamePopup cut anchor={shown.element} instant={shown.instant}>
				{shown.element.textContent}
			</NamePopup>
		</Tooltip.Root>
	);
}
