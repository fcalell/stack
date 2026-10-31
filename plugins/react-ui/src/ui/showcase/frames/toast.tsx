import { Toast as Control } from "@base-ui/react/toast";
import { cn } from "@fcalell/ui-core/cn";
import { TONES } from "@fcalell/ui-core/tokens";
import { TOASTS } from "@fcalell/ui-core/variants";
import { useEffect, useState } from "react";
import { Code } from "../../components/code/index.tsx";
import { Sheet } from "../../components/sheet/index.tsx";
import { TOASTS_LAYER } from "../../components/shell/host.tsx";
import { ToastList } from "../../components/toast/layer.tsx";
import { PortalContainer } from "../../lib/portal.ts";
import type { ToastData } from "../../lib/toast.ts";
import { useWords } from "../../lib/words.tsx";
import type { ShowcaseFrame } from "../cells.ts";
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

const JOIN = "https://stead.example/join?code=7k2m-9xq4-4tpw-h8nz";

// The Shell's own layer (its class, its anchor to `--docked-foot`) over an open
// bottom sheet, as `main` holds them: the portal element first, so the sheet
// mounts before the layer in tree order, then the layer. On touch the sheet
// names itself the anchor the layer stands above, so the toast covers the page
// behind the sheet's top edge and never the sheet's sentence, its address or its
// act; on the desktop the sheet is a card and the toast stands at the corner.
function OverSheet() {
	const words = useWords();
	const [slot, setSlot] = useState<HTMLElement | null>(null);
	const [manager] = useState(() => Control.createToastManager<ToastData>());
	useEffect(() => {
		manager.add({
			id: "again",
			description: "Started the run again.",
			data: { sentence: "Started the run again." },
			timeout: 0,
		});
	}, [manager]);
	return (
		<Stage contain>
			<div ref={setSlot} className="fixed top-0 left-0 size-0" />
			<PortalContainer value={slot}>
				<Sheet
					open
					onClose={() => {}}
					title="Add a device"
					description="Scan the code with the device, or open the address on it."
				>
					<Code text={JOIN} copy />
				</Sheet>
			</PortalContainer>
			<Control.Provider toastManager={manager}>
				<Control.Viewport
					aria-label={words.notifications}
					className={cn(TOASTS, TOASTS_LAYER)}
				>
					<ToastList />
				</Control.Viewport>
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
			</>
		);
	const tone = TONES.find((one) => cell === `TOAST_STATE.tone.${one}`);
	return tone ? (
		<Layer toasts={[{ sentence: `Tone ${tone}`, tone }]} />
	) : undefined;
}
