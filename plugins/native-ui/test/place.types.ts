import type { PlaceProps } from "../src/ui/components/place/index.tsx";

const act = () => {};

// a Place docks a field as its `foot`
{
	const home: PlaceProps = { title: "Home", foot: "an ask field" };
	void home;
}

// a Place takes its filled act or a foot, never both
{
	const acting: PlaceProps = {
		title: "Deploys",
		act: { label: "Deploy", onAct: act },
	};
	// @ts-expect-error: the foot's send is the screen's one filled act
	const both: PlaceProps = {
		title: "Home",
		act: { label: "New", onAct: act },
		foot: "an ask field",
	};
	void [acting, both];
}

// a Place read from across a room holds nothing that opens a layer
{
	const room: PlaceProps = { title: "Deploys", distance: "room" };
	// @ts-expect-error: a context's picker opens outside the room scope
	const picked: PlaceProps = {
		title: "Deploys",
		distance: "room",
		context: { label: "Set", options: [], onChange: act },
	};
	void [room, picked];
}
