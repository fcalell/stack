// A field that opens for editing in place of what the viewer read ends its text
// under the caret; a programmatic focus leaves a textarea's at the start. A
// type with no selection (`email`, `number`) reports a null `selectionStart`.
export function caretAtEnd(
	field: HTMLInputElement | HTMLTextAreaElement | null,
) {
	if (field?.selectionStart == null) return;
	field.setSelectionRange(field.value.length, field.value.length);
}
