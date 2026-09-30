import { createContext } from "react";

// Where a popup mounts: the body, unless a surface that scopes its own mode
// (a showcase frame) names an element inside it, so the popup draws that
// surface's mode rather than the page's. Base UI's portal waits on a `null`
// container, so a surface names `null` until its element mounts; with no
// provider the container is `undefined` and the popup mounts in the body.
export const PortalContainer = createContext<HTMLElement | null | undefined>(
	undefined,
);
