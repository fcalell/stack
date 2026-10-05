import { createContext, useState } from "react";

// Where a popup mounts: a frame's popup layer, inside its main landmark (the
// Shell's, the AuthColumn's); or a surface that scopes its own mode (a
// showcase frame) names an element inside it, so the popup draws that
// surface's mode rather than the page's. Base UI's portal waits on a `null`
// container, so a provider names `null` until its element mounts; with no
// provider the container is `undefined` and the popup mounts in the body,
// outside every landmark.
export const PortalContainer = createContext<HTMLElement | null | undefined>(
	undefined,
);

// A frame's popup layer, the one piece the Shell and the AuthColumn share:
// provide `layer` as the `PortalContainer` around the frame and draw
// `<div ref={layerRef} />` last inside its `main`.
export function usePopupLayer() {
	return useState<HTMLElement | null>(null);
}
