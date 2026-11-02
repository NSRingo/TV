import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Console, Storage } from "@nsnanocat/util";
import InjectBrand from "../src/class/InjectBrand.mjs";
import database from "../src/function/database.mjs";
import { Response } from "../src/process/Response.mjs";
import { Response as ResponseDev } from "../src/process/Response.dev.mjs";

const fixture = JSON.parse(readFileSync(new URL("fixtures/us-f1-home.json", import.meta.url)));
const official = fixture.body.data.canvas.shelves[0];
const ids = official.items.map(({ id }) => id);
const tabs = ids;
const anchorId = "uts.col.home-popular-movies";
const options = { pfm: "iphone", region: "us", settings: { ...database.TV.Settings, Tabs: ids } };
Console.logLevel = "OFF";

test("sports brick preserves existing row, cards, unknown entries and brand state by reference", () => {
	const shelf = structuredClone(official);
	shelf.custom = { keep: true };
	shelf.nextToken = "shelf-token";
	const extra = { id: "other", type: "Room", url: "https://tv.apple.com/us/room/other" };
	shelf.items.push(extra);
	const items = [...shelf.items];
	const shelves = [shelf];
	const channels = structuredClone(fixture.body.data.channels);
	const f1 = channels[ids[0]];
	f1.isSubscribed = false;
	const before = structuredClone(shelf);
	assert.equal(new InjectBrand().InjectBrick(shelves, channels, options), shelves);
	assert.equal(shelves[0], shelf);
	assert.deepEqual(shelf, before);
	for (const [index, item] of items.entries()) assert.equal(shelf.items[index], item);
	assert.equal(channels[ids[0]], f1);
	assert.equal(channels[ids[0]].isSubscribed, false);
	assert.equal(channels[ids[2]], undefined);
});

for (const missing of ids) {
	test(`sports brick restores missing ${missing} in native order and shape`, () => {
		const shelf = structuredClone(official);
		shelf.items = shelf.items.filter(({ id }) => id !== missing);
		const kept = [...shelf.items];
		const channels = {};
		new InjectBrand().InjectBrick([shelf], channels, options);
		assert.deepEqual(shelf.items, official.items);
		for (const item of kept)
			assert.equal(
				shelf.items.find(({ id }) => id === item.id),
				item,
			);
		assert.deepEqual(Object.keys(channels), ids.slice(0, 2));
		assert.equal(channels[ids[2]], undefined);
		const mlb = shelf.items[2];
		assert.equal(mlb.type, "Room");
		assert.equal(mlb.intents, undefined);
	});
}

for (let mask = 0; mask < 8; mask++) {
	test(`sports brick creation respects enabled Tabs combination ${mask}`, () => {
		const selected = tabs.filter((_, index) => mask & (1 << index));
		const settings = { ...options.settings, Tabs: selected };
		const before = { id: "before", items: [] };
		const anchor = { id: anchorId, items: [] };
		const after = { id: "after", items: [] };
		const shelves = [before, anchor, after];
		const channels = {};
		new InjectBrand().InjectBrick(shelves, channels, { ...options, settings });
		if (mask === 0) {
			assert.deepEqual(shelves, [before, anchor, after]);
			assert.deepEqual(channels, {});
		} else {
			assert.deepEqual(
				shelves.map(({ id }) => id),
				["before", official.id, anchorId, "after"],
			);
			assert.equal(shelves[0], before);
			assert.equal(shelves[2], anchor);
			assert.equal(shelves[3], after);
			assert.deepEqual(
				shelves[1].items.map(({ id }) => id),
				ids.filter((_, index) => mask & (1 << index)),
			);
			assert.deepEqual(
				Object.keys(channels),
				ids.slice(0, 2).filter((_, index) => mask & (1 << index)),
			);
		}
	});
}

test("sports switches control supplementation without removing original cards", () => {
	const shelves = [structuredClone(official)];
	const before = structuredClone(shelves);
	const channels = {};
	new InjectBrand().InjectBrick(shelves, channels, { ...options, settings: { ...database.TV.Settings, Tabs: [] } });
	assert.deepEqual(shelves, before);
	assert.deepEqual(channels, {});
});

test("pages without the sports row or popular-movies anchor stay unchanged", () => {
	for (const shelves of [[], [{ id: "unrelated", displayType: "brick", items: [] }]]) {
		const before = structuredClone(shelves);
		const channels = {};
		new InjectBrand().InjectBrick(shelves, channels, options);
		assert.deepEqual(shelves, before);
		assert.deepEqual(channels, {});
	}
});

test("new sports links share Sports for F1 and MLB, preserve MLS settings and support AUTO", () => {
	for (const [sports, originals, regions] of [
		["JP", "GB", ["jp", "gb", "jp"]],
		["AUTO", "AUTO", ["tw", "tw", "tw"]],
	]) {
		const shelves = [{ id: anchorId, items: [] }];
		const channels = {};
		const settings = { ...options.settings, CountryCode: { ...database.TV.Settings.CountryCode, Sports: sports, Originals: originals } };
		new InjectBrand().InjectBrick(shelves, channels, { pfm: options.pfm, region: "tw", settings });
		for (const [index, item] of shelves[0].items.entries()) {
			assert.equal(new URL(item.url).pathname.split("/")[1], regions[index]);
			assert.equal(new URL(item.url).searchParams.get("ctx_proot"), "tahoma_watchnow");
		}
		assert.equal(new URL(channels[ids[0]].url).pathname.split("/")[1], regions[0]);
		assert.equal(new URL(channels[ids[1]].url).pathname.split("/")[1], regions[1]);
	}
});

test("one injector keeps the official template independent across responses", () => {
	const injector = new InjectBrand();
	const first = [{ id: anchorId, items: [] }];
	injector.InjectBrick(first, {}, options);
	first[0].header.title = "changed";
	first[0].cachingPolicy.cache = false;
	first[0].items[0].images.shelfItemImage.width = 1;
	first[0].items[0].intents.push("changed");
	const second = [{ id: anchorId, items: [] }];
	const channels = {};
	injector.InjectBrick(second, channels, options);
	assert.deepEqual(second[0], official);
	const once = structuredClone(second);
	injector.InjectBrick(second, channels, options);
	assert.deepEqual(second, once);
});

for (const [variant, processResponse] of [
	["release", Response],
	["dev", ResponseDev],
]) {
	for (const path of ["/uts/v3/canvases/Roots/watchNow", "/uts/v3/canvases/Roots/tahoma_watchnow", "/uts/v3/canvases/roots/tahoma_watchnow"]) {
		test(`${variant}: Watch Now creates the sports brick at its native anchor through ${path}`, async t => {
			t.mock.method(Storage, "getItem", () => ({}));
			for (const pfm of ["iphone", "ipad", "atv", "desktop"]) {
				const body = {
					data: {
						canvas: {
							shelves: [
								{ id: "before", items: [] },
								{ id: anchorId, items: [{ id: "keep" }], nextToken: "shelf-token" },
							],
							nextToken: "canvas-token",
						},
					},
				};
				const request = { url: `https://uts-api.itunes.apple.com${path}?sf=143470&pfm=${pfm}&v=101`, headers: {}, $argument: "LogLevel=OFF" };
				const response = await processResponse(request, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
				const actual = JSON.parse(response.body);
				assert.deepEqual(
					actual.data.canvas.shelves.map(({ id }) => id),
					["before", official.id, anchorId],
				);
				assert.deepEqual(actual.data.canvas.shelves[0], body.data.canvas.shelves[0]);
				assert.deepEqual(actual.data.canvas.shelves[2], body.data.canvas.shelves[1]);
				assert.equal(actual.data.canvas.nextToken, "canvas-token");
				assert.deepEqual(
					actual.data.canvas.shelves[1].items.map(({ id }) => id),
					ids,
				);
				assert.equal(actual.data.canvas.shelves[1].items[2].type, "Room");
				assert.equal(actual.data.channels[ids[2]], undefined);
				assert.deepEqual(actual.data.channels[ids[0]].appBundleIds, [["iphone", "ipad"].includes(pfm) ? "com.apple.tv" : "com.apple.TVWatchList"]);
				const twice = await processResponse(request, { headers: { "Content-Type": "application/json" }, body: response.body });
				assert.deepEqual(JSON.parse(twice.body), actual);
			}
		});
	}
}
