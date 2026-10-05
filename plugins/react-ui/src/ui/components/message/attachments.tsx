import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import type { Attachment } from "@fcalell/ui-core/descriptors";
import {
	IMAGE_REMOVE,
	IMAGE_REMOVE_DISC,
	MESSAGE_ATTACHMENTS,
	REMOVE_HIT,
} from "@fcalell/ui-core/variants";
import type { RefObject } from "react";
import { useRef } from "react";
import { useWords } from "../../lib/words.tsx";
import { Chip } from "../chip/index.tsx";
import { Icon } from "../icon/index.tsx";
import { Image } from "../image/index.tsx";

// Items align to the start, so a chip keeps its own height beside a thumbnail.
const ROW = "flex flex-wrap items-start max-w-full";
const END = "justify-end";
const ITEM = "relative flex min-w-0";
// The remove act stands at the thumbnail's corner: its hit box centres the
// disc, and the washes of the pointer fill the disc.
const HIT =
	"group absolute top-0 end-0 flex items-center justify-center focus-visible:-outline-offset-2";
const DISC = "flex overflow-hidden";
const WASH =
	"flex grow items-center justify-center text-ink-meta group-hover:bg-wash-hover group-active:bg-wash-press";

// A message's attachments and a message input's, in one wrapping row. An
// attachment with `src` is an `Image` thumbnail, one without a chip of its
// name; each carries a remove act only when `onRemove` is given, and a removed
// one hands focus to the next attachment's remove act, else the previous
// one's, else `fallback`. Outside the package's exports.
export function Attachments(props: {
	attachments: readonly Attachment[];
	end?: boolean;
	onRemove?: (id: string) => void;
	fallback?: RefObject<HTMLElement | null>;
}) {
	const { attachments, end, onRemove, fallback } = props;
	const words = useWords();
	const row = useRef<HTMLDivElement>(null);
	// Each attachment's last button is its remove act: the open act of a
	// thumbnail comes first.
	const remove = (id: string, index: number) => {
		const items = row.current?.children;
		const near = items?.[index + 1] ?? items?.[index - 1];
		const next = [...(near?.querySelectorAll("button") ?? [])].at(-1);
		onRemove?.(id);
		(next ?? fallback?.current)?.focus();
	};
	return (
		<div ref={row} className={cn(MESSAGE_ATTACHMENTS, ROW, end && END)}>
			{attachments.map((attachment, index) => (
				<div key={attachment.id} className={ITEM}>
					{attachment.src ? (
						<>
							<Image src={attachment.src} alt={attachment.name} fit="thumb" />
							{onRemove ? (
								<BaseButton
									aria-label={`${words.remove} ${attachment.name}`}
									onClick={() => remove(attachment.id, index)}
									className={cn(IMAGE_REMOVE, HIT)}
								>
									<span className={cn(REMOVE_HIT, IMAGE_REMOVE_DISC, DISC)}>
										<span className={WASH}>
											<Icon name="X" fit="meta" />
										</span>
									</span>
								</BaseButton>
							) : null}
						</>
					) : (
						<Chip
							family="neutral"
							label={attachment.name}
							onRemove={onRemove && (() => remove(attachment.id, index))}
						/>
					)}
				</div>
			))}
		</div>
	);
}
