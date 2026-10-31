import { Toast as Control } from "@base-ui/react/toast";
import { cn } from "@fcalell/ui-core/cn";
import { TONES } from "@fcalell/ui-core/tokens";
import { TOASTS } from "@fcalell/ui-core/variants";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/button/index.tsx";
import { Code } from "../../components/code/index.tsx";
import { Pane } from "../../components/pane/index.tsx";
import { Sheet } from "../../components/sheet/index.tsx";
import {
	FrameHost,
	FrameMain,
	TOASTS_LAYER,
} from "../../components/shell/host.tsx";
import { Place } from "../../components/shell/place.tsx";
import { ToastList } from "../../components/toast/layer.tsx";
import type { ToastData } from "../../lib/toast.ts";
import { useWords } from "../../lib/words.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { StandInList } from "./layout-context.tsx";
import { Stage } from "./overlay-stage.tsx";

const act = () => {};
const STACK: ToastData[] = [
	{
		sentence: "Deployment started",
		act: { label: "View", onAct: act },
	},
	{ sentence: "Build is slower than usual", tone: "attention" },
	{
		sentence: "Couldn’t reach the API",
		tone: "failed",
		act: { label: "Retry", onAct: act },
	},
];

// The Shell's layer over a stage, holding its own queue of toasts that stay.
function Layer(props: { toasts: ToastData[] }) {
	const words = useWords();
	const [manager] = useState(() => Control.createToastManager<ToastData>());
	// The provider hears the queue once mounted; the sentence keys each, so a
	// second run updates in place.
	useEffect(() => {
		for (const data of props.toasts)
			manager.add({
				id: data.sentence,
				description: data.sentence,
				data,
				timeout: 0,
			});
	}, [manager, props.toasts]);
	return (
		<Stage contain>
			<Control.Provider toastManager={manager}>
				<Control.Viewport
					aria-label={words.notifications}
					className={`${TOASTS} absolute inset-0 flex flex-col items-end justify-end pointer-events-none touch:items-center`}
				>
					<ToastList />
				</Control.Viewport>
			</Control.Provider>
		</Stage>
	);
}

// The frames the check waits for the sheet and the toast to stand, and then for
// the layer to be laid out.
const WAIT = 120;
const SETTLE = 4;
const JOIN = "https://stead.example/join?code=7k2m-9xq4-4tpw-h8nz";

// The Shell's own frame (`FrameHost` and `FrameMain`: the layer and the portal
// as the app mounts them, with the frame's queue standing in for the app's)
// over an open bottom sheet, below a banner as the column holds one, so `main`
// is not the box the stage contains the sheet's fixed layer in. The layer's
// anchor then holds only where the layer is as fixed as the sheet is (an
// absolute one in `main` fell back to the page inset and stood over the sheet's
// act), so the frame reads both boxes and logs an error when the toast overlaps
// the sheet. On touch the sheet names itself the anchor the layer stands above,
// so the toast covers the page behind the sheet's top edge and never the
// sheet's sentence, its address or its act; on the desktop the sheet is a card
// and the toast stands at the corner.
function OverSheet() {
	const stage = useRef<HTMLDivElement>(null);
	const [manager] = useState(() => Control.createToastManager<ToastData>());
	useEffect(() => {
		manager.add({
			id: "again",
			description: "Started the run again.",
			data: { sentence: "Started the run again." },
			timeout: 0,
		});
	}, [manager]);
	useEffect(() => {
		// The sheet mounts in the portal a commit after the frame and the toast
		// after its queue lands: once both stand and have been laid out a few
		// frames, read their boxes.
		let frame = 0;
		let waited = 0;
		let seen = 0;
		const read = () => {
			const sheet = stage.current?.querySelector("[role=dialog]");
			const toast = stage.current?.querySelector("[data-toast]");
			if (!sheet || !toast) {
				if (++waited < WAIT) frame = requestAnimationFrame(read);
				return;
			}
			if (++seen < SETTLE) {
				frame = requestAnimationFrame(read);
				return;
			}
			const over = sheet.getBoundingClientRect();
			const on = toast.getBoundingClientRect();
			const apart =
				on.bottom <= over.top ||
				on.top >= over.bottom ||
				on.right <= over.left ||
				on.left >= over.right;
			if (!apart) console.error("the toast stands over the open sheet");
		};
		frame = requestAnimationFrame(read);
		return () => cancelAnimationFrame(frame);
	}, []);
	return (
		<div ref={stage}>
			<Stage contain>
				<FrameHost>
					<div className="shrink-0 h-12 border-b border-edge bg-canvas" />
					<Control.Provider toastManager={manager}>
						<FrameMain>
							<Sheet
								open
								onClose={() => {}}
								title="Add a device"
								description="Scan the code with the device, or open the address on it."
							>
								<Code text={JOIN} copy />
							</Sheet>
						</FrameMain>
					</Control.Provider>
				</FrameHost>
			</Stage>
		</div>
	);
}

// The Shell's layer over a page that docks no foot, as `main` holds them: the
// page's body ends with the act that raised the toast, and while a toast stands
// the body takes the layer's reach under its last line (`PAGE_BODY_UNDER_TOAST`),
// so scrolling to the end brings the act clear of the toast.
function OverPage() {
	const words = useWords();
	const [manager] = useState(() => Control.createToastManager<ToastData>());
	useEffect(() => {
		manager.add({
			id: "works",
			description: "Works.",
			data: { sentence: "Works." },
			timeout: 0,
		});
	}, [manager]);
	return (
		<Stage contain>
			<Control.Provider toastManager={manager}>
				<main className="relative flex flex-col grow min-h-0">
					<Place title="Agent">
						<Pane title="Agent">
							<StandInList />
							<Button label="Send a test" onAct={act} />
						</Pane>
					</Place>
					<Control.Viewport
						aria-label={words.notifications}
						className={cn(TOASTS, TOASTS_LAYER)}
					>
						<ToastList />
					</Control.Viewport>
				</main>
			</Control.Provider>
		</Stage>
	);
}

// The stack on the sentence cell, oldest on top, and a toast over an open
// sheet; one toast per tone cell.
export function drawToast(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	if (cell === "TEXT.role.body")
		return (
			<>
				<Layer toasts={STACK} />
				<OverSheet />
				<OverPage />
			</>
		);
	const tone = TONES.find((one) => cell === `TOAST_STATE.tone.${one}`);
	return tone ? (
		<Layer toasts={[{ sentence: `Tone ${tone}`, tone }]} />
	) : undefined;
}
