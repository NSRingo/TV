import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Console, Storage } from "@nsnanocat/util";
import InjectChannel from "../src/class/InjectChannel.mjs";
import database from "../src/function/database.mjs";
import { Response } from "../src/process/Response.mjs";
import { Response as ResponseDev } from "../src/process/Response.dev.mjs";

const fixtures = JSON.parse(readFileSync(new URL("fixtures/apple-search-landing.json", import.meta.url)));
const appleIds = ["tvs.sbd.4000", "tvs.sbd.241000", "tvs.sbd.7000"];
const context = { platform: "iphone", region: "tw", settings: database.TV.Settings, kinds: ["apple", "thirdParty"] };
Console.logLevel = "OFF";

test("Apple root tabs are selected from the registry without platform/version restrictions", () => {
	const injector = new InjectChannel();
	const search = { type: "Search", custom: "preserved" };
	const body = { data: { applicationProps: { tabs: [search] } } };
	assert.equal(injector.InjectUTSConfigurationTabs(body, context), body);
	assert.equal(body.data.applicationProps.tabs[0], search);
	assert.deepEqual(
		body.data.applicationProps.tabs.slice(1).map(({ type }) => type),
		["Originals", "Grevy", "MLS"],
	);
	assert.equal(body.data.channels, undefined);
	const once = structuredClone(body);
	injector.InjectUTSConfigurationTabs(body, context);
	assert.deepEqual(body, once);
	assert.deepEqual(injector.InjectUTSConfigurationTabs({}, context), {});
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
	new InjectChannel().InjectSearchLanding(body, context);
	assert.equal(body.data.channels[appleIds[1]], brand);
	for (const item of items)
		assert.equal(
			body.data.canvas.shelves[0].items.find(({ id }) => id === item.id),
			item,
		);
});

test("channel insertion preserves the supplied URL without adding or replacing page context", () => {
	const injector = new InjectChannel();
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
			const settings = { ...database.TV.Settings, Tabs: ["Grevy"] };
			const options = { ...context, settings, kinds: ["apple"] };
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
	const injector = new InjectChannel();
	const empty = {};
	assert.equal(injector.InjectSearchLanding(empty, { ...context, kinds: ["apple"] }), empty);
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
	injector.InjectSearchLanding(thirdPartyGrid, { ...context, kinds: ["apple"] });
	assert.deepEqual(thirdPartyGrid, before);
});

test("placement separates Apple sports cards, third-party moretv, and existing promo layouts", () => {
	const body = {
		data: {
			canvas: {
				shelves: [
					{ displayType: "brick", id: "uts.col.tv-plus-sports-nav-brick", items: [{ id: "mlb" }] },
					{ displayType: "doorLockupWithSections", sections: [{ id: "uts.shlfsect.moretv", items: [] }] },
					{ displayType: "channelUpsell", items: [{ id: appleIds[0] }] },
				],
			},
		},
	};
	const promo = body.data.canvas.shelves[2];
	new InjectChannel().InjectWatchNowLockup(body, context);
	assert.deepEqual(
		body.data.canvas.shelves[0].items.map(({ id }) => id),
		[appleIds[1], appleIds[2], "mlb"],
	);
	assert.deepEqual(
		body.data.canvas.shelves[1].sections[0].items.map(({ id }) => id),
		["tvs.sbd.lumen"],
	);
	assert.equal(body.data.canvas.shelves[2], promo);
	assert.deepEqual(promo, { displayType: "channelUpsell", items: [{ id: appleIds[0] }] });
});

test("Apple selection and country settings only control supplementation", () => {
	const settings = { ...database.TV.Settings, Tabs: ["Grevy"], CountryCode: { ...database.TV.Settings.CountryCode, Grevy: "JP" } };
	const body = structuredClone(fixtures.samples[1].body);
	new InjectChannel().InjectSearchLanding(body, { ...context, settings, kinds: ["apple"] });
	assert.deepEqual(
		body.data.canvas.shelves[0].items.filter(({ type }) => type === "Brand").map(({ id }) => id),
		appleIds,
	);
	assert.match(body.data.channels[appleIds[1]].url, /^https:\/\/tv.apple.com\/jp\//);
	assert.equal(body.data.channels[appleIds[0]].isAppleTvPlus, true);
	assert.equal(body.data.channels[appleIds[2]].isAppleTvPlus, false);
});

test("mixed registry keeps sidebar, website and external search capabilities third-party only", async t => {
	const injector = new InjectChannel();
	const body = {};
	injector.InjectUTSUserSettings(body, context);
	assert.deepEqual(Object.keys(body.data.brandSidebarSetting), ["tvs.sbd.lumen"]);
	const website = { data: { canvas: { shelves: [] } } };
	injector.InjectWebsiteLink(website, context);
	assert.deepEqual(
		website.data.canvas.shelves.map(({ id }) => id),
		["edt.col.lumen-website"],
	);
	const requests = [];
	t.mock.method(globalThis, "fetch", async url => {
		requests.push(String(url));
		return new globalThis.Response('{"items":[]}', { status: 200 });
	});
	globalThis.fetch.cookieJar = {};
	await injector.InjectSearch({}, { ...context, pathname: "/uts/v3/search", searchTerm: "Formula 1", topResultsOnly: false, lumenKey: "test-key" });
	assert.equal(requests.length, 1);
	assert.match(requests[0], /^https:\/\/www.lumen.ax\/api\/appletv\/v1\/search\?/);
});

test("one injector keeps Apple image objects and request settings isolated", () => {
	const injector = new InjectChannel();
	const first = { data: { canvas: { shelves: [{ displayType: "brandLockup", items: [] }] } } };
	const settings = { ...database.TV.Settings, Tabs: ["Grevy"], CountryCode: { ...database.TV.Settings.CountryCode, Grevy: "JP" } };
	injector.InjectWatchNowLockup(first, { ...context, settings, kinds: ["apple"] });
	first.data.canvas.shelves[0].items[0].images.shelfItemImage.width = 1;
	first.data.channels[appleIds[1]].images.logoGlyph.width = 1;
	const second = { data: { canvas: { shelves: [{ displayType: "brandLockup", items: [] }] } } };
	injector.InjectWatchNowLockup(second, { ...context, kinds: ["apple"] });
	assert.deepEqual(
		second.data.canvas.shelves[0].items.map(({ id }) => id),
		appleIds,
	);
	assert.equal(second.data.canvas.shelves[0].items[1].images.shelfItemImage.width, 2000);
	assert.equal(second.data.channels[appleIds[1]].images.logoGlyph.width, 960);
	assert.match(second.data.channels[appleIds[1]].url, /^https:\/\/tv.apple.com\/us\//);
	assert.equal(JSON.stringify(second).includes('"placements"'), false);
	assert.equal(JSON.stringify(second).includes('"kind"'), false);
});
