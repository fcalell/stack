import { createContext } from "react";

// Where a popup mounts. An app's popups mount in the body (Base UI's default),
// so only a showcase stage provides this: it names an element inside the stage,
// and a popup there draws the stage's mode from its `.dark` class rather than
// the page's. Base UI's portal waits on a `null` container, so the stage names
// `null` until its element mounts; with no provider the container is
// `undefined` and the popup mounts in the body.
export const PortalContainer = createContext<HTMLElement | null | undefined>(
	undefined,
);
