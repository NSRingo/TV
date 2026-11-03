import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Console, Storage } from "@nsnanocat/util";
import InjectBrand from "../src/class/InjectBrand.mjs";
import { ResponseDev } from "./host.mjs";
import { Response as ResponseRelease } from "./host.mjs";

const fixtures = JSON.parse(readFileSync(new URL("fixtures/channel-settings.json", import.meta.url)));
const brandId = "tvs.sbd.lumen";
const settings = { Tabs: ["tvs.sbd.lumen"] };
Console.logLevel = "OFF";

for (const platform of ["iphone", "ipad", "atv", "desktop"]) {
	test(`shared Brand ${platform}: preserves the dictionary, other providers and existing Lumen state`, () => {
		const body = structuredClone(fixtures.channels);
		const channels = body.data.channels;
		channels[brandId] = { id: brandId, isSubscribed: false, isInstalled: false, isConsented: false };
		const injector = new InjectBrand({ settings });
		assert.equal(injector.InjectChannels(channels, { pfm: platform, region: "tw", settings }), channels);
		assert.equal(body.data.channels, channels);
		assert.equal(channels.tvs, undefined);
		for (const [id, brand] of Object.entries(fixtures.channels.data.channels)) assert.deepEqual(channels[id], brand);
		const brand = channels[brandId];
		assert.equal(brand.type, "Brand");
		assert.equal(brand.url, `https://tv.apple.com/tw/channel/lumen/${brandId}`);
		assert.equal(brand.isApSubscription, true);
		assert.equal(brand.isFirstParty, true);
		assert.equal(brand.isSubscribed, false);
		assert.equal(brand.isInstalled, false);
		assert.equal(brand.isConsented, false);
		assert.deepEqual(brand.appBundleIds, [["iphone", "ipad"].includes(platform) ? "com.apple.tv" : "com.apple.TVWatchList"]);
		const once = structuredClone(body);
		injector.InjectChannels(channels, { pfm: platform, region: "tw", settings });
		assert.deepEqual(body, once);
	});
}

test("dev channels creates a missing dictionary without adding navigation or preferences", async t => {
	t.mock.method(Storage, "getItem", () => ({}));
	const response = await ResponseDev({ url: "https://uts-api.itunes.apple.com/uts/v3/channels?pfm=iphone&sf=143441", headers: {}, $argument: "LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: "{}" });
	const body = JSON.parse(response.body);
	assert.deepEqual(Object.keys(body.data), ["channels"]);
	assert.equal(body.data.channels[brandId].id, brandId);
});

for (const body of [{}, { data: {} }, { data: { brandSidebarSetting: {} } }]) {
	test(`dev settings creates only a missing sidebar entry: ${JSON.stringify(body)}`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		const response = await ResponseDev({ url: "https://uts-api.itunes.apple.com/uts/v3/user/settings?pfm=iphone&sf=143441", headers: {}, $argument: "LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
		const actual = JSON.parse(response.body);
		assert.deepEqual(actual.data.brandSidebarSetting, { [brandId]: { isHidden: false, isPinned: false } });
		assert.equal(actual.data.brandConsentSettings, undefined);
		assert.equal(actual.data.channels, undefined);
	});
}

test("settings retains App consent objects and all account preferences", () => {
	const body = structuredClone(fixtures.settings);
	const consent = body.data.brandConsentSettings;
	const sidebar = body.data.brandSidebarSetting;
	const injector = new InjectBrand({ settings });
	assert.equal(injector.InjectUTSUserSettings(sidebar), sidebar);
	assert.equal(body.data.brandConsentSettings, consent);
	assert.equal(body.data.brandSidebarSetting, sidebar);
	assert.equal(sidebar.tvs, undefined);
	const once = structuredClone(body);
	injector.InjectUTSUserSettings(sidebar);
	assert.deepEqual(body, once);
	delete body.data.brandSidebarSetting[brandId];
	assert.deepEqual(body, fixtures.settings);
});

test("settings preserves an existing hidden/pinned Lumen record and extensions by reference", () => {
	const state = { isHidden: true, isPinned: true, custom: "preserved" };
	const body = { data: { brandSidebarSetting: { [brandId]: state } } };
	new InjectBrand({ settings }).InjectUTSUserSettings(body.data.brandSidebarSetting);
	assert.equal(body.data.brandSidebarSetting[brandId], state);
	assert.deepEqual(state, { isHidden: true, isPinned: true, custom: "preserved" });
});

for (const [path, source] of [
	["/uts/v3/channels", fixtures.channels],
	["/uts/v3/user/settings", fixtures.settings],
]) {
	test(`dev routes ${path} to the dedicated injector, with release behavior preserved`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		const request = { url: `https://uts-api.itunes.apple.com${path}?caller=wlk&pfm=atv&sf=143441&v=101`, headers: {}, $argument: "LogLevel=OFF" };
		const input = { headers: { "Content-Type": "application/json" }, body: JSON.stringify(source) };
		const actual = JSON.parse((await ResponseDev(request, { ...input })).body);
		switch (path) {
			case "/uts/v3/channels":
				assert.equal(actual.data.channels[brandId].type, "Brand");
				assert.equal(new URL(actual.data.channels[brandId].url).pathname.split("/")[1], "us");
				delete actual.data.channels[brandId];
				for (const id of ["tvs.sbd.4000", "tvs.sbd.241000", "tvs.sbd.7000"]) {
					assert.equal(actual.data.channels[id].isFirstParty, true);
					assert.equal(actual.data.channels[id].isApSubscription, true);
					assert.equal(actual.data.channels[id].isSubscribed, undefined);
					delete actual.data.channels[id];
				}
				break;
			case "/uts/v3/user/settings":
				assert.deepEqual(actual.data.brandSidebarSetting[brandId], { isHidden: false, isPinned: false });
				delete actual.data.brandSidebarSetting[brandId];
				break;
		}
		assert.deepEqual(actual, source);
		assert.deepEqual(JSON.parse((await ResponseRelease(request, { ...input })).body), source);
	});
}
