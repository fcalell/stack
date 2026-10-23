import { bindRouter } from "@fcalell/plugin-react-ui/lib/navigate";

type Bound = Parameters<typeof bindRouter>[0];

// The router a story builds, handed over as the generated entry hands over the
// app's: `bindRouter` takes the slice of it that routing in place needs, which
// a router typed by its own route tree does not match call for call (its
// `navigate` requires a `to`).
export function bind(router: unknown): void {
	bindRouter(router as Bound);
}
