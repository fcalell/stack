import type { PickedFile } from "@fcalell/ui-core/descriptors";

export function pickedFrom(file: File): PickedFile {
	return {
		name: file.name,
		size: file.size,
		type: file.type,
		blob: () => Promise.resolve(file),
	};
}

// A file attached to a message: an image also carries `src`, an object URL
// made here for its thumbnail. Nothing in the package knows when the consumer
// is done showing it, so the consumer revokes it
// (`URL.revokeObjectURL(file.src)`) once it drops the attachment.
export function attachedFrom(file: File): PickedFile {
	return {
		...pickedFrom(file),
		...(file.type.startsWith("image/") && { src: URL.createObjectURL(file) }),
	};
}
