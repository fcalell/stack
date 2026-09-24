// The style channels every component closes. Declared `?: never` so a call
// site gets a readable error and the roster check can read the closure off
// the props type.
export interface Closed {
	class?: never;
	className?: never;
	classList?: never;
	style?: never;
}
