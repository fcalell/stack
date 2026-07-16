import * as Application from "expo-application";
import { Platform } from "react-native";
import {
	CLIENT_BUILD_HEADER,
	CLIENT_PLATFORM_HEADER,
} from "../version-gate-shared";

// `Application.nativeBuildVersion` reads the compiled binary's build number
// (iOS `CFBundleVersion` / Android `versionCode`) directly off the native
// module at runtime. This differs from `expo-constants`'s `expoConfig`,
// which reflects the app config the JS bundle shipped with and can drift
// from what the store build actually is. `null` on web and whenever the
// native module can't resolve it (e.g. Expo Go on some platforms).
function currentPlatform(): "ios" | "android" | null {
	return Platform.OS === "ios" || Platform.OS === "android"
		? Platform.OS
		: null;
}

// The wire contract's two headers, or `{}` when the build number/platform
// can't be read. Never throws: the server-side gate fails open on missing
// headers by design (WS4), so an undetectable
// build degrades to "unwalled" rather than breaking every request.
export function versionHeaders(): Record<string, string> {
	const build = Application.nativeBuildVersion;
	const platform = currentPlatform();
	if (!build || !platform) return {};
	return {
		[CLIENT_BUILD_HEADER]: build,
		[CLIENT_PLATFORM_HEADER]: platform,
	};
}

const updateRequiredSubscribers = new Set<() => void>();

// Subscribes to the 426 update-wall signal raised by
// `createVersionGatedFetch`. Returns an unsubscribe function. Rendering the
// wall itself (a screen, a modal) is app/native-ui territory; this module
// only carries the signal.
export function onUpdateRequired(cb: () => void): () => void {
	updateRequiredSubscribers.add(cb);
	return () => updateRequiredSubscribers.delete(cb);
}

function notifyUpdateRequired(): void {
	for (const cb of updateRequiredSubscribers) cb();
}

// Wraps `fetch` (defaulting to the global) to stamp the version headers on
// every request and translate a 426 response into the update-wall signal.
// `input` may already be a `Request` carrying its own headers (the oRPC link
// used by `@fcalell/plugin-api/client` constructs one), so this merges
// rather than replaces, keeping Content-Type and any caller-supplied
// headers intact.
export function createVersionGatedFetch(
	base: typeof fetch = fetch,
): typeof fetch {
	return async (input, init) => {
		const headers = new Headers(
			input instanceof Request ? input.headers : undefined,
		);
		if (init?.headers) {
			for (const [key, value] of new Headers(init.headers)) {
				headers.set(key, value);
			}
		}
		for (const [key, value] of Object.entries(versionHeaders())) {
			headers.set(key, value);
		}
		const response = await base(input, { ...init, headers });
		if (response.status === 426) notifyUpdateRequired();
		return response;
	};
}
