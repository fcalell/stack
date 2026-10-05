import type { PickedFile } from "@fcalell/ui-core/descriptors";

// An image's `src` is an object URL made here. Nothing in the package knows
// when the consumer is done showing the file, so the consumer revokes it
// (`URL.revokeObjectURL(file.src)`) once it drops the attachment.
export function pickedFrom(file: File): PickedFile {
	return {
		name: file.name,
		size: file.size,
		type: file.type,
		blob: () => Promise.resolve(file),
		...(file.type.startsWith("image/") && { src: URL.createObjectURL(file) }),
	};
}
