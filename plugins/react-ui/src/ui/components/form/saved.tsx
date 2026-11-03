import { cn } from "@fcalell/ui-core/cn";
import { filled } from "@fcalell/ui-core/tokens";
import { text } from "@fcalell/ui-core/variants";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";

const LINE = "flex min-w-0 grow items-center gap-gap";
const SAID = "min-w-0 grow truncate";

/** What a saved secret draws in its field: that it is saved and how it ends, in the meta ink, with a quiet Replace and a quiet Remove that asks first. The value is never read back, so no mask stands in for it. Outside the package's exports: a `Form` draws it for a saved `secret`. */
export function SavedSecret(props: {
	/** The saved value's last characters, as the server sends them. */
	tail: string;
	/** The field's label, which names the acts and the decision. */
	label: string;
	onReplace: () => void;
	onRemove: () => Promise<unknown>;
}) {
	const words = useWords();
	const { tail, label, onReplace, onRemove } = props;
	return (
		<div className={LINE}>
			<span className={cn(text({ role: "meta" }), SAID)}>
				{filled(words.savedEndsIn, { tail })}
			</span>
			<Button act="quiet" label={words.replace} onAct={onReplace} />
			<Button
				act="quiet"
				label={words.remove}
				confirm={{
					title: `${words.remove} ${label}`,
					sentence: words.removeSecret,
				}}
				done={words.removed}
				onAct={onRemove}
			/>
		</div>
	);
}
