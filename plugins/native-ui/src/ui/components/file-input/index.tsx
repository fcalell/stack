import type { PickedFile } from "@fcalell/ui-core/descriptors";
import { accepts, kindsOf, pickerTypes } from "@fcalell/ui-core/file";
import { formatterFor } from "@fcalell/ui-core/format";
import { filled } from "@fcalell/ui-core/tokens";
import {
	FIELD_PLACEHOLDER,
	field,
	fieldValue,
	text,
} from "@fcalell/ui-core/variants";
import * as DocumentPicker from "expo-document-picker";
import { useContext } from "react";
import { Pressable, Text as RNText } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import {
	FieldDisabled,
	FieldError,
	FieldRefusal,
	useFieldName,
} from "../../lib/field";
import { Ink } from "../../lib/ink";
import { pickedFromDocument } from "../../lib/picked";
import { useTouched } from "../../lib/touched";
import { useWords } from "../../lib/words";
import { Icon } from "../icon";
import { IconButton } from "../icon-button";

const BYTES = {
	style: "unit",
	unit: "byte",
	notation: "compact",
	unitDisplay: "short",
} as const;

export interface FileInputProps extends Closed {
	value: PickedFile | null;
	onChange: (file: PickedFile | null) => void;
	accept: readonly string[];
}

// A field box that is the act: a press anywhere in it opens the system's
// document picker, which names MIME types alone, so a type `accept` spells as
// an extension is checked on the file picked. Empty it reads Choose file,
// chosen it shows the file's name and size with an act that removes it. A file
// of another type is refused into its `FormField`'s error line and never
// reaches `onChange`; the line clears on the next pick. The phone has no drop.
// `edge-error` when its `FormField` is in error, the disabled fill when its
// field is disabled.
export function FileInput({ value, onChange, accept }: FileInputProps) {
	const words = useWords();
	const { touch } = useTouched();
	const name = useFieldName();
	const error = useContext(FieldError);
	const disabled = useContext(FieldDisabled);
	const refuse = useContext(FieldRefusal);
	const choose = async () => {
		const result = await DocumentPicker.getDocumentAsync({
			type: pickerTypes(accept),
		});
		const asset = result.canceled ? undefined : result.assets[0];
		if (!asset) return;
		touch();
		const file = pickedFromDocument(asset);
		if (!accepts(file, accept)) {
			refuse?.(
				filled(words.wrongType, {
					name: file.name,
					types: kindsOf(accept, words).join(", "),
				}),
			);
			return;
		}
		refuse?.(undefined);
		onChange(file);
	};
	const ink = disabled ? "ink-disabled" : "ink-meta";
	return (
		<Pressable
			accessible={false}
			disabled={disabled}
			onPress={choose}
			className={cn(
				field({
					trailing: value ? "act" : "none",
					state: error ? "error" : "rest",
				}),
				"flex-row items-center",
				disabled && "bg-fill-disabled",
			)}
		>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={name}
				accessibilityValue={{ text: value?.name ?? words.chooseFile }}
				accessibilityState={{ disabled }}
				disabled={disabled}
				onPress={choose}
				className="flex-1 flex-row items-center gap-inside min-w-0"
			>
				<Ink.Provider value={ink}>
					<Icon name={value ? "File" : "FileUp"} fit="control" />
				</Ink.Provider>
				<RNText
					numberOfLines={1}
					className={cn(
						fieldValue({ kind: "text" }),
						!value && FIELD_PLACEHOLDER,
						"flex-1",
						disabled && "text-ink-disabled",
					)}
				>
					{value ? value.name : words.chooseFile}
				</RNText>
				{value ? (
					<RNText
						className={cn(
							text({ role: "meta" }),
							disabled && "text-ink-disabled",
						)}
					>
						{formatterFor("number", undefined, BYTES).format(value.size)}
					</RNText>
				) : null}
			</Pressable>
			{value ? (
				<IconButton
					icon="X"
					label={`${words.remove} ${value.name}`}
					onAct={() => {
						touch();
						refuse?.(undefined);
						onChange(null);
					}}
					fit="field"
				/>
			) : null}
		</Pressable>
	);
}
