import { Toast as ToastControl } from "@base-ui/react/toast";
import { cn } from "@fcalell/ui-core/cn";
import { TOASTS } from "@fcalell/ui-core/variants";
import { createContext, type ReactNode, use, useState } from "react";
import { PortalContainer, PortalHosted } from "../../lib/portal.ts";
import { toasts } from "../../lib/toast.ts";
import { useWords } from "../../lib/words.tsx";
import { Confirmations } from "../sheet/confirm.tsx";
import { ToastList } from "../toast/layer.tsx";

// The frame's `main` landmark: it stands the toasts' layer over the page and
// the popup layer last inside, so every popup mounts in the landmark.
const MAIN = "relative flex flex-col grow min-h-0";
// The toasts stand on their layer over an open sheet's portal, so nothing
// between them and the root makes a stacking context (no `isolate`, `z-*` or
// transform on the frame, the column or `main`; verify b-layers holds it).
// Their foot is the top of a docked foot (a Place's `foot`, a filling
// Thread's input), which names itself the `--docked-foot` anchor: the layer
// stands above it by layout as it grows, and at `main`'s foot without one.
const TOASTS_LAYER =
	"absolute inset-0 bottom-[anchor(--docked-foot_top,0px)] z-(--layer-toasts) flex flex-col items-end justify-end pointer-events-none touch:items-center";

const PopupLayer = createContext<(layer: HTMLElement | null) => void>(() => {});

/** What a root frame (the Shell, the Gate) mounts around itself: the `toast()` queue, the `confirm()` decisions, and the popup layer's container. Outside the package's exports. */
export function FrameHost({ children }: { children: ReactNode }) {
	// The popup layer is an empty element last in `main`; every popup (menu,
	// picker, select, sheet) mounts in it, so an open popup stands inside the
	// landmark.
	const [layer, setLayer] = useState<HTMLElement | null>(null);
	return (
		<PortalContainer value={layer}>
			<PortalHosted value>
				<PopupLayer value={setLayer}>
					<ToastControl.Provider toastManager={toasts}>
						{children}
						<Confirmations />
					</ToastControl.Provider>
				</PopupLayer>
			</PortalHosted>
		</PortalContainer>
	);
}

/** The frame's `main`: its page, the toasts' layer over it (with `beside` standing among the toasts), and the popup layer. */
export function FrameMain(props: { beside?: ReactNode; children: ReactNode }) {
	const words = useWords();
	const setLayer = use(PopupLayer);
	return (
		<main className={MAIN}>
			{props.children}
			<ToastControl.Viewport
				aria-label={words.notifications}
				className={cn(TOASTS, TOASTS_LAYER)}
			>
				<ToastList />
				{props.beside}
			</ToastControl.Viewport>
			<div ref={setLayer} />
		</main>
	);
}
