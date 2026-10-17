import { Toast as ToastControl } from "@base-ui/react/toast";
import { cn } from "@fcalell/ui-core/cn";
import { TOASTS } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { toasts } from "../../lib/toast.ts";
import { useWords } from "../../lib/words.tsx";
import { Confirmations } from "../sheet/confirm.tsx";
import { ToastList } from "../toast/layer.tsx";
import { CutText } from "./cut.tsx";

// The frame's `main` landmark: it stands the toasts' layer over the page.
const MAIN = "relative flex flex-col grow min-h-0";
// The toasts stand on their layer over an open sheet's portal, so nothing
// between them and the root makes a stacking context (no `isolate`, `z-*` or
// transform on the frame, the column or `main`; verify b-layers holds it).
// Their foot is the top of a docked foot (a Place's `foot`, a filling
// Thread's input), which names itself the `--docked-foot` anchor: the layer
// stands above it by layout as it grows, and at `main`'s foot without one.
const TOASTS_LAYER =
	"absolute inset-0 bottom-[anchor(--docked-foot_top,0px)] z-(--layer-toasts) flex flex-col items-end justify-end pointer-events-none touch:items-center";

/** What a root frame (the Shell, the Gate) mounts around itself: the `toast()` queue, the `confirm()` decisions and the one tooltip for cut text. Outside the package's exports. */
export function FrameHost({ children }: { children: ReactNode }) {
	return (
		<ToastControl.Provider toastManager={toasts}>
			{children}
			<Confirmations />
			<CutText />
		</ToastControl.Provider>
	);
}

/** The frame's `main`: its page and the toasts' layer over it. */
export function FrameMain(props: { children: ReactNode }) {
	const words = useWords();
	return (
		<main className={MAIN}>
			{props.children}
			<ToastControl.Viewport
				aria-label={words.notifications}
				className={cn(TOASTS, TOASTS_LAYER)}
			>
				<ToastList />
			</ToastControl.Viewport>
		</main>
	);
}
