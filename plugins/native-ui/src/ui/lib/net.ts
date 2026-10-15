import type { QueryListeners } from "@fcalell/plugin-api/tanstack-query";
import { addNetworkStateListener } from "expo-network";
import { AppState } from "react-native";

// What TanStack's managers listen to on the phone, which has no window events:
// without it a read never pauses offline and never refetches on return.
// `isInternetReachable` is unknown (`undefined`) until the OS has probed, and
// only `false` is offline; a link with no reachability answer is taken as up.
export const listen: QueryListeners = {
	online: (set) => {
		const subscription = addNetworkStateListener((state) => {
			set(state.isConnected !== false && state.isInternetReachable !== false);
		});
		return () => subscription.remove();
	},
	// Foreground is `active`; `inactive` (iOS's app switcher) and `background`
	// are not.
	focus: (set) => {
		const subscription = AppState.addEventListener("change", (status) => {
			set(status === "active");
		});
		return () => subscription.remove();
	},
};
