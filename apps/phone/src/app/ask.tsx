import { FormField } from "@fcalell/plugin-native-ui/components/form-field";
import { Input } from "@fcalell/plugin-native-ui/components/input";
import { MessageInput } from "@fcalell/plugin-native-ui/components/message-input";
import { Place } from "@fcalell/plugin-native-ui/components/place";
import { Section } from "@fcalell/plugin-native-ui/components/section";
import { Thread } from "@fcalell/plugin-native-ui/components/thread";
import { toast } from "@fcalell/plugin-native-ui/lib/toast";
import { useEffect, useRef, useState } from "react";

interface Turn {
	id: string;
	author: "you" | "other";
	body: string;
	at: string;
}

const FIRST: Turn[] = [
	{
		id: "t1",
		author: "other",
		body: "Ask about anything on this device.",
		at: new Date().toISOString(),
	},
];

// A conversation that arrives after a moment, under a field typed into before
// it does: the field keeps its text as the conversation takes the page.
export default function Ask() {
	const [topic, setTopic] = useState("");
	const [turns, setTurns] = useState<Turn[]>();
	const [value, setValue] = useState("");
	const [working, setWorking] = useState(false);
	const answer = useRef<ReturnType<typeof setTimeout>>(undefined);
	useEffect(() => {
		const arrive = setTimeout(() => setTurns(FIRST), 3000);
		return () => {
			clearTimeout(arrive);
			clearTimeout(answer.current);
		};
	}, []);
	const say = (author: Turn["author"], body: string) =>
		setTurns((all = []) => [
			...all,
			{ id: `t${all.length + 1}`, author, body, at: new Date().toISOString() },
		]);
	const send = () => {
		say("you", value);
		setValue("");
		setWorking(true);
		answer.current = setTimeout(() => {
			say("other", `About ${topic || "that"}: nothing new since this morning.`);
			setWorking(false);
		}, 1600);
	};
	const stop = () => {
		clearTimeout(answer.current);
		setWorking(false);
		toast("Answer stopped");
	};
	return (
		<Place title="Ask">
			<Section title="Topic">
				<FormField label="Topic">
					<Input value={topic} onChange={setTopic} />
				</FormField>
			</Section>
			{turns ? (
				<Thread
					items={turns}
					message={{
						key: (turn) => turn.id,
						author: (turn) => turn.author,
						name: (turn) => (turn.author === "other" ? "Stack" : undefined),
						body: (turn) => turn.body,
						at: (turn) => turn.at,
					}}
					foot={
						<MessageInput
							value={value}
							onChange={setValue}
							placeholder="Ask about this device"
							working={working}
							onSend={send}
							onStop={stop}
						/>
					}
				/>
			) : null}
		</Place>
	);
}
