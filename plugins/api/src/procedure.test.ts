import assert from "node:assert/strict";
import { test } from "node:test";
import { scopeWords } from "./procedure.ts";

test("a scope's name reads as lower-case words", () => {
	assert.equal(scopeWords("project"), "project");
	assert.equal(scopeWords("dataFlow"), "data flow");
	assert.equal(scopeWords("data_flow"), "data flow");
	assert.equal(scopeWords("DataFlow"), "data flow");
	assert.equal(scopeWords("apiKeyV2"), "api key v2");
	assert.equal(scopeWords("HTTPServer"), "http server");
});
