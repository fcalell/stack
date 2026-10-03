import type { ReactNode } from "react";
import { Message } from "../../components/message/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

const open = () => {};

// A moment today at a board's time, as an ISO string the Message formats.
export function today(time: string): string {
	const [hours = 0, minutes = 0] = time.split(":").map(Number);
	const at = new Date();
	at.setHours(hours, minutes, 0, 0);
	return at.toISOString();
}

export const REPLY =
	"The build failed on step 4. The migration `0042_add_invoices` reads a column the production database does not have yet.\n\nRun the pending migration against production, then redeploy.";

// Board 53's context: a thread's pane, the surface a thread stands on.
export function Pane(props: { children: ReactNode }) {
	return (
		<div className="flex flex-col gap-fields rounded-card border border-edge bg-surface p-page">
			{props.children}
		</div>
	);
}

type Author = "you" | "other" | "system";

// The author a cell stands for: a `MESSAGE.author` cell its own, the strong
// name another's, the meta line and the chevron a system line's, the body
// line yours.
const YOURS = ["MESSAGE.author.you", "TEXT.role.body"];
const SYSTEMS = [
	"MESSAGE.author.system",
	"TEXT.role.meta",
	"LINE_BOX.role.meta",
	"ICON.fit.meta",
];

function authorOf(cell: string): Author {
	if (YOURS.includes(cell)) return "you";
	if (SYSTEMS.includes(cell)) return "system";
	return "other";
}

function Rest(props: { author: Author }) {
	if (props.author === "you")
		return (
			<>
				<Pane>
					<Message
						author="you"
						name="You"
						body="Why did the last deploy of api fail?"
						at={today("10:02")}
					/>
				</Pane>
				<Pane>
					<Message
						author="you"
						name="You"
						body="Open the migration, and hold the redeploy until I have read it. If the column is missing on staging too, tell me before you touch anything."
					/>
				</Pane>
				<Pane>
					<Message
						author="you"
						name="You"
						body="Read https://acme.dev/deploys/api/4f2c9a1e7b3d5f60a8c2e4b6d8f0a1c3e5b7d9f1a3c5e7b9d1f3a5c7e9b1d3f5"
					/>
				</Pane>
			</>
		);
	if (props.author === "other")
		return (
			<>
				<Pane>
					<Message
						author="other"
						name="Assistant"
						body={REPLY}
						at={today("10:03")}
					/>
				</Pane>
				<Pane>
					<Message
						author="other"
						body="Opened `0042_add_invoices`. The redeploy waits for you."
					/>
				</Pane>
			</>
		);
	return (
		<>
			<Pane>
				<Message
					author="system"
					body="Ada Lovelace joined the thread"
					at={today("10:02")}
				/>
			</Pane>
			<Pane>
				<Message
					author="system"
					body="The answer was cut short: the deploy log is longer than the assistant reads at once"
					at={today("10:06")}
				/>
			</Pane>
			<Pane>
				<Message
					author="system"
					body="Relayed https://acme.dev/deploys/api/4f2c9a1e7b3d5f60a8c2e4b6d8f0a1c3e5b7d9f1a3c5e7b9d1f3a5c7e9b1d3f5"
				/>
			</Pane>
			<Pane>
				<Message
					author="system"
					body="Relayed from #deploys"
					at={today("10:04")}
					onOpen={open}
				/>
			</Pane>
		</>
	);
}

// Board 53's message cells on a thread's pane: each author at rest, each
// loading; the pointer and focus states force the system line that opens,
// the one pressable form.
export function drawMessage(frame: ShowcaseFrame) {
	const author = authorOf(frame.cell.name);
	let drawn: ReactNode;
	if (frame.state === "loading")
		drawn = (
			<Pane>
				{author === "system" ? (
					<Message author="system" body="" loading />
				) : (
					<Message author={author} body="" loading />
				)}
			</Pane>
		);
	else if (frame.state === "rest") drawn = <Rest author={author} />;
	else
		drawn = (
			<Pane>
				<Message
					author="system"
					body="Relayed from #deploys"
					at={today("10:04")}
					onOpen={open}
				/>
			</Pane>
		);
	return <Wide>{drawn}</Wide>;
}
