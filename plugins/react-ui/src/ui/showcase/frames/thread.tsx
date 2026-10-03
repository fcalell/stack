import { useState } from "react";
import { Message } from "../../components/message/index.tsx";
import { MessageInput } from "../../components/message-input/index.tsx";
import { Thread } from "../../components/thread/index.tsx";
import { REPLY, today } from "./message.tsx";

const act = () => {};

// Board 53's thread in a Place body (the Place's frame is context): system
// lines, yours and the assistant's replies, the input in the foot with its
// notice, the answer still working.
export function drawThread() {
	return <Conversation />;
}

function Conversation() {
	const [value, setValue] = useState("");
	const [working, setWorking] = useState(true);
	return (
		<div className="flex flex-col w-screen max-w-full overflow-hidden rounded-card border border-edge bg-surface">
			<div className="flex flex-col gap-sections p-page">
				<Thread
					foot={
						<MessageInput
							value={value}
							onChange={setValue}
							onAttach={act}
							placeholder="Ask about this deploy"
							notice={{
								sentence: "12 of 50 answers left this month.",
								act: { label: "Upgrade", onAct: act },
							}}
							working={working}
							onSend={() => {
								setValue("");
								setWorking(true);
							}}
							onStop={() => setWorking(false)}
						/>
					}
				>
					<Message
						author="system"
						body="Thread started from the failed deploy of api"
						at={today("10:02")}
					/>
					<Message
						author="you"
						name="You"
						body="Why did the last deploy of api fail?"
						at={today("10:02")}
					/>
					<Message
						author="other"
						name="Assistant"
						body={`${REPLY} I can open the migration for you.`}
						at={today("10:03")}
					/>
					<Message
						author="system"
						body="Relayed from #deploys"
						at={today("10:04")}
						onOpen={act}
					/>
					<Message
						author="you"
						name="You"
						body="Open it, and hold the redeploy until I have read it."
						at={today("10:05")}
					/>
					<Message
						author="other"
						name="Assistant"
						body="Opened `0042_add_invoices`. The redeploy waits for you."
						at={today("10:05")}
					/>
				</Thread>
			</div>
		</div>
	);
}
