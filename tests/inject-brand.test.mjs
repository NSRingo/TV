import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Console, Storage } from "@nsnanocat/util";
import InjectBrand from "../src/class/InjectBrand.mjs";
import { ResponseDev } from "./host.mjs";
import { Response as ResponseRelease } from "./host.mjs";

const fixtures = JSON.parse(readFileSync(new URL("fixtures/channel-responses.json", import.meta.url)));
const channelTypes = JSON.parse(readFileSync(new URL("fixtures/channel-types.json", import.meta.url)));
const brandId = "tvs.sbd.lumen";
const lumenKey = "test-lumen-key";
const movies = [
	{ id: "umc.cmc.lumen1", type: "Movie", title: "Lumen movie" },
	{ id: "umc.cmc.lumen2", type: "Show", title: "Lumen show" },
];
const settings = { Brands: ["tvs.sbd.lumen"] };
Console.logLevel = "OFF";

test("third-party Config independently overrides both brand flags, including explicit false", async () => {
	// 只替换私有配置生成各组样本，不为测试增加公开配置接口。
	// Replace private configuration only, without adding a public configuration API for tests.
	const source = readFileSync(new URL("../src/class/InjectBrand.mjs", import.meta.url), "utf8").replace('"@nsnanocat/util"', JSON.stringify(import.meta.resolve("@nsnanocat/util")));
	for (const brandType of ["Channel", "App"]) {
		for (const isApSubscription of [undefined, true, false]) {
			for (const isFirstParty of [undefined, true, false]) {
				const config = { brandType, isApSubscription, isFirstParty };
				const configured = source.replace('brandType: "Channel",', `...${JSON.stringify(config)},`);
				const { default: ConfiguredInjectBrand } = await import(`data:text/javascript;base64,${Buffer.from(configured).toString("base64")}`);
				const body = { data: { channels: { [brandId]: { isApSubscription: false, isFirstParty: false, isSubscribed: false, isConsented: false } } } };
				new ConfiguredInjectBrand({ settings, pfm: "atv" }).InjectUTSConfigurationChannelsAndApps(body, { pfm: "atv", region: "tw", settings });
				const brand = body.data.channels[brandId];
				assert.equal(brand.isApSubscription, isApSubscription ?? (brandType === "Channel"), JSON.stringify(config));
				assert.equal(brand.isFirstParty, isFirstParty ?? (brandType === "Channel"), JSON.stringify(config));
				assert.equal(body.data.applicationProps.tabs[0].subTabs[0].brandType, brandType);
				assert.equal(brand.isSubscribed, false);
				assert.equal(brand.isConsented, false);
			}
		}
	}
});

function backend(t, body = { items: movies }, status = 200) {
	const requests = [];
	t.mock.method(globalThis, "fetch", async (url, options) => {
		requests.push({ url: new URL(url), options });
		if (body instanceof Error) throw body;
		return new globalThis.Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
	});
	globalThis.fetch.cookieJar = {};
	return requests;
}

async function replay(t, path, body, query = "", response = ResponseDev, argument = `LumenKey=${lumenKey}&LogLevel=OFF`) {
	t.mock.method(Storage, "getItem", () => ({}));
	const request = { url: `https://uts-api.itunes.apple.com${path}?${query}`, headers: {}, $argument: argument };
	const result = await response(request, { status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
	return JSON.parse(result.body);
}

test("one instance searches concurrently with method-local context and mutates the original response objects", async t => {
	const requests = backend(t);
	const injector = new InjectBrand({ settings });
	const tr = { id: "uts.col.search.TR", items: [{ id: "apple" }] };
	const br = { id: "uts.col.search.BR", items: [{ id: "disney" }] };
	const shelves = [tr, br];
	const canvasBody = { data: { canvas: { shelves } } };
	const shelf = { id: "uts.col.search.TR", items: [{ id: "original" }] };
	const shelfBody = { data: { shelf } };
	const [canvasResult, shelfResult] = await Promise.all([
		injector.InjectSearch(canvasBody, { pfm: "ipad", region: "tw", settings, pathname: "/uts/v3/search", searchTerm: "Lumen", topResultsOnly: false, lumenKey: "tablet-key" }),
		injector.InjectSearch(shelfBody, { pfm: "desktop", region: "us", settings, pathname: "/uts/v3/shelves/uts.col.search.TR", searchTerm: "Dune", topResultsOnly: true, lumenKey: "desktop-key" }),
	]);
	assert.equal(canvasResult, canvasBody);
	assert.equal(canvasBody.data.canvas.shelves, shelves);
	assert.equal(shelves[1], tr);
	assert.equal(shelves[2], br);
	assert.equal(tr.items[0].id, brandId);
	assert.equal(br.items[0].id, brandId);
	assert.equal(new URL(canvasBody.data.channels[brandId].url).pathname.split("/")[1], "tw");
	assert.deepEqual(canvasBody.data.channels[brandId].appBundleIds, ["com.apple.tv"]);
	assert.equal(shelfResult, shelfBody);
	assert.equal(shelfBody.data.shelf, shelf);
	assert.deepEqual(
		shelf.items.map(({ id }) => id),
		[...movies.map(({ id }) => id), "original"],
	);
	assert.equal(new URL(shelfBody.data.channels[brandId].url).pathname.split("/")[1], "us");
	assert.deepEqual(shelfBody.data.channels[brandId].appBundleIds, ["com.apple.TVWatchList"]);
	assert.deepEqual(
		requests.map(({ url, options }) => [url.searchParams.get("q"), options.headers["X-Lumen-Key"]]),
		[
			["Lumen", "tablet-key"],
			["Dune", "desktop-key"],
		],
	);
	assert.equal(JSON.stringify(canvasBody).includes("tablet-key"), false);
	assert.equal(JSON.stringify(shelfBody).includes("desktop-key"), false);
});

for (const fixture of channelTypes.samples) {
	test(`${fixture.pfm}: all injection positions use Apple TV hosts and preserve Lumen classification`, async t => {
		backend(t, { items: [] });
		const cases = [
			["/uts/v3/configurations", "InjectUTSConfigurationChannelsAndApps", {}, body => body.data.applicationProps.tabs[0].subTabs[0].target],
			["/uts/v3/canvases/Roots/tahoma_watchnow", "InjectWatchNowLockup", { data: { canvas: { shelves: [{ displayType: "brandLockup", items: [] }] } } }, body => body.data.canvas.shelves[0].items[0]],
			["/uts/v3/search/landing", "InjectSearchLanding", {}, body => body.data.canvas.shelves[0].items[0]],
			["/uts/v3/search", "InjectSearch", {}, body => body.data.canvas.shelves.find(({ id }) => id === "uts.col.search.BR").items[0]],
			["/uts/v3/shelves/uts.col.search.TR", "InjectSearch", {}, body => body.data.shelf.items[0]],
			["/uts/v3/shelves/uts.col.search.BR", "InjectSearch", {}, body => body.data.shelf.items[0]],
		];
		for (const [path, method, body, itemOf] of cases) {
			const injector = new InjectBrand({ settings });
			await injector[method](body, method === "InjectSearch" ? { pfm: fixture.pfm, region: "us", settings, pathname: path, searchTerm: "Lumen", topResultsOnly: false, lumenKey } : { pfm: fixture.pfm, region: "us", settings });
			const brand = itemOf(body);
			assert.equal(brand.id, brandId);
			assert.equal(brand.name, "Lumen");
			assert.equal(brand, body.data.channels[brandId]);
			// Lumen 按配置的 Channel 类型派生原生频道标志与平台宿主。
			const expected = fixture.metadata;
			assert.deepEqual(Object.fromEntries(Object.keys(expected).map(key => [key, brand[key]])), expected);
			assert.equal(brand.isWatchlistEnabled, false);
			assert.equal(brand.shouldTrackPlayActivity, false);
		}
	});
}

test("existing Lumen subscription, consent, installation and pin state is preserved across every injection", async t => {
	backend(t, { items: [] });
	for (const [path, method, shelves] of [
		["/uts/v3/configurations", "InjectUTSConfigurationChannelsAndApps", []],
		["/uts/v3/canvases/Roots/watchNow", "InjectWatchNowLockup", [{ displayType: "channelLockup", items: [] }]],
		["/uts/v3/search/landing", "InjectSearchLanding", []],
		["/uts/v3/search", "InjectSearch", []],
	]) {
		const injector = new InjectBrand({ settings });
		const state = { isConsented: false, isInstalled: false, isSubscribed: false, isPinned: true };
		const body = { data: { channels: { [brandId]: { id: brandId, ...state } }, canvas: { shelves } } };
		await injector[method](body, method === "InjectSearch" ? { pfm: "desktop", region: "us", settings, pathname: path, searchTerm: "Lumen", topResultsOnly: false, lumenKey } : { pfm: "desktop", region: "us", settings });
		const brand = body.data.channels[brandId];
		assert.deepEqual(Object.fromEntries(Object.keys(state).map(key => [key, brand[key]])), state);
		assert.equal(brand.isApSubscription, true);
		assert.equal(brand.isFirstParty, true);
	}
});

test("configuration uses the explicit region and preserves it on repeated injection", () => {
	const injector = new InjectBrand({ settings });
	const body = {
		data: {
			applicationProps: {
				tabs: [
					{ type: "Originals", target: { url: "https://tv.apple.com/us/channel/tvs.sbd.4000" } },
					{ id: "ChannelsAndApps", type: "ChannelsAndApps", subTabs: [{ target: { id: "tvs.sbd.1000216", url: "https://tv.apple.com/us/channel/disney/tvs.sbd.1000216" } }] },
				],
			},
		},
	};
	injector.InjectUTSConfigurationChannelsAndApps(body, { pfm: "ipad", region: "tw", settings });
	const tab = body.data.applicationProps.tabs[1].subTabs[0];
	assert.equal(tab.target.url, `https://tv.apple.com/tw/channel/lumen/${brandId}`);
	assert.deepEqual(tab.universalLinks, [tab.target.url]);
	const once = structuredClone(body);
	injector.InjectUTSConfigurationChannelsAndApps(body, { pfm: "ipad", region: "tw", settings });
	assert.deepEqual(body, once);
});

test("new structures use the request storefront and preserve the existing channel group", async t => {
	backend(t, { items: [] });
	for (const path of ["/uts/v3/configurations", "/uts/v3/search/landing", "/uts/v3/search", "/uts/v3/shelves/uts.col.search.TR", "/uts/v3/shelves/uts.col.search.BR"]) {
		t.mock.method(Storage, "getItem", () => ({}));
		const body = { data: { applicationProps: { tabs: [{ id: "ChannelsAndApps", type: "ChannelsAndApps", subTabs: [{ target: { url: "https://tv.apple.com/tw/channel/disney/tvs.sbd.1000216" } }] }, { id: "Library", type: "Library" }] } } };
		const response = await ResponseDev(
			{ url: `https://uts-api.itunes.apple.com${path}?sf=143470&pfm=ipad&caller=wlk&v=100&searchTerm=Lumen`, headers: {}, $argument: `Brands=Lumen&LumenKey=${lumenKey}&LogLevel=OFF` },
			{ headers: { "Content-Type": "application/json" }, body: JSON.stringify(path === "/uts/v3/configurations" ? body : {}) },
		);
		const actual = JSON.parse(response.body);
		assert.equal(actual.data.channels[brandId].url, `https://tv.apple.com/tw/channel/lumen/${brandId}`);
		const categories = actual.data.canvas?.shelves ?? [actual.data.shelf].filter(Boolean);
		for (const shelf of categories.filter(({ id }) => id.startsWith("uts.col.search."))) assert.match(shelf.header.url, /^https:\/\/tv.apple.com\/tw\/shelf\//);
	}
});

test("configuration prepends a shared complete Brand target and preserves unrelated navigation", () => {
	const injector = new InjectBrand({ settings });
	const original = { type: "Channel", title: "Disney+", target: { id: "tvs.sbd.1000216" } };
	const body = { data: { applicationProps: { tabs: [{ type: "WatchNow" }, { id: "ChannelsAndApps", type: "ChannelsAndApps", title: "Existing title", subTabs: [original, { target: { id: brandId }, title: "Old Lumen" }] }, { id: "Library", type: "Library" }], untouched: true }, channels: { other: { id: "other" } } } };
	assert.equal(injector.InjectUTSConfigurationChannelsAndApps(body, { pfm: "desktop", region: "us", settings }), body);
	const tab = body.data.applicationProps.tabs[1];
	assert.equal(tab.title, "Existing title");
	assert.equal(tab.subTabs.length, 2);
	assert.equal(tab.subTabs[0].type, "Brand");
	assert.equal(tab.subTabs[0].brandType, "Channel");
	assert.equal(tab.subTabs[0].destinationType, "Target");
	assert.equal(tab.subTabs[0].isPinned, false);
	assert.equal(tab.subTabs[0].canBeHiddenFromNavigation, true);
	assert.deepEqual(tab.subTabs[0].images.defaultImage, body.data.channels[brandId].images.appIcon);
	assert.notEqual(tab.subTabs[0].images.defaultImage, body.data.channels[brandId].images.appIcon);
	assert.deepEqual(tab.subTabs[0].universalLinks, ["https://tv.apple.com/us/channel/lumen/tvs.sbd.lumen"]);
	assert.equal(tab.subTabs[0].target, body.data.channels[brandId]);
	assert.equal(tab.subTabs[1], original);
	assert.equal(body.data.channels[brandId].type, "Brand");
	assert.equal(body.data.channels[brandId].isSubscribed, true);
	assert.deepEqual(body.data.channels.other, { id: "other" });
	assert.equal(body.data.channels.tvs, undefined);
	const once = structuredClone(body);
	injector.InjectUTSConfigurationChannelsAndApps(body, { pfm: "desktop", region: "us", settings });
	assert.deepEqual(body, once);
});

for (const isPinned of [false, true]) {
	test(`ATV configuration retains sidebar pin state ${isPinned} over the Brand default`, async t => {
		const body = {
			data: {
				applicationProps: { tabs: [{ id: "ChannelsAndApps", type: "ChannelsAndApps", subTabs: [{ type: "Brand", isPinned, target: { id: brandId } }] }] },
				channels: { [brandId]: { id: brandId, isPinned: !isPinned } },
			},
		};
		const actual = await replay(t, "/uts/v3/configurations", body, "caller=wlk&pfm=atv&sf=143441&v=101");
		const subTab = actual.data.applicationProps.tabs.find(({ type }) => type === "ChannelsAndApps").subTabs[0];
		assert.equal(subTab.type, "Brand");
		assert.equal(subTab.brandType, "Channel");
		assert.equal(subTab.isPinned, isPinned);
		assert.equal(subTab.canBeHiddenFromNavigation, true);
		assert.equal(subTab.images.defaultImage.url, actual.data.channels[brandId].images.appIcon.url);
		assert.equal(actual.data.channels[brandId].isPinned, !isPinned);
		assert.deepEqual(await replay(t, "/uts/v3/configurations", actual, "caller=wlk&pfm=atv&sf=143441&v=101"), actual);
	});
}

for (const body of [{}, { data: { applicationProps: {} } }]) {
	test(`configuration creates missing paths: ${JSON.stringify(body)}`, async t => {
		const actual = await replay(t, "/uts/v3/configurations", body, "caller=wlk&pfm=desktop&v=100");
		assert.equal(actual.data.applicationProps.tabs.filter(({ type }) => type === "ChannelsAndApps").length, 1);
		assert.equal(actual.data.applicationProps.tabs.find(({ type }) => type === "ChannelsAndApps").subTabs[0].target.id, brandId);
	});
}

test("selected Lumen injection survives caller=wta without a channel group", async t => {
	for (const caller of ["wta", "wlk"]) {
		t.mock.method(Storage, "getItem", () => ({}));
		const response = await ResponseDev(
			{ url: `https://uts-api.itunes.apple.com/uts/v3/configurations?caller=${caller}&pfm=iphone&v=1`, headers: {}, $argument: "Brands=Lumen&ThirdParty=false&LogLevel=OFF" },
			{ headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: { applicationProps: { tabs: [{ type: "Library", title: "Library" }] } } }) },
		);
		const tabs = JSON.parse(response.body).data.applicationProps.tabs;
		assert.deepEqual(
			tabs.map(({ type }) => type),
			["ChannelsAndApps", "Library"],
		);
		assert.equal(tabs[0].subTabs[0].target.id, brandId);
	}
});

for (const fixture of fixtures.home) {
	test(`real home door ${fixture.sf}: preserves original items, regions and pagination`, async t => {
		const original = structuredClone(fixture.body);
		original.data.canvas.nextToken = "canvas-pagination";
		original.data.canvas.shelves[0].nextToken = "shelf-pagination";
		original.data.canvas.shelves[0].sections[0].nextToken = "section-pagination";
		const actual = await replay(t, "/uts/v3/canvases/Roots/tahoma_watchnow", original, `sf=${fixture.sf}`, ResponseDev, "Brands=Lumen&LogLevel=OFF");
		const item = actual.data.canvas.shelves[0].sections[0].items[0];
		assert.equal(item.id, brandId);
		assert.equal(item.type, "Brand");
		assert.match(item.url, new RegExp(`/${fixture.sf === "143470" ? "tw" : "us"}/channel/lumen/`));
		assert.deepEqual([item.images.shelfItemImage.width, item.images.shelfItemImage.height], [1000, 1500]);
		assert.deepEqual(await replay(t, "/uts/v3/canvases/Roots/tahoma_watchnow", actual, `sf=${fixture.sf}`, ResponseDev, "Brands=Lumen&LogLevel=OFF"), actual);
		actual.data.canvas.shelves[0].sections[0].items.shift();
		delete actual.data.channels[brandId];
		assert.deepEqual(actual, original);
	});
}

test("all legacy home lockups and matching door sections are injected together", async t => {
	const shelves = [
		{ displayType: "channelLockup", items: [{ id: "first" }, { id: brandId }] },
		{ displayType: "brandLockup", items: [] },
		{ displayType: "doorLockupWithSections", sections: [{ id: "other", items: [{ id: "keep" }] }, { id: "uts.shlfsect.moretv" }] },
		{ displayType: "channelUpsell", items: [{ id: "upsell" }] },
	];
	for (const path of ["/uts/v3/canvases/Roots/watchNow", "/uts/v3/canvases/roots/tahoma_watchnow"]) {
		const actual = await replay(t, path, { data: { canvas: { shelves } } }, "", ResponseDev, "Brands=Lumen&LogLevel=OFF");
		const result = actual.data.canvas.shelves;
		for (const target of [result[0], result[1], result[2].sections[1]]) {
			assert.equal(target.items[0].id, brandId);
			assert.equal(target.items.filter(({ id }) => id === brandId).length, 1);
		}
		assert.deepEqual(result[0].items[1], { id: "first" });
		assert.deepEqual(result[2].sections[0], shelves[2].sections[0]);
		assert.deepEqual(result[3], shelves[3]);
		assert.equal(result[0].items[0].images.shelfImage.width, 1280);
	}
});

test("home without a target leaves the complete body unchanged", async t => {
	for (const body of [
		{},
		{
			data: {
				canvas: {
					shelves: [
						{ displayType: "channelUpsell", items: [{ id: "upsell" }] },
						{ displayType: "doorLockupWithSections", sections: [{ id: "other", items: [] }] },
					],
				},
			},
		},
	]) {
		assert.deepEqual(await replay(t, "/uts/v3/canvases/Roots/watchNow", body), body);
	}
});

test("home injection retains the existing playable URL workaround", async t => {
	const actual = await replay(t, "/uts/v3/canvases/Roots/tahoma_watchnow", { data: { canvas: { shelves: [{ displayType: "brandLockup", items: [] }, { items: [{ playable: { assets: { hlsUrl: "https://play.itunes.apple.com/test.m3u8" } } }] }] } } });
	assert.equal(actual.data.canvas.shelves[0].items[0].id, brandId);
	assert.equal(actual.data.canvas.shelves[1].items[0].playable.assets.hlsUrl, "https://play-cdn.itunes.apple.com/test.m3u8");
});

for (const fixture of fixtures.search.filter(({ stage }) => stage === "landing")) {
	for (const path of ["/uts/v3/search/landing", "/uts/v3/canvases/Roots/tahoma_searchlanding"]) {
		test(`${fixture.case}: ${path} prepends a Brand to the official Browse grid`, async t => {
			const actual = await replay(t, path, fixture.body, `sf=${fixture.sf}`, ResponseDev, "Brands=Lumen&LogLevel=OFF");
			const item = actual.data.canvas.shelves[0].items[0];
			assert.equal(item.id, brandId);
			assert.equal(item.type, "Brand");
			assert.equal(item.url, `https://tv.apple.com/${fixture.sf === "143470" ? "tw" : "us"}/channel/lumen/${brandId}`);
			assert.equal(
				actual.data.canvas.shelves.some(({ id }) => id === "uts.col.search.BR"),
				false,
			);
			assert.deepEqual(await replay(t, path, actual, `sf=${fixture.sf}`, ResponseDev, "Brands=Lumen&LogLevel=OFF"), actual);
			actual.data.canvas.shelves[0].items.shift();
			delete actual.data.channels[brandId];
			assert.deepEqual(actual, fixture.body);
		});
	}
}

test("landing handles Brand-only grids and creates a grid without modifying unrelated rows", async t => {
	const unrelated = { id: "other", displayType: "cardLockup", items: [{ id: "movie", type: "Movie" }] };
	for (const shelves of [[], [unrelated], [{ id: "browse", displayType: "brick", isGrid: true, items: [{ id: "disney", type: "Brand" }], nextToken: "keep" }]]) {
		const actual = await replay(t, "/uts/v3/search/landing", { data: { canvas: { shelves } } }, "", ResponseDev, "Brands=Lumen&LogLevel=OFF");
		const grid = actual.data.canvas.shelves[0];
		assert.equal(grid.displayType, "brick");
		assert.equal(grid.isGrid, true);
		assert.equal(grid.items[0].id, brandId);
		if (shelves[0] === unrelated) assert.deepEqual(actual.data.canvas.shelves[1], unrelated);
		if (shelves[0]?.id === "browse") {
			assert.equal(grid.nextToken, "keep");
			assert.deepEqual(grid.items[1], shelves[0].items[0]);
		}
	}
	const empty = await replay(t, "/uts/v3/search/landing", {});
	assert.equal(empty.data.canvas.shelves[0].items[0].id, brandId);
});

test("missing or blank Lumen credentials preserve every search response without backend requests", async t => {
	const requests = backend(t);
	for (const argument of ["LogLevel=OFF", "LumenKey=&LogLevel=OFF", 'LumenKey=""&LogLevel=OFF', "LumenKey=+%20+&LogLevel=OFF"]) {
		for (const term of ["Lumen", "名侦探柯南"]) {
			for (const [path, body, topResultsOnly] of [
				["/uts/v3/search", fixtures.search.find(({ stage }) => stage !== "landing").body, false],
				["/uts/v3/search", { data: { canvas: { shelves: [{ id: "uts.col.search.TR", items: [{ id: "apple" }], nextToken: "keep" }] } } }, true],
				["/uts/v3/shelves/uts.col.search.TR", { data: { shelf: { id: "uts.col.search.TR", items: [{ id: "apple" }], nextToken: "keep" } } }, false],
				["/uts/v3/shelves/uts.col.search.BR", { data: { shelf: { id: "uts.col.search.BR", items: [{ id: "disney" }], nextToken: "keep" } } }, false],
			]) {
				const query = new URLSearchParams({ searchTerm: term, topResultsOnly: String(topResultsOnly) });
				assert.deepEqual(await replay(t, path, body, query.toString(), ResponseDev, argument), body);
			}
		}
	}
	assert.equal(requests.length, 0);
});

test("argument credentials are trimmed, encoded values survive parsing, and remain outside the response", async t => {
	const requests = backend(t);
	const key = "test+key/with=padding&suffix";
	const argument = new URLSearchParams({ LumenKey: ` ${key} `, LogLevel: "OFF" });
	const actual = await replay(t, "/uts/v3/search", {}, "searchTerm=名侦探柯南&topResultsOnly=true", ResponseDev, argument.toString());
	assert.equal(requests.length, 1);
	assert.equal(requests[0].options.headers["X-Lumen-Key"], key);
	assert.equal(requests[0].url.searchParams.get("q"), "名侦探柯南");
	assert.deepEqual(actual.data.canvas.shelves[0].items, movies);
	assert.equal(JSON.stringify(actual).includes(key), false);
});

test("Lumen search uses the key from persistent settings", async t => {
	const requests = backend(t);
	t.mock.method(Storage, "getItem", () => ({ TV: { Settings: { LumenKey: "stored-key" } } }));
	await ResponseDev({ url: "https://uts-api.itunes.apple.com/uts/v3/search?searchTerm=Lumen", headers: {}, $argument: "LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: "{}" });
	assert.equal(requests[0].options.headers["X-Lumen-Key"], "stored-key");
});

test("unrelated searches leave official channel results unchanged when the backend is empty", async t => {
	backend(t, { items: [] });
	for (const [path, query, body] of [
		[
			"/uts/v3/search",
			"searchTerm=Dune",
			{
				data: {
					canvas: {
						shelves: [
							{ id: "uts.col.search.TR", items: [{ id: "apple" }] },
							{ id: "uts.col.search.BR", items: [{ id: "disney" }] },
						],
					},
				},
			},
		],
		["/uts/v3/search", "searchTerm=Dune&topResultsOnly=true", {}],
		["/uts/v3/shelves/uts.col.search.TR", "searchTerm=Dune", {}],
		["/uts/v3/shelves/uts.col.search.BR", "searchTerm=Dune", { data: { shelf: { id: "uts.col.search.BR", items: [{ id: "disney" }], nextToken: "keep" } } }],
	])
		assert.deepEqual(await replay(t, path, body, query), body);
});

for (const [term, matches] of [
	["Lumen", true],
	["lUmEn", true],
	[" Lumen ", true],
	["lum", false],
	["Lumen TV", false],
	["Dune", false],
]) {
	test(`channel entry matches the complete channel name: ${JSON.stringify(term)}`, async t => {
		const requests = backend(t, { items: [] });
		for (const [path, topResultsOnly] of [
			["/uts/v3/search", false],
			["/uts/v3/search", true],
			["/uts/v3/shelves/uts.col.search.TR", false],
			["/uts/v3/shelves/uts.col.search.BR", false],
		]) {
			const query = new URLSearchParams({ searchTerm: term, topResultsOnly: String(topResultsOnly), sf: "143470" });
			const actual = await replay(t, path, {}, query.toString());
			if (!matches) {
				assert.deepEqual(actual, {});
				continue;
			}
			const shelves = actual.data.canvas?.shelves ?? [actual.data.shelf];
			assert.deepEqual(
				shelves.map(({ id }) => id),
				path.endsWith(".BR") ? ["uts.col.search.BR"] : topResultsOnly || path.endsWith(".TR") ? ["uts.col.search.TR"] : ["uts.col.search.TR", "uts.col.search.BR"],
			);
			for (const shelf of shelves) {
				assert.deepEqual(
					shelf.items.map(({ id }) => id),
					[brandId],
				);
				assert.equal(new URL(shelf.header.url).searchParams.get("searchTerm"), term);
				assert.match(shelf.header.url, /^https:\/\/tv.apple.com\/tw\/shelf\//);
			}
			assert.deepEqual(await replay(t, path, actual, query.toString()), actual);
		}
		for (const request of requests) assert.equal(request.url.searchParams.get("q"), term);
	});
}

test("matching channel searches preserve both the channel entry and backend films", async t => {
	backend(t);
	for (const topResultsOnly of [false, true]) {
		const query = `searchTerm=Lumen&topResultsOnly=${topResultsOnly}`;
		const actual = await replay(t, "/uts/v3/search", {}, query);
		const shelves = actual.data.canvas.shelves;
		if (topResultsOnly)
			assert.deepEqual(
				shelves[0].items.map(({ id }) => id),
				[brandId, ...movies.map(({ id }) => id)],
			);
		else {
			assert.deepEqual(
				shelves.map(({ id }) => id),
				["edt.shelf.lumen-search", "uts.col.search.TR", "uts.col.search.BR"],
			);
			assert.deepEqual(shelves[0].items, movies);
			assert.deepEqual(
				shelves[1].items.map(({ id }) => id),
				[brandId],
			);
			assert.deepEqual(
				shelves[2].items.map(({ id }) => id),
				[brandId],
			);
		}
		assert.deepEqual(await replay(t, "/uts/v3/search", actual, query), actual);
	}
});

test("unrelated top-results shelf navigation merges backend films without a channel entry", async t => {
	const requests = backend(t);
	const original = { data: { shelf: { id: "uts.col.search.TR", header: { title: "Official" }, items: [{ id: "apple" }], nextToken: "keep" } } };
	const actual = await replay(t, "/uts/v3/shelves/uts.col.search.TR", original, "searchTerm=Dune");
	assert.deepEqual(
		actual.data.shelf.items.map(({ id }) => id),
		[...movies.map(({ id }) => id), "apple"],
	);
	assert.deepEqual(actual.data.shelf.header, original.data.shelf.header);
	assert.equal(actual.data.shelf.nextToken, "keep");
	const before = requests.length;
	const brandShelf = { data: { shelf: { id: "uts.col.search.BR", items: [{ id: "disney" }] } } };
	assert.deepEqual(await replay(t, "/uts/v3/shelves/uts.col.search.BR", brandShelf, "searchTerm=Dune"), brandShelf);
	assert.equal(requests.length, before);
});

for (const fixture of fixtures.search.filter(({ stage }) => stage !== "landing")) {
	test(`${fixture.case}: backend results and official TR/BR preserve every original field`, async t => {
		const requests = backend(t);
		const actual = await replay(t, "/uts/v3/search", fixture.body, `sf=${fixture.sf}&searchTerm=${fixture.searchTerm}`);
		assert.equal(actual.data.canvas.shelves[0].id, "edt.shelf.lumen-search");
		assert.deepEqual(actual.data.canvas.shelves[0].items, movies);
		assert.equal(actual.data.canvas.shelves[0].header.title, "Lumen");
		for (const shelf of actual.data.canvas.shelves.filter(({ id }) => ["uts.col.search.TR", "uts.col.search.BR"].includes(id)))
			assert.equal(
				shelf.items.some(({ id }) => id === brandId),
				false,
			);
		assert.equal(actual.data.tabs, undefined);
		assert.equal(actual.data.canvas.filters, undefined);
		assert.equal(requests.length, 1);
		assert.equal(requests[0].url.searchParams.get("q"), fixture.searchTerm);
		assert.equal(requests[0].options.headers["X-Lumen-Key"], lumenKey);
		assert.deepEqual(await replay(t, "/uts/v3/search", actual, `sf=${fixture.sf}&searchTerm=${fixture.searchTerm}`), actual);
		actual.data.canvas.shelves.shift();
		delete actual.data.channels[brandId];
		assert.deepEqual(actual, fixture.body);
	});
}

test("film searches preserve query encoding and existing rows without creating channel categories", async t => {
	const requests = backend(t);
	const original = {
		data: {
			canvas: {
				url: "https://tv.apple.com/tw/search",
				shelves: [
					{ id: "uts.col.search.MV", items: [{ id: "movie" }] },
					{ id: "uts.col.search.PN", items: [{ id: "person" }] },
				],
				nextToken: "keep",
			},
		},
	};
	const actual = await replay(t, "/uts/v3/search", original, "sf=143470&searchTerm=Star+Wars+%E6%98%9F%E7%90%83");
	assert.deepEqual(
		actual.data.canvas.shelves.map(({ id }) => id),
		["edt.shelf.lumen-search", "uts.col.search.MV", "uts.col.search.PN"],
	);
	assert.equal(requests[0].url.origin + requests[0].url.pathname, "https://www.lumen.ax/api/appletv/v1/search");
	assert.deepEqual([...requests[0].url.searchParams], [["q", "Star Wars 星球"]]);
	assert.equal(actual.data.canvas.nextToken, "keep");
	assert.deepEqual(actual.data.canvas.shelves[1], original.data.canvas.shelves[0]);
	assert.deepEqual(actual.data.canvas.shelves[2], original.data.canvas.shelves[1]);
});

for (const [name, payload, status] of [
	["empty", { items: [] }, 200],
	["HTTP failure", { items: movies }, 503],
	["invalid JSON", "not JSON", 200],
	["missing items", {}, 200],
	["invalid items", { items: {} }, 200],
	["network failure", new Error("offline"), 200],
	["timeout", new Error("request timeout"), 200],
]) {
	test(`search ${name} preserves Apple results and logs failures`, async t => {
		backend(t, payload, status);
		const errors = t.mock.method(Console, "error", () => {});
		const original = { id: "apple", items: [{ id: "original" }], nextToken: "keep" };
		const actual = await replay(t, "/uts/v3/search", { data: { canvas: { shelves: [original] } } }, "searchTerm=Dune");
		assert.deepEqual(
			actual.data.canvas.shelves.find(({ id }) => id === "apple"),
			original,
		);
		assert.equal(
			actual.data.canvas.shelves.some(({ id }) => id === "edt.shelf.lumen-search"),
			false,
		);
		assert.deepEqual(actual, { data: { canvas: { shelves: [original] } } });
		assert.equal(errors.mock.callCount(), name === "empty" ? 0 : 1);
	});
}

test("blank search terms do not call the backend", async t => {
	const requests = backend(t);
	for (const query of ["", "searchTerm=+%20+"]) {
		const actual = await replay(t, "/uts/v3/search", {}, query);
		assert.deepEqual(actual, {});
	}
	assert.equal(requests.length, 0);
});

test("topResultsOnly merges backend items into TR without extra categories", async t => {
	backend(t);
	const original = { data: { canvas: { shelves: [{ id: "uts.col.search.TR", header: { title: "Top" }, items: [{ id: "apple" }], nextToken: "keep" }] } } };
	const actual = await replay(t, "/uts/v3/search", original, "searchTerm=Dune&topResultsOnly=true");
	assert.equal(actual.data.canvas.shelves.length, 1);
	assert.deepEqual(
		actual.data.canvas.shelves[0].items.map(({ id }) => id),
		[...movies.map(({ id }) => id), "apple"],
	);
	assert.equal(actual.data.canvas.shelves[0].nextToken, "keep");
	assert.deepEqual(await replay(t, "/uts/v3/search", actual, "searchTerm=Dune&topResultsOnly=true"), actual);
});

for (const id of ["uts.col.search.TR", "uts.col.search.BR"]) {
	test(`${id} shelf navigation uses data.shelf and preserves the original header`, async t => {
		const requests = backend(t);
		const original = { data: { shelf: { id, header: { title: "Official title", supportsSeeAllView: true }, url: "https://tv.apple.com/tw/shelf/official", items: [{ id: "apple" }], nextToken: "keep" } } };
		const actual = await replay(t, `/uts/v3/shelves/${id}`, original, "searchTerm=Lumen");
		assert.equal(actual.data.canvas, undefined);
		assert.deepEqual(actual.data.shelf.header, original.data.shelf.header);
		assert.equal(actual.data.shelf.items[0].id, brandId);
		assert.deepEqual(actual.data.shelf.items.at(-1), { id: "apple" });
		assert.equal(actual.data.shelf.nextToken, "keep");
		assert.equal(requests.length, id.endsWith("TR") ? 1 : 0);
		const empty = await replay(t, `/uts/v3/shelves/${id}`, {}, "searchTerm=");
		assert.deepEqual(empty, {});
	});
}

for (const [variant, response] of [
	["release", ResponseRelease],
	["dev", ResponseDev],
]) {
	for (const path of ["/uts/v3/search", "/uts/v3/shelves/uts.col.search.TR", "/uts/v3/shelves/uts.col.search.BR"]) {
		test(`${variant}: selected Lumen supplies authenticated results through ${path}`, async t => {
			const requests = backend(t);
			const actual = await replay(t, path, {}, "searchTerm=Lumen&topResultsOnly=true", response, `Brands=Lumen&LumenKey=${lumenKey}&LogLevel=OFF`);
			const shelf = actual.data.shelf ?? actual.data.canvas.shelves[0];
			assert.deepEqual(
				shelf.items.map(({ id }) => id),
				path.endsWith(".BR") ? [brandId] : [brandId, ...movies.map(({ id }) => id)],
			);
			assert.equal(actual.data.channels[brandId].type, "Brand");
			assert.equal(requests.length, path.endsWith(".BR") ? 0 : 1);
		});
	}

	test(`${variant}: deselected Lumen adds no navigation, cards, preferences or search results`, async t => {
		const requests = backend(t);
		for (const [path, body] of [
			["/uts/v3/configurations", { data: { applicationProps: { tabs: [{ type: "Library" }] } } }],
			["/uts/v3/channels", { data: { channels: {} } }],
			["/uts/v3/user/settings", { data: { brandSidebarSetting: {} } }],
			["/uts/v3/canvases/Roots/tahoma_watchnow", { data: { canvas: { shelves: [{ displayType: "brandLockup", items: [] }] } } }],
			["/uts/v3/search/landing", {}],
			["/uts/v3/search", {}],
			["/uts/v3/shelves/uts.col.search.TR", {}],
			["/uts/v3/shelves/uts.col.search.BR", {}],
		])
			assert.deepEqual(await replay(t, path, body, "searchTerm=Lumen", response, `Brands=[]&LumenKey=${lumenKey}&LogLevel=OFF`), body);
		assert.equal(requests.length, 0);
	});
}

test("uninvestigated v2 routes retain their existing behavior", async t => {
	const requests = backend(t);
	const body = { data: { canvas: { shelves: [] } } };
	assert.deepEqual(await replay(t, "/uts/v2/search/incremental", body, "searchTerm=Dune"), body);
	assert.deepEqual(await replay(t, "/uts/v2/search/landing", body), body);
	assert.equal(requests.length, 0);
});
