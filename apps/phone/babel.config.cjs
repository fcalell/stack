// Babel must live at the project root for Metro to find it. babel-preset-expo
// includes the expo-router require.context transform used by .stack/entry.tsx.
module.exports = (api) => {
	api.cache(true);
	return {
		presets: ["babel-preset-expo"],
	};
};
