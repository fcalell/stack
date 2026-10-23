import { Toast as Control } from "@base-ui/react/toast";
import { TONES } from "@fcalell/ui-core/tokens";
import { TOASTS } from "@fcalell/ui-core/variants";
import { useEffect, useState } from "react";
import { ToastList } from "../../components/toast/layer.tsx";
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

// The stack on the sentence cell, oldest on top; one toast per tone cell.
export function drawToast(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	if (cell === "TEXT.role.body") return <Layer toasts={STACK} />;
	const tone = TONES.find((one) => cell === `TOAST_STATE.tone.${one}`);
	return tone ? (
		<Layer toasts={[{ sentence: `Tone ${tone}`, tone }]} />
	) : undefined;
}
