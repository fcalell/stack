import { createContext } from "react";

// Where a blocked act's reason draws when not under the act: a molecule that
// keeps its row still (a sheet's head, an action bar, a pending bar) draws
// the reason on its own line and hands the act this host, so the act stands
// alone and stretches as a live one does. The act calls the host when
// pressed while blocked; the host shows the reason from then on, or once its
// form or sheet is touched.
export interface ReasonHost {
	press: () => void;
}

export const ReasonHostContext = createContext<ReasonHost | undefined>(
	undefined,
);
