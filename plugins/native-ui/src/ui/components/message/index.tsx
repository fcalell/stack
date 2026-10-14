import type {
	Attachment,
	MessageDetail,
	Part,
} from "@fcalell/ui-core/descriptors";
import type { Closed } from "../../lib/closed";
import { MessageBase } from "./base";

interface MessageFields extends Closed {
	/** What was said (text; wraps): plain text for `you` and `system`, markdown for `other`. */
	body: string;
	// When it was said, an ISO moment: drawn as the time today, else the date
	// and time.
	at?: string;
}

export type MessageProps =
	| (MessageFields & {
			author: "you" | "other";
			/** Who said it: drawn over `other`'s reply; yours draws none (a short phrase; wraps). */
			name?: string;
			// What came with it, one row over the bubble (yours at the column's
			// end) or the reply: an attachment with `src` a thumbnail that opens
			// full size, one without a chip of its name.
			attachments?: readonly Attachment[];
			/** Where it came from ("by voice", "Kitchen"), joined by a middle dot before the time (each a short phrase; the line wraps at its dots). */
			meta?: readonly Part[];
			/** The reply is still arriving: a marker left open at its end (an emphasis, a strong run, a code span, a link, a fence) is drawn in its own form from its first character, and its closing marker changes nothing already drawn; unset or `false`, an unmatched marker is text. Yours is always whole. */
			streaming?: boolean;
			onOpen?: never;
			detail?: never;
	  })
	| (MessageFields & {
			author: "system";
			// Opens what the line names: the line becomes the act, a chevron
			// after it.
			onOpen?: () => void;
			// What stands under the line, one of three: a row in a hairline card
			// that opens its record, a free act's arguments in the code role, or
			// lines the line opens in place (it takes no `onOpen` then).
			detail?: MessageDetail;
			name?: never;
			streaming?: never;
			attachments?: never;
			meta?: never;
	  });

// Yours a bubble on the group ground at the column's end, its attachments in
// one row over it, its provenance line and the time under it;
// another's the name at body 500 beside the provenance and the time over its
// attachments and the reply as Prose; a
// system line one meta line centred in a row at the target height, its time
// beside it.
export function Message(message: MessageProps) {
	return <MessageBase {...message} />;
}
