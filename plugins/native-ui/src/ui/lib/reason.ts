import { pressStands } from "@fcalell/ui-core/reason";
import { createContext, useCallback, useState } from "react";

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

// The host of a bar that draws its blocked acts' reasons at rest on its own
// line: a press has nothing to show.
export const REASON_AT_REST: ReasonHost = { press: () => {} };

// A blocked act's press (`@fcalell/ui-core/reason`): whether it stands under
// `blocked`, and the press that keeps it. Unblocking or a new reason forgets
// it in render.
export function usePressed(
	blocked: string | undefined,
): [pressed: boolean, press: () => void] {
	const [under, setUnder] = useState<string>();
	const press = useCallback(() => setUnder(blocked), [blocked]);
	return [pressStands(blocked, under), press];
}

// Set around a docked foot's act bar: a blocked act's reason keeps its line
// before it shows, so showing it never moves the act it describes.
export const ReasonKept = createContext(false);

// Set around a sheet's submit bar: the sentence the act's last run failed
// with, drawn in the line the reason uses (the one a kept bar holds) under
// the act, so a failure never moves the act either. A blocked act's reason
// stands before it.
export const ActFailed = createContext<string | undefined>(undefined);
