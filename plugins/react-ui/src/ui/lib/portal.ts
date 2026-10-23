import { createContext } from "react";

// Where a popup mounts. A root frame (the Shell, the Gate) names an element
// inside its `main`, so an open popup stands inside a landmark, not in the body
// beside them; a showcase stage names one inside the stage, and a popup there
// draws the stage's mode from its `.dark` class rather than the page's. Base
// UI's portal waits on a `null` container, so a provider names `null` until its
// element mounts; with no provider the container is `undefined` and the popup
// mounts in the body.
export const PortalContainer = createContext<HTMLElement | null | undefined>(
	undefined,
);

// Whether the container is a root frame's (the Shell, the Gate) and only
// places the popup. A sheet there is modal; one in a showcase stage (a
// container no frame hosts) stays beside the stage's others and hides and traps
// nothing outside it.
export const PortalHosted = createContext(false);

// How the frame's `main` hands its portal element to the frame host, which
// names it for every popup under it.
export const PortalSlot = createContext<(node: HTMLElement | null) => void>(
	() => {},
);
