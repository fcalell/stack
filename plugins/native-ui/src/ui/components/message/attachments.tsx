import type { Attachment } from "@fcalell/ui-core/descriptors";
import {
	IMAGE_REMOVE,
	IMAGE_REMOVE_DISC,
	MESSAGE_ATTACHMENTS,
	REMOVE_HIT,
} from "@fcalell/ui-core/variants";
import { memo, useRef } from "react";
import { Pressable, View } from "react-native";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { useWords } from "../../lib/words";
import { Chip } from "../chip";
import { Icon } from "../icon";
import { Image } from "../image";

// Items align to the start, so a chip keeps its own height beside a thumbnail.
const ROW = "flex-row flex-wrap items-start max-w-full";
const END = "justify-end";
const ITEM = "min-w-0";
// The remove act stands at the thumbnail's corner: its hit box centres the
// disc, and its press washes the hit box.
const HIT =
	"absolute top-0 right-0 items-center justify-center active:bg-wash-press";
const DISC = "items-center justify-center overflow-hidden";

// One attachment, which renders again only when its name, its address or its
// removability changes.
const Item = memo(function Item({
	name,
	src,
	remove,
}: {
	name: string;
	src?: string;
	remove?: () => void;
}) {
	const words = useWords();
	if (!src) return <Chip family="neutral" label={name} onRemove={remove} />;
	return (
		<View className={ITEM}>
			<Image src={src} alt={name} fit="thumb" />
			{remove ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={`${words.remove} ${name}`}
					onPress={remove}
					className={cn(IMAGE_REMOVE, HIT)}
				>
					<View className={cn(REMOVE_HIT, IMAGE_REMOVE_DISC, DISC)}>
						<Ink.Provider value="ink-meta">
							<Icon name="X" fit="meta" />
						</Ink.Provider>
					</View>
				</Pressable>
			) : null}
		</View>
	);
});

// A message's attachments and a message input's, in one wrapping row. An
// attachment with `src` is an `Image` thumbnail, one without a chip of its
// name; each carries a remove act only when `onRemove` is given.
// Outside the package's exports.
export function Attachments(props: {
	attachments: readonly Attachment[];
	end?: boolean;
	onRemove?: (id: string) => void;
}) {
	const { attachments, end, onRemove } = props;
	// One remove per attachment id, kept across renders while the attachment
	// stands, so a keystroke re-renders no attachment; it reads the latest
	// `onRemove`.
	const latest = useRef(onRemove);
	latest.current = onRemove;
	const removes = useRef(new Map<string, () => void>());
	removes.current = new Map(
		attachments.map(({ id }) => [
			id,
			removes.current.get(id) ?? (() => latest.current?.(id)),
		]),
	);
	return (
		<View className={cn(MESSAGE_ATTACHMENTS, ROW, end && END)}>
			{attachments.map((attachment) => (
				<Item
					key={attachment.id}
					name={attachment.name}
					src={attachment.src}
					remove={onRemove ? removes.current.get(attachment.id) : undefined}
				/>
			))}
		</View>
	);
}
