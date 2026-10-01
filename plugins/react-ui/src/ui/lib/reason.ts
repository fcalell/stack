import { createContext } from "react";

// Where a blocked act's reason draws when not under the act: a molecule that
// keeps its row still (an ActionBar's acts, a Section's head) draws the
// reason on its own line and hands the act this host. The act describes
// itself by the host's `id` and calls `press` when pressed while blocked;
// the host shows the reason from then on, or once its form is touched.
export interface ReasonHost {
	id: string;
	press: () => void;
}

export const ReasonHostContext = createContext<ReasonHost | undefined>(
	undefined,
);
