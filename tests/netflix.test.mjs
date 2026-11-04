import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Console, Storage } from "@nsnanocat/util";
import InjectBrand from "../src/class/InjectBrand.mjs";
import { Request, RequestDev, Response, ResponseDev } from "./host.mjs";

const samples = JSON.parse(readFileSync(new URL("fixtures/netflix-brand.json", import.meta.url)));
const artwork = JSON.parse(readFileSync(new URL("fixtures/netflix-brand-artwork.json", import.meta.url)));
const id = "tvs.sbd.9000";
const lumen = "tvs.sbd.lumen";
const paths = ["/uts/v3/channels/tvs.sbd.9000", "/uts/v3/canvases/Channels/tvs.sbd.9000", "/uts/v3/shelves/uts.col.ChannelUpNext.tvs.sbd.9000", "/uts/v3/shelves/edt.col.netflix?ctx_brand=tvs.sbd.9000", "/uts/v3/shows/umc.cmc.3qvhpqcspdkzmwmwyptyj9v0m?ctx_brand=tvs.sbd.9000"];
Console.logLevel = "OFF";

async function replay(t, processResponse, path, body, pfm, brands = "Netflix,Lumen") {
	t.mock.method(Storage, "getItem", () => ({}));
	const url = new URL(path, "https://uts-api.itunes.apple.com");
	if (pfm !== undefined) url.searchParams.set("pfm", pfm);
	url.searchParams.set("sf", "143470");
	const response = await processResponse({ url: url.toString(), headers: {}, $argument: `${brands === null ? "" : `Brands=${brands}&`}LogLevel=OFF` }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
	return JSON.parse(response.body);
}

for (const [variant, processResponse, processRequest] of [
	["release", Response, Request],
	["dev", ResponseDev, RequestDev],
]) {
	for (const pfm of ["iphone", "ipad", "atv", "appletv"]) {
		test(`${variant}: ${pfm} Netflix cards have usable artwork in Home, moretv and search landing`, async t => {
			for (const brands of ["Netflix", "Lumen,Netflix"]) {
				const home = await replay(
					t,
					processResponse,
					"/uts/v3/canvases/Roots/tahoma_watchnow",
					{
						data: {
							canvas: {
								shelves: [
									{ displayType: "channelLockup", items: [] },
									{ displayType: "brandLockup", items: [] },
									{ displayType: "doorLockupWithSections", sections: [{ id: "uts.shlfsect.moretv", items: [] }] },
								],
							},
						},
					},
					pfm,
					brands,
				);
				const containers = [home.data.canvas.shelves[0], home.data.canvas.shelves[1], home.data.canvas.shelves[2].sections[0]];
				for (const path of ["/uts/v3/search/landing", "/uts/v3/canvases/Roots/tahoma_searchlanding"]) containers.push((await replay(t, processResponse, path, {}, pfm, brands)).data.canvas.shelves[0]);
				for (const container of containers) {
					const card = container.items.find(item => item.id === id);
					assert.deepEqual(card.images.shelfItemImage, artwork.shelfItemImage);
					assert.deepEqual(card.images.appIcon, samples[["iphone", "ipad"].includes(pfm) ? "iphone" : "atv"].images.appIcon);
					assert.deepEqual(
						container.items.map(item => item.id),
						brands === "Netflix" ? [id] : [lumen, id],
					);
				}
			}
		});
	}

	for (const pfm of ["atv", "appletv", "iphone", "ipad", "desktop", undefined]) {
		test(`${variant}: Netflix navigation, dictionary and sidebar preferences follow platform ${pfm}`, async t => {
			const enabled = pfm !== "desktop" && pfm !== undefined;
			const body = { data: { applicationProps: { tabs: [{ type: "WatchNow" }, { type: "Library" }] } } };
			const actual = await replay(t, processResponse, "/uts/v3/configurations", body, pfm);
			const tabs = actual.data.applicationProps.tabs;
			assert.deepEqual(
				tabs.map(({ type }) => type),
				["WatchNow", "ChannelsAndApps", "Library"],
			);
			assert.deepEqual(
				tabs[1].subTabs.map(({ target }) => target.id),
				enabled ? [lumen, id] : [lumen],
			);
			if (enabled) {
				const brand = actual.data.channels[id];
				const sample = samples[["iphone", "ipad"].includes(pfm) ? "iphone" : "atv"];
				assert.deepEqual(Object.fromEntries(Object.keys(sample).map(key => [key, brand[key]])), { ...sample, images: { ...sample.images, shelfItemImage: artwork.shelfItemImage } });
				assert.equal(tabs[1].subTabs[1].type, "Brand");
				assert.equal(tabs[1].subTabs[1].brandType, "App");
				assert.equal(tabs[1].subTabs[1].destinationType, "Target");
				assert.equal(tabs[1].subTabs[1].isPinned, false);
				assert.equal(tabs[1].subTabs[1].canBeHiddenFromNavigation, true);
				assert.deepEqual(tabs[1].subTabs[1].images.defaultImage, sample.images.appIcon);
				assert.deepEqual(tabs[1].subTabs[1].target, brand);
				assert.deepEqual(tabs[1].subTabs[1].universalLinks, [sample.url]);
				for (const key of ["isInstalled", "isSubscribed", "isConsented"]) assert.equal(Object.hasOwn(brand, key), false);
			} else assert.equal(actual.data.channels[id], undefined);
			assert.deepEqual(await replay(t, processResponse, "/uts/v3/configurations", actual, pfm), actual);
			const channels = await replay(t, processResponse, "/uts/v3/channels", {}, pfm);
			assert.equal(Object.hasOwn(channels.data.channels, id), enabled);
			const preferences = await replay(t, processResponse, "/uts/v3/user/settings", {}, pfm);
			assert.deepEqual(preferences.data.brandSidebarSetting, enabled ? { [lumen]: { isHidden: false, isPinned: false }, [id]: { isHidden: false, isPinned: false } } : { [lumen]: { isHidden: false, isPinned: false } });
			assert.equal(preferences.data.brandConsentSettings, undefined);
		});
	}

	for (const [brands, expected] of [
		["Netflix", [id]],
		["Lumen", [lumen]],
		["[]", []],
		[null, [lumen, id]],
	]) {
		test(`${variant}: Netflix selection ${brands ?? "default"} follows existing Brands rules`, async t => {
			const actual = await replay(t, processResponse, "/uts/v3/configurations", { data: { applicationProps: { tabs: [{ type: "Library" }] } } }, "atv", brands);
			const group = actual.data.applicationProps.tabs.find(({ type }) => type === "ChannelsAndApps");
			assert.deepEqual(group?.subTabs.map(({ target }) => target.id) ?? [], expected);
		});
	}

	test(`${variant}: Config capabilities take precedence while account state and sidebar extensions survive injection`, async t => {
		for (const flag of [true, false]) {
			const brand = { ...structuredClone(samples.iphone), title: "Server Netflix", url: "https://tv.apple.com/gb/channel/netflix/tvs.sbd.9000", isPinned: !flag, isConsented: flag, isInstalled: flag, isSubscribed: flag, isWatchlistEnabled: flag, extension: { value: "preserved" } };
			const tab = { type: "Brand", target: brand, isPinned: flag, isHidden: flag, extension: "sidebar" };
			const body = { data: { applicationProps: { tabs: [{ type: "ChannelsAndApps", title: "Original group", subTabs: [{ target: { id: "other" } }, tab] }] }, channels: { [id]: brand, other: { id: "other" } } } };
			const actual = await replay(t, processResponse, "/uts/v3/configurations", body, "ipad");
			assert.deepEqual(actual.data.channels[id], { ...brand, images: { ...brand.images, shelfItemImage: artwork.shelfItemImage }, url: samples.iphone.url, flavor: "FullBleed", intents: ["NAVIGATE"], isAppleMusicImmersiveBrand: false, isMountainBrand: false, isStaging: false, isWatchlistEnabled: false });
			const group = actual.data.applicationProps.tabs[0];
			assert.equal(group.title, "Original group");
			assert.deepEqual(
				group.subTabs.map(({ target }) => target.id),
				[lumen, id, "other"],
			);
			assert.equal(group.subTabs[1].isPinned, flag);
			assert.equal(group.subTabs[1].isHidden, flag);
			assert.equal(group.subTabs[1].extension, "sidebar");
			assert.deepEqual(await replay(t, processResponse, "/uts/v3/configurations", actual, "ipad"), actual);
			const preferences = { data: { brandSidebarSetting: { [id]: { isPinned: flag, isHidden: flag, extension: "preserved" } }, brandConsentSettings: { [id]: { isConsented: flag } } } };
			assert.deepEqual(await replay(t, processResponse, "/uts/v3/user/settings", preferences, "ipad", "Netflix"), preferences);
		}
	});

	test(`${variant}: desktop and deselection preserve upstream Netflix objects`, async t => {
		for (const [pfm, brands] of [
			["desktop", "Netflix"],
			[undefined, "Netflix"],
			["atv", "[]"],
		]) {
			const body = { data: { applicationProps: { tabs: [{ type: "ChannelsAndApps", subTabs: [{ type: "Brand", target: structuredClone(samples.atv), extension: "server" }] }] }, channels: { [id]: structuredClone(samples.atv) } } };
			assert.deepEqual(await replay(t, processResponse, "/uts/v3/configurations", body, pfm, brands), body);
			assert.deepEqual(await replay(t, processResponse, "/uts/v3/channels", { data: { channels: body.data.channels } }, pfm, brands), { data: { channels: body.data.channels } });
		}
	});

	test(`${variant}: App cards follow Config order in Home lockups, moretv and Browse`, async t => {
		const body = {
			data: {
				canvas: {
					shelves: [
						{ displayType: "channelLockup", items: [{ id: "original" }] },
						{ displayType: "brandLockup", items: [] },
						{ displayType: "doorLockupWithSections", sections: [{ id: "uts.shlfsect.moretv", items: [] }] },
					],
				},
			},
		};
		const home = await replay(t, processResponse, "/uts/v3/canvases/Roots/tahoma_watchnow", body, "atv");
		for (const container of [home.data.canvas.shelves[0], home.data.canvas.shelves[1], home.data.canvas.shelves[2].sections[0]]) {
			assert.deepEqual(
				container.items.slice(0, 2).map(({ id }) => id),
				[lumen, id],
			);
			assert.deepEqual(container.items[1].appBundleIds, ["com.netflix.Netflix"]);
			assert.deepEqual(container.items[1].images.appIcon, samples.atv.images.appIcon);
		}
		assert.deepEqual(home.data.canvas.shelves[0].items[2], { id: "original" });
		assert.deepEqual(await replay(t, processResponse, "/uts/v3/canvases/Roots/tahoma_watchnow", home, "atv"), home);
		for (const path of ["/uts/v3/search/landing", "/uts/v3/canvases/Roots/tahoma_searchlanding"])
			for (const source of [{}, { data: { canvas: { shelves: [{ id: "official-browse", displayType: "brick", isGrid: true, items: [{ id: "original" }] }] } } }]) {
				const browse = await replay(t, processResponse, path, source, "iphone");
				const items = browse.data.canvas.shelves[0].items;
				assert.deepEqual(
					items.slice(0, 2).map(({ id }) => id),
					[lumen, id],
				);
				assert.deepEqual(items[1].images.appIcon, samples.iphone.images.appIcon);
				assert.deepEqual(await replay(t, processResponse, path, browse, "iphone"), browse);
			}
		const netflixOnly = await replay(t, processResponse, "/uts/v3/search/landing", {}, "ipad", "Netflix");
		assert.deepEqual(
			netflixOnly.data.canvas.shelves[0].items.map(({ id }) => id),
			[id],
		);
	});

	test(`${variant}: Netflix leaves upstream search results and programme shelves unchanged`, async t => {
		for (const [path, body] of [
			["/uts/v3/search?searchTerm=Netflix", {}],
			["/uts/v3/shelves/uts.col.search.TR?searchTerm=Netflix", {}],
			["/uts/v3/shelves/uts.col.search.BR?searchTerm=Netflix", {}],
			["/uts/v3/canvases/Channels/tvs.sbd.9000", { data: { canvas: { id: "uts.tcvs.brand-page-fallback", shelves: [{ id: "uts.col.ChannelUpNext.tvs.sbd.9000", displayType: "upNextLockup", items: [] }] }, channels: { [id]: samples.atv } } }],
		])
			assert.deepEqual(await replay(t, processResponse, path, body, "atv", "Netflix"), body);
	});

	test(`${variant}: Netflix-specific reads use the US storefront and preserve platform and language`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		for (const path of paths)
			for (const pfm of ["atv", "appletv", "iphone", "ipad"])
				for (const query of ["sf=143470&sfh=143470-18,33&region=TW&country=TW&locale=zh-Hant", "sfh=143470-18,33", ""]) {
					const url = new URL(path, "https://uts-api.itunes.apple.com");
					for (const [key, value] of new URLSearchParams(query)) url.searchParams.set(key, value);
					url.searchParams.set("pfm", pfm);
					const original = new URL(url);
					for (const header of ["X-Apple-Store-Front", "x-apple-store-front", "X-APPLE-STORE-FRONT"]) {
						const headers = { [header]: "143470-1,29", "Accept-Language": "zh-Hant-TW", "X-Apple-I-Locale": "zh_Hant_TW" };
						const { $request } = await processRequest({ method: "GET", url: url.toString(), headers, $argument: "Brands=Netflix&CountryCode.Channels=JP&CountryCode.Others=JP&CountryCode.Search=JP&LogLevel=OFF" });
						const actual = new URL($request.url);
						assert.equal(actual.searchParams.get("sf"), "143441");
						assert.equal(actual.searchParams.get("sfh"), original.searchParams.has("sfh") ? "143441-18,33" : null);
						for (const key of ["region", "country"]) assert.equal(actual.searchParams.get(key), original.searchParams.has(key) ? "US" : null);
						assert.equal(actual.searchParams.get("pfm"), pfm);
						assert.equal(actual.searchParams.get("locale"), original.searchParams.get("locale"));
						assert.deepEqual($request.headers, { [header]: "143441-1,29", "Accept-Language": "zh-Hant-TW", "X-Apple-I-Locale": "zh_Hant_TW" });
					}
				}
		const { $request } = await processRequest({ url: "https://uts-api.itunes.apple.com/uts/v3/canvases/Channels/tvs.sbd.9000?pfm=atv&sf=143470&locale=en-US", headers: {}, $argument: "Brands=Netflix&Locale=ja-JP&LogLevel=OFF" });
		assert.equal(new URL($request.url).searchParams.get("locale"), "ja-JP");
		for (const method of ["HEAD", undefined]) {
			const { $request } = await processRequest({ method, url: "https://uts-api.itunes.apple.com/uts/v3/channels/tvs.sbd.9000?pfm=atv", headers: {}, $argument: "Brands=Netflix&LogLevel=OFF" });
			assert.equal(new URL($request.url).searchParams.get("sf"), "143441");
			assert.equal(new URL($request.url).searchParams.get("locale"), null);
			assert.deepEqual($request.headers, {});
		}
	});

	test(`${variant}: Netflix country selection supports explicit regions and AUTO independently of brand injection`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		for (const path of paths)
			for (const [country, sf] of [
				["JP", "143462"],
				["GB", "143444"],
				["AUTO", "143470"],
			])
				for (const [pfm, brands, method] of [
					["atv", "Netflix", "GET"],
					["desktop", "[]", "GET"],
					[undefined, "[]", "POST"],
				]) {
					const url = new URL(path, "https://uts-api.itunes.apple.com");
					if (pfm !== undefined) url.searchParams.set("pfm", pfm);
					for (const [key, value] of new URLSearchParams("sf=143470&sfh=143470-18,33&region=TW&country=TW&locale=zh-Hant")) url.searchParams.set(key, value);
					const { $request } = await processRequest({ method, url: url.toString(), headers: { "X-Apple-Store-Front": "143470-1,29" }, $argument: `Brands=${brands}&CountryCode.Netflix=${country}&CountryCode.Channels=US&CountryCode.Others=US&CountryCode.TV=US&LogLevel=OFF` });
					const actual = new URL($request.url);
					assert.equal(actual.searchParams.get("sf"), sf);
					assert.equal(actual.searchParams.get("sfh"), `${sf}-18,33`);
					for (const key of ["region", "country"]) assert.equal(actual.searchParams.get(key), country === "AUTO" ? "TW" : country);
					assert.equal(actual.searchParams.get("pfm"), pfm ?? null);
					assert.equal(actual.searchParams.get("locale"), "zh-Hant");
					assert.equal($request.headers["X-Apple-Store-Front"], `${sf}-1,29`);
				}
	});

	test(`${variant}: shared endpoints and other brands retain their own country categories`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		for (const path of ["/uts/v3/configurations", "/uts/v3/channels", "/uts/v3/user/settings", "/uts/v3/canvases/Channels/tvs.sbd.lumen", "/uts/v3/channels/tvs.sbd.9001", ...["/uts/v3/configurations", "/uts/v3/channels", "/uts/v3/user/settings", "/uts/v3/search"].map(path => `${path}?ctx_brand=tvs.sbd.9000`)]) {
			const url = new URL(path, "https://uts-api.itunes.apple.com");
			url.searchParams.set("pfm", "atv");
			url.searchParams.set("sf", "143470");
			const { $request } = await processRequest({ method: "GET", url: url.toString(), headers: { "X-Apple-Store-Front": "143470-1,29" }, $argument: "Brands=Netflix&CountryCode.Netflix=US&CountryCode.Channels=JP&CountryCode.Others=JP&CountryCode.Configs=JP&CountryCode.Settings=JP&CountryCode.Search=JP&LogLevel=OFF" });
			assert.equal(new URL($request.url).searchParams.get("sf"), "143462", path);
			assert.equal($request.headers["X-Apple-Store-Front"], "143462-1,29", path);
		}
	});
}

test("Netflix target shares the dictionary Brand while sidebar images and account preferences retain their boundaries", () => {
	const options = { pfm: "atv", region: "tw", settings: { Brands: [id] } };
	const injector = new InjectBrand(options);
	const body = {};
	injector.InjectUTSConfigurationChannelsAndApps(body, options);
	const tab = body.data.applicationProps.tabs[0].subTabs[0];
	assert.equal(tab.target, body.data.channels[id]);
	assert.notEqual(tab.images.defaultImage, tab.target.images.appIcon);
	tab.images.defaultImage.width = 1;
	assert.equal(tab.target.images.appIcon.width, 1280);
	const preferences = { [id]: { isHidden: true, isPinned: true, extension: {} } };
	const state = preferences[id];
	assert.equal(injector.InjectUTSUserSettings(preferences), preferences);
	assert.equal(preferences[id], state);
});
