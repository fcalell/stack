import type { Attachment } from "@fcalell/ui-core/descriptors";
import { IMAGE_REMOVE, MESSAGE_ATTACHMENTS } from "@fcalell/ui-core/variants";
import { memo, type RefObject, useRef } from "react";
import type { TextInput } from "react-native";
import { AccessibilityInfo, Pressable, View } from "react-native";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { useWords } from "../../lib/words";
import { Chip } from "../chip";
import { Icon } from "../icon";
import { Image } from "../image";

const ROW = "flex-row flex-wrap max-w-full";
const END = "justify-end";
const ITEM = "min-w-0";
// The disc stands at the thumbnail's corner; its press fills it.
const DISC =
	"absolute top-0 right-0 items-center justify-center active:bg-wash-press";

interface ItemHooks {
	ref: (node: View | null) => void;
	remove: () => void;
}

// One attachment, which renders again only when its name, its address or its
// removability changes.
const Item = memo(function Item({
	name,
	src,
	hooks,
	removable,
}: {
	name: string;
	src?: string;
	hooks: ItemHooks;
	removable: boolean;
}) {
	const words = useWords();
	if (!src)
		return (
			<Chip
				ref={hooks.ref}
				family="neutral"
				label={name}
				onRemove={removable ? hooks.remove : undefined}
			/>
		);
	return (
		<View className={ITEM}>
			<Image src={src} alt={name} fit="thumb" />
			{removable ? (
				<Pressable
					ref={hooks.ref}
					accessibilityRole="button"
					accessibilityLabel={`${words.remove} ${name}`}
					onPress={hooks.remove}
					className={cn(IMAGE_REMOVE, DISC)}
				>
					<Ink.Provider value="ink-meta">
						<Icon name="X" fit="meta" />
					</Ink.Provider>
				</Pressable>
			) : null}
		</View>
	);
});

// A message's attachments and a message input's, in one wrapping row. An
// attachment with `src` is an `Image` thumbnail, one without a chip of its
// name; each carries a remove act only when `onRemove` is given, and a removed
// one hands the screen reader's focus to the next attachment's remove act,
// else the previous one's, else `fallback`, without raising the keyboard.
// Outside the package's exports.
export function Attachments(props: {
	attachments: readonly Attachment[];
	end?: boolean;
	onRemove?: (id: string) => void;
	fallback?: RefObject<TextInput | null>;
}) {
	const { attachments, end, onRemove, fallback } = props;
	// Each remove act, by attachment id.
	const removes = useRef(new Map<string, View>());
	const remove = (id: string) => {
		const ids = attachments.map((attachment) => attachment.id);
		const index = ids.indexOf(id);
		const near = ids[index + 1] ?? ids[index - 1];
		const next = near === undefined ? undefined : removes.current.get(near);
		onRemove?.(id);
		const to = next ?? fallback?.current;
		if (to) AccessibilityInfo.sendAccessibilityEvent(to, "focus");
	};
	// One ref and one remove per attachment id, kept across renders, so a
	// keystroke re-renders no attachment; the remove reads the latest list.
	const latest = useRef(remove);
	latest.current = remove;
	const hooks = useRef(new Map<string, ItemHooks>());
	const hooksOf = (id: string): ItemHooks => {
		const known = hooks.current.get(id);
		if (known) return known;
		const made: ItemHooks = {
			ref: (node) => {
				if (node) removes.current.set(id, node);
				else {
					removes.current.delete(id);
					hooks.current.delete(id);
				}
			},
			remove: () => latest.current(id),
		};
		hooks.current.set(id, made);
		return made;
	};
	return (
		<View className={cn(MESSAGE_ATTACHMENTS, ROW, end && END)}>
			{attachments.map((attachment) => (
				<Item
					key={attachment.id}
					name={attachment.name}
					src={attachment.src}
					hooks={hooksOf(attachment.id)}
					removable={onRemove !== undefined}
				/>
			))}
		</View>
	);
}
