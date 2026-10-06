import { createContext } from "react";

// Where a popup mounts: a frame's popup layer, inside its main landmark (the
// Shell's, the Gate's: `FrameHost` names it); or a surface that scopes its own
// mode (a showcase frame) names an element inside it, so the popup draws that
// surface's mode rather than the page's. Base UI's portal waits on a `null`
// container, so a provider names `null` until its element mounts; with no
// provider the container is `undefined` and the popup mounts in the body,
// outside every landmark.
export const PortalContainer = createContext<HTMLElement | null | undefined>(
	undefined,
);
