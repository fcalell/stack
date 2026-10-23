import { Toast as ToastControl } from "@base-ui/react/toast";
import { Tooltip } from "@base-ui/react/tooltip";
import { cn } from "@fcalell/ui-core/cn";
import { TOASTS } from "@fcalell/ui-core/variants";
import { type ReactNode, use, useState } from "react";
import { PortalContainer, PortalHosted, PortalSlot } from "../../lib/portal.ts";
import { RECENT } from "../../lib/rest.ts";
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
// Their foot is the top of a docked foot (a place's `foot`, a filling
// Thread's input), which names itself the `--docked-foot` anchor: the layer
// stands above it by layout as it grows, and at `main`'s foot without one.
// The popups' mount: a point at the viewport's origin, so a popup's positioner
// measures against the viewport as it would in the body (its first frame stands
// where it settles), while the element itself stands in `main`, a landmark.
// Being fixed it is a stacking context, so it stands on the popover layer, the
// top of the layers it holds: over the page and the tab bar, under the toasts.
const PORTAL = "fixed top-0 left-0 size-0 z-(--layer-popover)";
const TOASTS_LAYER =
	"absolute inset-0 bottom-[anchor(--docked-foot_top,0px)] z-(--layer-toasts) flex flex-col items-end justify-end pointer-events-none touch:items-center";

/** What a root frame (the Shell, the Gate) mounts around itself: the `toast()` queue, the `confirm()` decisions, the tooltips' shared window and the one tooltip for cut text. Outside the package's exports. */
export function FrameHost({ children }: { children: ReactNode }) {
	// The popups' container is an element of `main`, so it is state until the
	// frame's `main` mounts it.
	const [portal, setPortal] = useState<HTMLElement | null>(null);
	return (
		<ToastControl.Provider toastManager={toasts}>
			<Tooltip.Provider timeout={RECENT}>
				<PortalContainer value={portal}>
					<PortalHosted value>
						<PortalSlot value={setPortal}>
							{children}
							<Confirmations />
							<CutText />
						</PortalSlot>
					</PortalHosted>
				</PortalContainer>
			</Tooltip.Provider>
		</ToastControl.Provider>
	);
}

/** The frame's `main`: its page and the toasts' layer over it. */
export function FrameMain(props: { children: ReactNode; className?: string }) {
	const words = useWords();
	const slot = use(PortalSlot);
	return (
		<main className={cn(MAIN, props.className)}>
			{props.children}
			<div ref={slot} className={PORTAL} />
			<ToastControl.Viewport
				aria-label={words.notifications}
				className={cn(TOASTS, TOASTS_LAYER)}
			>
				<ToastList />
			</ToastControl.Viewport>
		</main>
	);
}
