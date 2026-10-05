import type {
	Attachment,
	Notice,
	PickedFile,
} from "@fcalell/ui-core/descriptors";
import { type ReactNode, useState } from "react";
import { MessageInput } from "../../components/message-input/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { SCREEN } from "./image.tsx";
import { Wide } from "./layout-context.tsx";

const act = () => {};
const PLACEHOLDER = "Ask about this project";
const ASKED = "Why did the last deploy of api fail?";
const GROWN = [
	"Open 0042_add_invoices and read it with me.",
	"If the column is missing on staging too, say so first.",
	"Then redeploy api.",
].join("\n");
const CAPPED = [
	"Open 0042_add_invoices and read it with me.",
	"If the column is missing on staging too, say so first.",
	"Then run it on staging and check the invoices page.",
	"If the page loads, run the backfill for October.",
	"Compare the totals with the billing export.",
	"If they differ by more than one invoice, stop there.",
	"Otherwise redeploy api to production,",
	"watch the error rate for ten minutes,",
	"and post the result in #deploys.",
	"Keep web on the old build until I say so.",
].join("\n");
const FILES: Attachment[] = [
	{ id: "a", name: "deploy-api-4f2c.log" },
	{ id: "b", name: "deploy-api-a81d-production-rollback.log" },
	{ id: "c", name: "wrangler.toml" },
];
// An image and a file, as the viewer pastes or drops them.
const PICTURES: Attachment[] = [
	{ id: "p", name: "Checkout page after the failed payment", src: SCREEN },
	{ id: "q", name: "deploy-api-4f2c.log" },
];
const UPGRADE: Notice = {
	sentence: "12 of 50 answers left this month.",
	act: { label: "Upgrade", onAct: act },
};
const QUEUED: Notice = {
	sentence: "A message sent now is read once this answer ends.",
};

// A consumer's answer to `onAttach`: the picked file's own local address
// draws as its thumbnail (an image has one, any other file only its name).
function attachmentOf(file: PickedFile): Attachment {
	return { id: crypto.randomUUID(), name: file.name, src: file.src };
}

// One input as a viewer drives it: typing, sending (which clears the text
// and works until Stop), attaching (the dialog, a paste, a drop) and
// detaching.
function Live(props: {
	value?: string;
	attachments?: Attachment[];
	notice?: Notice;
	working?: boolean;
	stoppable?: boolean;
	disabled?: boolean;
}) {
	const [value, setValue] = useState(props.value ?? "");
	const [working, setWorking] = useState(props.working ?? false);
	const [files, setFiles] = useState(props.attachments);
	return (
		<MessageInput
			value={value}
			onChange={setValue}
			attachments={files}
			onAttach={(picked) =>
				setFiles((now) => [...(now ?? []), ...picked.map(attachmentOf)])
			}
			onDetach={(id) => {
				setFiles((now) => now?.filter((file) => file.id !== id));
				const gone = files?.find((file) => file.id === id)?.src;
				if (gone?.startsWith("blob:")) URL.revokeObjectURL(gone);
			}}
			placeholder={PLACEHOLDER}
			notice={props.notice}
			working={working}
			onSend={() => {
				setValue("");
				setWorking(true);
			}}
			onStop={props.stoppable === false ? undefined : () => setWorking(false)}
			disabled={props.disabled}
		/>
	);
}

// Board 53's input frames, the shape by the page's density: a pointer or
// focus state on a typed value; disabled with its notice; at rest the frames
// whose part the cell names (Send for the primary act, Stop beside it for
// the secondary and the icon act, the notice's act for the bar fit, the chips
// for the chip and its glyph, the field and its text for the field, the empty
// input for the notice's line).
function Rest(props: { cell: string }) {
	const { cell } = props;
	if (
		cell.startsWith("BUTTON_LABEL.act.primary") ||
		cell === "BUTTON.act.primary"
	)
		return <Live value={ASKED} />;
	if (
		cell.startsWith("BUTTON_LABEL.act.secondary") ||
		cell === "BUTTON.act.secondary" ||
		cell === "ICON_BUTTON.fit.bar"
	)
		return (
			<>
				<Live working notice={QUEUED} />
				<Live working notice={QUEUED} value="Then redeploy web too" />
				<Live working stoppable={false} />
			</>
		);
	if (cell === "BUTTON.fit.bar")
		return (
			<>
				<Live notice={UPGRADE} />
				<Live
					notice={{
						...UPGRADE,
						act: { label: "Upgrade", onAct: act, loading: true },
					}}
				/>
			</>
		);
	if (cell.startsWith("CHIP") || cell === "ICON.fit.meta")
		return (
			<Live value="What changed between these two runs?" attachments={FILES} />
		);
	if (cell.startsWith("IMAGE") || cell === "MESSAGE_ATTACHMENTS")
		return <Live value="Why did this payment fail?" attachments={PICTURES} />;
	if (cell.startsWith("FIELD"))
		return (
			<>
				<Live />
				<Live value={GROWN} />
				<Live value={CAPPED} />
			</>
		);
	if (cell === "TEXT.role.meta")
		return (
			<>
				<Live notice={UPGRADE} />
				<Live
					notice={{
						sentence: "Answers can be wrong; check them before you deploy.",
					}}
				/>
			</>
		);
	return <Live />;
}

export function drawMessageInput(frame: ShowcaseFrame) {
	let drawn: ReactNode;
	if (frame.state === "disabled")
		drawn = <Live disabled notice={{ sentence: "This thread is archived." }} />;
	else if (frame.state === "rest") drawn = <Rest cell={frame.cell.name} />;
	else drawn = <Live value={ASKED} />;
	return <Wide>{drawn}</Wide>;
}
