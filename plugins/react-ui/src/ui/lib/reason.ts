import { pressStands } from "@fcalell/ui-core/reason";
import { createContext, useCallback, useState } from "react";

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
