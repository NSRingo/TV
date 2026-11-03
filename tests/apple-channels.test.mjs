import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Console, Storage } from "@nsnanocat/util";
import InjectBrand from "../src/class/InjectBrand.mjs";
import database from "../src/function/database.mjs";
import { Response } from "./host.mjs";
import { ResponseDev } from "./host.mjs";

const fixtures = JSON.parse(readFileSync(new URL("fixtures/apple-search-landing.json", import.meta.url)));
const appleIds = ["tvs.sbd.4000", "tvs.sbd.241000", "tvs.sbd.7000"];
const context = { pfm: "ipad", region: "tw", settings: { ...database.TV.Settings, Brands: [...appleIds, "tvs.sbd.lumen"] } };
Console.logLevel = "OFF";

test("Apple root tabs use supplied settings and preserve existing entries", () => {
	const options = { ...context, settings: structuredClone(context.settings) };
	const injector = new InjectBrand(options);
	const search = { type: "Search", custom: "preserved" };
	const tabs = [search];
	assert.equal(injector.InjectUTSConfigurationTabs(tabs, options), tabs);
	assert.deepEqual(options.settings, context.settings);
	assert.equal(tabs[0], search);
	assert.deepEqual(
		tabs.slice(1).map(({ type }) => type),
		["Grevy", "MLS"],
	);
	const once = structuredClone(tabs);
	injector.InjectUTSConfigurationTabs(tabs, options);
	assert.deepEqual(tabs, once);
});

test("Apple TV is preserved when present and never supplemented in Home or Browse", () => {
	for (const method of ["InjectWatchNowLockup", "InjectSearchLanding"]) {
		const body = structuredClone(fixtures.samples[0].body);
		const shelf = body.data.canvas.shelves[0];
		if (method === "InjectWatchNowLockup") shelf.displayType = "brandLockup";
		const original = shelf.items.find(({ id }) => id === "tvs.sbd.4000");
		const injector = new InjectBrand(context);
		injector[method](body, context);
		assert.equal(
			shelf.items.find(({ id }) => id === "tvs.sbd.4000"),
			original,
		);
		shelf.items = shelf.items.filter(({ id }) => id !== "tvs.sbd.4000");
		delete body.data.channels["tvs.sbd.4000"];
		injector[method](body, context);
		assert.equal(
			shelf.items.some(({ id }) => id === "tvs.sbd.4000"),
			false,
		);
		assert.equal(body.data.channels["tvs.sbd.4000"], undefined);
	}
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
						["tvs.sbd.lumen", ...(platform === "desktop" ? [] : ["tvs.sbd.9000"]), ...appleIds],
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
	new InjectBrand(context).InjectSearchLanding(body, context);
	assert.equal(body.data.channels[appleIds[1]], brand);
	for (const item of items)
		assert.equal(
			body.data.canvas.shelves[0].items.find(({ id }) => id === item.id),
			item,
		);
});

test("channel insertion preserves the supplied URL without adding or replacing page context", () => {
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
			const settings = { ...database.TV.Settings, Brands: ["tvs.sbd.241000"] };
			const options = { ...context, settings };
			const injector = new InjectBrand(options);
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
	const appleContext = { ...context, settings: { ...context.settings, Brands: appleIds } };
	const appleInjector = new InjectBrand(appleContext);
	const empty = {};
	assert.equal(appleInjector.InjectSearchLanding(empty, appleContext), empty);
	assert.deepEqual(empty, {});
	const injector = new InjectBrand(context);
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
	appleInjector.InjectSearchLanding(thirdPartyGrid, appleContext);
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
	const injector = new InjectBrand(context);
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
	const settings = { ...database.TV.Settings, Brands: ["tvs.sbd.241000"], CountryCode: { ...database.TV.Settings.CountryCode, Sports: "JP" } };
	const body = structuredClone(fixtures.samples[1].body);
	new InjectBrand({ settings }).InjectSearchLanding(body, { ...context, settings });
	assert.deepEqual(
		body.data.canvas.shelves[0].items.filter(({ type }) => type === "Brand").map(({ id }) => id),
		appleIds,
	);
	assert.match(body.data.channels[appleIds[1]].url, /^https:\/\/tv.apple.com\/jp\//);
	assert.equal(body.data.channels[appleIds[0]].isAppleTvPlus, true);
	assert.equal(body.data.channels[appleIds[2]].isAppleTvPlus, false);
});

test("one injector fixes brand selection at construction while isolating images and request regions", () => {
	const injector = new InjectBrand({ settings: { ...context.settings, Brands: ["tvs.sbd.241000"] } });
	const first = { data: { canvas: { shelves: [{ displayType: "brandLockup", items: [] }] } } };
	const settings = { ...database.TV.Settings, Brands: ["tvs.sbd.241000"], CountryCode: { ...database.TV.Settings.CountryCode, Sports: "JP" } };
	injector.InjectWatchNowLockup(first, { ...context, settings });
	first.data.canvas.shelves[0].items[0].images.shelfItemImage.width = 1;
	first.data.channels[appleIds[1]].images.logoGlyph.width = 1;
	const second = { data: { canvas: { shelves: [{ displayType: "brandLockup", items: [] }] } } };
	injector.InjectWatchNowLockup(second, { ...context, settings: { ...context.settings, Brands: appleIds } });
	assert.deepEqual(
		second.data.canvas.shelves[0].items.map(({ id }) => id),
		["tvs.sbd.241000"],
	);
	assert.equal(second.data.canvas.shelves[0].items[0].images.shelfItemImage.width, 2000);
	assert.equal(second.data.channels[appleIds[1]].images.logoGlyph.width, 960);
	assert.match(second.data.channels[appleIds[1]].url, /^https:\/\/tv.apple.com\/us\//);
});
