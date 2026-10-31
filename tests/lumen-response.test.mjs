import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Console, Storage } from "@nsnanocat/util";
import { Response } from "../src/process/Response.lumen.dev.mjs";

const fixtures = JSON.parse(readFileSync(new URL("fixtures/lumen-resources.json", import.meta.url)));
Console.logLevel = "OFF";

async function replay(t, path, body, origin = "https://www.lumen.ax/api/appletv/v1") {
	t.mock.method(Storage, "getItem", () => ({}));
	const response = { status: 200, headers: { "Content-Type": "application/json;charset=utf-8" }, body: JSON.stringify(body) };
	const result = await Response({ url: `${origin}${path}?pfm=iphone&sf=143470&v=101`, headers: {}, $argument: "LogLevel=OFF" }, response);
	assert.equal(result, response);
	return JSON.parse(result.body);
}

for (const path of ["/uts/v3/canvases/Channels/tvs.sbd.lumen", "/uts/v3/canvases/Rooms/edt.item.lumen"]) {
	test(`Lumen ${path}: repairs header hierarchy and reuses the complete Brand`, async t => {
		const actual = await replay(t, path, fixtures.channel);
		const [hero, row] = actual.data.canvas.shelves;
		assert.equal(row.header.title, row.title);
		assert.equal(row.header.supportsSeeAllView, true);
		assert.equal(row.header.url, row.url.replace("/collection/", "/shelf/"));
		assert.equal(hero.header.entityType, "Brand");
		assert.deepEqual(hero.header.entity, actual.data.channels["tvs.sbd.lumen"]);
		assert.equal(hero.header.title, "Lumen");
		assert.equal(hero.header.supportsSeeAllView, false);
		assert.equal(hero.header.url, actual.data.channels["tvs.sbd.lumen"].url);
		assert.deepEqual(hero.header.images.headerImage, actual.data.channels["tvs.sbd.lumen"].images.appIcon);
		assert.deepEqual(actual.data.channels, fixtures.channel.data.channels);
		for (const [index, shelf] of actual.data.canvas.shelves.entries()) {
			const { header, ...unchanged } = shelf;
			assert.deepEqual(unchanged, fixtures.channel.data.canvas.shelves[index]);
		}
		assert.deepEqual(await replay(t, path, actual), actual);
	});
}

test("independent Lumen shelf preserves pagination, items and existing header fields", async t => {
	const shelf = { ...structuredClone(fixtures.channel.data.canvas.shelves[1]), nextToken: "page-two", header: { title: "Existing title", supportsSeeAllView: false, url: "https://tv.apple.com/tw/shelf/existing/edt.col.lumen-lib-284", custom: true } };
	const body = { data: { shelf } };
	assert.deepEqual(await replay(t, "/uts/v3/shelves/edt.col.lumen-lib-284", body), body);
	delete shelf.header;
	const actual = await replay(t, "/uts/v3/shelves/edt.col.lumen-lib-284", body);
	assert.equal(actual.data.shelf.header.title, shelf.title);
	assert.equal(actual.data.shelf.nextToken, "page-two");
	assert.deepEqual(actual.data.shelf.items, shelf.items);
});

test("hero preserves existing header metadata and uses the backend Brand without changing flags or host IDs", async t => {
	const body = structuredClone(fixtures.channel);
	body.data.canvas.shelves[0].header = { title: "Existing hero", supportsSeeAllView: false, url: "https://tv.apple.com/tw/channel/existing/tvs.sbd.lumen", images: { headerImage: { url: "https://images.example.test/custom.png" }, extra: true }, custom: true };
	const actual = await replay(t, "/uts/v3/canvases/Channels/tvs.sbd.lumen", body);
	const { entityType, entity, ...header } = actual.data.canvas.shelves[0].header;
	assert.deepEqual(header, body.data.canvas.shelves[0].header);
	assert.deepEqual(entity, body.data.channels["tvs.sbd.lumen"]);
	assert.equal(entityType, "Brand");
});

test("movie adds official section markers while preserving content, playback, channels and the canvas URL", async t => {
	const path = "/uts/v3/movies/umc.cmc.lumen1580066";
	const actual = await replay(t, path, fixtures.movie);
	assert.deepEqual(actual.data.canvas.shelves, [{ id: "uts.marker.HowToWatch" }, { id: "uts.marker.About" }, { id: "uts.marker.Info" }]);
	const withoutMarkers = structuredClone(actual);
	withoutMarkers.data.canvas.shelves = [];
	assert.deepEqual(withoutMarkers, fixtures.movie);
	assert.deepEqual(await replay(t, path, actual), actual);
});

test("movie keeps existing rows and markers and only adds sections backed by data", async t => {
	const body = structuredClone(fixtures.movie);
	body.data.canvas.shelves.push({ id: "uts.col.Trailers.example", displayType: "lockup", items: [{ id: "trailer" }] }, { id: "uts.marker.Info", custom: true });
	body.data.howToWatch = [];
	delete body.data.content.description;
	assert.deepEqual(await replay(t, "/uts/v3/movies/umc.cmc.lumen1580066", body), body);
	delete body.data.canvas.shelves;
	const actual = await replay(t, "/uts/v3/movies/umc.cmc.lumen1580066", body);
	assert.deepEqual(actual.data.canvas.shelves, [{ id: "uts.marker.Info" }]);
});

for (const [path, body, origin] of [
	["/uts/v3/movies/umc.cmc.lumen1580066", { error: { code: 404 } }, undefined],
	["/uts/v3/shelves/edt.col.lumen-missing", { error: { code: 404 } }, undefined],
	["/uts/v3/canvases/Channels/tvs.sbd.lumen", { data: {} }, undefined],
	["/uts/v3/canvases/Roots/tahoma_searchlanding", fixtures.channel, undefined],
	["/uts/v3/shows/umc.cmc.lumen1580066", fixtures.movie, undefined],
	["/uts/v2/movies/umc.cmc.lumen1580066", fixtures.movie, undefined],
	["/uts/v3/movies/umc.cmc.lumen1580066", fixtures.movie, "https://uts-api.itunes.apple.com"],
	["/uts/v3/movies/umc.cmc.lumen1580066", fixtures.movie, "https://example.test/api/appletv/v1"],
]) {
	test(`unmatched or error response remains unchanged: ${origin ?? "Lumen"}${path}`, async t => {
		assert.deepEqual(await replay(t, path, body, origin), body);
	});
}

test("missing Brand does not create a fake hero entity, and unknown display types remain unchanged", async t => {
	const body = structuredClone(fixtures.channel);
	delete body.data.channels;
	body.data.canvas.shelves[1].displayType = "unknown";
	assert.deepEqual(await replay(t, "/uts/v3/canvases/Channels/tvs.sbd.lumen", body), body);
});

for (const format of [undefined, "text/html", "application/octet-stream", "application/vnd.apple.mpegurl"]) {
	test(`non-JSON body is preserved: ${format}`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		const response = { headers: { "content-type": format }, body: "unchanged content" };
		assert.equal(await Response({ url: "https://www.lumen.ax/api/appletv/v1/uts/v3/movies/umc.cmc.lumen1", $argument: "LogLevel=OFF" }, response), response);
		assert.equal(response.body, "unchanged content");
	});
}

test("invalid upstream JSON is surfaced to the standard response wrapper", async t => {
	t.mock.method(Storage, "getItem", () => ({}));
	const response = { headers: { "Content-Type": "application/json" }, body: "invalid JSON" };
	await assert.rejects(Response({ url: "https://www.lumen.ax/api/appletv/v1/uts/v3/movies/umc.cmc.lumen1", $argument: "LogLevel=OFF" }, response), SyntaxError);
	assert.equal(response.body, "invalid JSON");
});
