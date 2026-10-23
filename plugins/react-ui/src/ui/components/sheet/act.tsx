import { isThenable } from "@fcalell/plugin-api/acts";
import type { Acting, ActSheetProps } from "../../lib/act.ts";
import { Sheet } from "./index.tsx";

/** The sheet an act of its holder opened: drawn by the holder beside the control that drew the act, open from the press until it is dismissed or its `submit` has resolved. The holder keeps only the open state: `of` answers the opened act's *current* `sheet` (the holder draws it again with its act), so the sheet follows what the act holds now, not what it held at the press. Outside the package's exports: a holder that runs acts draws it. */
export function ActSheet<K>({
	acting,
	of,
}: {
	acting: Acting<K>;
	of: (key: K) => ActSheetProps | undefined;
}) {
	const opened = acting.sheet;
	const props = opened && of(opened.key);
	if (!(opened && props)) return null;
	const { open, close } = opened;
	const { submit, form } = props;
	return (
		<Sheet
			{...props}
			open={open}
			onClose={close}
			form={
				form && {
					...form,
					// Closing is the form's resolution too.
					onDone: (output: unknown, input: unknown) => {
						// The procedure is forgotten here, so its input types as `never`.
						(
							form.onDone as
								| ((output: unknown, input: unknown) => void)
								| undefined
						)?.(output, input);
						close();
					},
				}
			}
			submit={
				submit?.onAct
					? {
							...submit,
							// Closing is the submit's resolution; its confirm, done and to stand.
							onAct: () => {
								const ran = submit.onAct?.();
								if (!isThenable(ran)) {
									close();
									return ran;
								}
								return Promise.resolve(ran).then((value) => {
									close();
									return value;
								});
							},
						}
					: submit
			}
		/>
	);
}
