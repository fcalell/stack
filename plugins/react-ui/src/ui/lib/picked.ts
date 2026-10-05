import type { PickedFile } from "@fcalell/ui-core/descriptors";

export function pickedFrom(file: File): PickedFile {
	return {
		name: file.name,
		size: file.size,
		type: file.type,
		blob: () => Promise.resolve(file),
	};
}
