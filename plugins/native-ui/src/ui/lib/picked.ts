import type { PickedFile } from "@fcalell/ui-core/descriptors";
import type { DocumentPickerAsset } from "expo-document-picker";
import type { ImagePickerAsset } from "expo-image-picker";

export function pickedFromDocument(asset: DocumentPickerAsset): PickedFile {
	return {
		name: asset.name,
		size: asset.size ?? 0,
		type: asset.mimeType ?? "",
		blob: () => fetch(asset.uri).then((response) => response.blob()),
	};
}

// The photo library names a photo by its file when it knows the name, else by
// the last segment of its address.
export function pickedFromImage(asset: ImagePickerAsset): PickedFile {
	return {
		name: asset.fileName ?? asset.uri.split("/").pop() ?? asset.uri,
		size: asset.fileSize ?? 0,
		type: asset.mimeType ?? "",
		blob: () => fetch(asset.uri).then((response) => response.blob()),
	};
}
