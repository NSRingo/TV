import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Console, Storage } from "@nsnanocat/util";
import InjectBrand from "../src/class/InjectBrand.mjs";
import database from "../src/function/database.mjs";
import { Response } from "../src/process/Response.mjs";
import { Response as ResponseDev } from "../src/process/Response.dev.mjs";

const fixtures = JSON.parse(readFileSync(new URL("fixtures/apple-search-landing.json", import.meta.url)));
const appleIds = ["tvs.sbd.4000", "tvs.sbd.241000", "tvs.sbd.7000"];
const context = { pfm: "iphone", region: "tw", settings: { ...database.TV.Settings, Tabs: [...appleIds, "tvs.sbd.lumen"] } };
Console.logLevel = "OFF";

test("Apple root tabs use supplied settings and preserve existing entries", () => {
	const injector = new InjectBrand();
	const options = { ...context, settings: structuredClone(context.settings) };
	const search = { type: "Search", custom: "preserved" };
	const tabs = [search];
	assert.equal(injector.InjectUTSConfigurationTabs(tabs, options), tabs);
	assert.deepEqual(options.settings, context.settings);
	assert.equal(tabs[0], search);
	assert.deepEqual(
		tabs.slice(1).map(({ type }) => type),
		["Originals", "Grevy", "MLS"],
	);
	const once = structuredClone(tabs);
	injector.InjectUTSConfigurationTabs(tabs, options);
	assert.deepEqual(tabs, once);
});

for (const fixture of fixtures.samples) {
	for (const [variant, processResponse] of [
		["release", Response],
		["dev", ResponseDev],
	]) {
		for (const platform of ["iphone", "ipad", "appletv", "desktop"]) {
			for (const path of ["/uts/v3/search/landing", "/uts/v3/canvases/Roots/tahoma_searchlanding"]) {
				test(`${variant}: ${fixture.sf} landing shape supplements F1 on ${platform} through ${path}`, async t => {
					t.mock.method(Storage, "getItem", () => ({}));
					const input = structuredClone(fixture.body);
					const originalItems = input.data.canvas.shelves[0].items;
					const request = { url: `https://uts-api.itunes.apple.com${path}?sf=${fixture.sf}&pfm=${platform}&v=1`, headers: {}, $argument: "LogLevel=OFF" };
					const response = await processResponse(request, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
					const actual = JSON.parse(response.body);
					const items = actual.data.canvas.shelves[0].items;
					assert.deepEqual(
						items.filter(({ type }) => type === "Brand").map(({ id }) => id),
						[...(variant === "dev" ? ["tvs.sbd.lumen"] : []), ...appleIds],
					);
					for (const item of originalItems)
						assert.deepEqual(
							items.find(({ id }) => id === item.id),
							item,
						);
					assert.equal(actual.data.canvas.shelves[0].nextToken, "synthetic-pagination");
					const f1 = items.find(({ id }) => id === appleIds[1]);
					assert.deepEqual(f1.images, fixtures.samples[0].body.data.canvas.shelves[0].items[1].images);
					assert.equal(f1.url, actual.data.channels[appleIds[1]].url);
					assert.equal(actual.data.channels[appleIds[1]].isFirstParty, true);
					assert.equal(actual.data.channels[appleIds[1]].isApSubscription, true);
					assert.equal(actual.data.channels[appleIds[1]].isTvAppBrand, false);
					for (const key of ["isSubscribed", "isInstalled", "isConsented"]) assert.equal(actual.data.channels[appleIds[1]][key], undefined);
					const twice = await processResponse(request, { headers: { "Content-Type": "application/json" }, body: response.body });
					assert.deepEqual(JSON.parse(twice.body), actual);
				});
			}
		}
	}
}

test("official Browse preserves existing Apple objects and account state by reference", () => {
	const body = structuredClone(fixtures.samples[0].body);
	const brand = body.data.channels[appleIds[1]];
	Object.assign(brand, { isSubscribed: false, isInstalled: false, isConsented: false });
	const items = [...body.data.canvas.shelves[0].items];
	new InjectBrand().InjectSearchLanding(body, context);
	assert.equal(body.data.channels[appleIds[1]], brand);
	for (const item of items)
		assert.equal(
			body.data.canvas.shelves[0].items.find(({ id }) => id === item.id),
			item,
		);
});

test("channel insertion preserves the supplied URL without adding or replacing page context", () => {
	const injector = new InjectBrand();
	for (const url of ["https://tv.apple.com/us/channel/formula-1/tvs.sbd.241000", "https://tv.apple.com/us/channel/formula-1/tvs.sbd.241000?ctx_proot=official-root&ctx_other=keep"]) {
		for (const rootId of ["tahoma_watchnow", "tahoma_searchlanding"]) {
			const shelf = { displayType: "brandLockup", items: [] };
			switch (rootId) {
				case "tahoma_searchlanding":
					shelf.displayType = "brick";
					shelf.isGrid = true;
					break;
			}
			const brand = { ...fixtures.samples[0].body.data.channels[appleIds[1]], url };
			const body = { data: { canvas: { shelves: [shelf] }, channels: { [appleIds[1]]: brand } } };
			const settings = { ...database.TV.Settings, Tabs: ["tvs.sbd.241000"] };
			const options = { ...context, settings };
			switch (rootId) {
				case "tahoma_watchnow":
					injector.InjectWatchNowLockup(body, options);
					break;
				case "tahoma_searchlanding":
					injector.InjectSearchLanding(body, options);
					break;
			}
			assert.equal(shelf.items[0].url, url);
			assert.equal(body.data.channels[appleIds[1]], brand);
		}
	}
});

test("Apple-only landing does not create a grid; a third-party fallback grid stays third-party on replay", () => {
	const injector = new InjectBrand();
	const empty = {};
	assert.equal(injector.InjectSearchLanding(empty, { ...context, settings: { ...context.settings, Tabs: appleIds } }), empty);
	assert.deepEqual(empty, {});
	const fallback = {};
	injector.InjectSearchLanding(fallback, context);
	assert.deepEqual(
		fallback.data.canvas.shelves[0].items.map(({ id }) => id),
		["tvs.sbd.lumen"],
	);
	const once = structuredClone(fallback);
	injector.InjectSearchLanding(fallback, context);
	assert.deepEqual(fallback, once);
	const thirdPartyGrid = { data: { canvas: { shelves: [{ id: "edt.col.lumen-browse", displayType: "brick", isGrid: true, items: [] }] } } };
	const before = structuredClone(thirdPartyGrid);
	injector.InjectSearchLanding(thirdPartyGrid, { ...context, settings: { ...context.settings, Tabs: appleIds } });
	assert.deepEqual(thirdPartyGrid, before);
});

test("placement separates Apple sports cards, third-party moretv, and existing promo layouts", () => {
	const body = {
		data: {
			canvas: {
				shelves: [
					{ displayType: "brick", id: "uts.col.tv-plus-sports-nav-brick", items: [{ id: "edt.item.62327df1-6874-470e-98b2-a5bbeac509a2", type: "Room" }] },
					{ displayType: "doorLockupWithSections", sections: [{ id: "uts.shlfsect.moretv", items: [] }] },
					{ displayType: "channelUpsell", items: [{ id: appleIds[0] }] },
				],
			},
		},
	};
	const promo = body.data.canvas.shelves[2];
	const injector = new InjectBrand();
	injector.InjectWatchNowLockup(body, context);
	injector.InjectBrick(body.data.canvas.shelves, body.data.channels, context);
	assert.deepEqual(
		body.data.canvas.shelves[0].items.map(({ id }) => id),
		[appleIds[1], appleIds[2], "edt.item.62327df1-6874-470e-98b2-a5bbeac509a2"],
	);
	assert.deepEqual(
		body.data.canvas.shelves[1].sections[0].items.map(({ id }) => id),
		["tvs.sbd.lumen"],
	);
	assert.equal(body.data.canvas.shelves[2], promo);
	assert.deepEqual(promo, { displayType: "channelUpsell", items: [{ id: appleIds[0] }] });
});

test("Apple selection and country settings only control supplementation", () => {
	const settings = { ...database.TV.Settings, Tabs: ["tvs.sbd.241000"], CountryCode: { ...database.TV.Settings.CountryCode, Sports: "JP" } };
	const body = structuredClone(fixtures.samples[1].body);
	new InjectBrand().InjectSearchLanding(body, { ...context, settings });
	assert.deepEqual(
		body.data.canvas.shelves[0].items.filter(({ type }) => type === "Brand").map(({ id }) => id),
		appleIds,
	);
	assert.match(body.data.channels[appleIds[1]].url, /^https:\/\/tv.apple.com\/jp\//);
	assert.equal(body.data.channels[appleIds[0]].isAppleTvPlus, true);
	assert.equal(body.data.channels[appleIds[2]].isAppleTvPlus, false);
});

test("one injector keeps Apple image objects and request settings isolated", () => {
	const injector = new InjectBrand();
	const first = { data: { canvas: { shelves: [{ displayType: "brandLockup", items: [] }] } } };
	const settings = { ...database.TV.Settings, Tabs: ["tvs.sbd.241000"], CountryCode: { ...database.TV.Settings.CountryCode, Sports: "JP" } };
	injector.InjectWatchNowLockup(first, { ...context, settings });
	first.data.canvas.shelves[0].items[0].images.shelfItemImage.width = 1;
	first.data.channels[appleIds[1]].images.logoGlyph.width = 1;
	const second = { data: { canvas: { shelves: [{ displayType: "brandLockup", items: [] }] } } };
	injector.InjectWatchNowLockup(second, { ...context, settings: { ...context.settings, Tabs: appleIds } });
	assert.deepEqual(
		second.data.canvas.shelves[0].items.map(({ id }) => id),
		appleIds,
	);
	assert.equal(second.data.canvas.shelves[0].items[1].images.shelfItemImage.width, 2000);
	assert.equal(second.data.channels[appleIds[1]].images.logoGlyph.width, 960);
	assert.match(second.data.channels[appleIds[1]].url, /^https:\/\/tv.apple.com\/us\//);
});
