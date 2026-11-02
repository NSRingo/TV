import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Console, Storage } from "@nsnanocat/util";
import InjectBrand from "../src/class/InjectBrand.mjs";
import { Request } from "../src/process/Request.mjs";
import { Request as RequestDev } from "../src/process/Request.dev.mjs";
import { Response } from "../src/process/Response.mjs";
import { Response as ResponseDev } from "../src/process/Response.dev.mjs";

const fixture = JSON.parse(readFileSync(new URL("fixtures/us-tabs.json", import.meta.url)));
Console.logLevel = "OFF";

for (const [variant, processResponse, processRequest] of [
	["release", Response, Request],
	["dev", ResponseDev, RequestDev],
]) {
	test(`${variant}: native US Formula 1 stays between Apple TV and MLS, with Search first`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		const response = await processResponse({ url: fixture.url, headers: {}, $argument: "LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(fixture.body) });
		const tabs = JSON.parse(response.body).data.applicationProps.tabs;
		assert.deepEqual(
			tabs.map(({ type }) => type),
			["Search", "WatchNow", "Originals", "Grevy", "MLS", "Sports", ...(variant === "dev" ? ["Store", "ChannelsAndApps"] : ["Store"]), "Library"],
		);
		assert.deepEqual(
			tabs.find(({ type }) => type === "Grevy"),
			fixture.body.data.applicationProps.tabs[3],
		);
	});

	for (const [platform, version] of [
		["desktop", 92],
		["ipad", 100],
		["atv", 100],
		["appletv", 100],
		["desktop", 91],
		["iphone", 100],
		["iPhone", 1],
	]) {
		test(`${variant}: an existing tabs array gets Formula 1 regardless of ${platform} v${version}`, async t => {
			t.mock.method(Storage, "getItem", () => ({}));
			const body = structuredClone(fixture.body);
			body.data.applicationProps.tabs.splice(3, 1);
			const url = new URL(fixture.url);
			url.searchParams.set("pfm", platform);
			url.searchParams.set("v", version);
			const response = await processResponse({ url: url.toString(), headers: {}, $argument: "LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
			const tabs = JSON.parse(response.body).data.applicationProps.tabs;
			const index = tabs.findIndex(({ type }) => type === "Grevy");
			assert.equal(index, 3);
			assert.equal(tabs[index - 1].type, "Originals");
			assert.deepEqual(tabs[index].target, fixture.body.data.applicationProps.tabs[3].target);
			assert.deepEqual(tabs[index].universalLinks, ["https://tv.apple.com/f1"]);
			assert.deepEqual(tabs[index].images, fixture.body.data.applicationProps.tabs[3].images);
		});
	}

	test(`${variant}: injected Apple navigation matches the complete official tab objects`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		const body = structuredClone(fixture.body);
		const types = ["Originals", "Grevy", "MLS"];
		const expected = body.data.applicationProps.tabs.filter(({ type }) => types.includes(type));
		body.data.applicationProps.tabs = body.data.applicationProps.tabs.filter(({ type }) => !types.includes(type));
		const response = await processResponse({ url: fixture.url, headers: {}, $argument: "LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
		const actual = JSON.parse(response.body).data.applicationProps.tabs.filter(({ type }) => types.includes(type));
		assert.deepEqual(actual, expected);
	});

	test(`${variant}: existing Apple navigation is preserved as complete server objects`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		const body = structuredClone(fixture.body);
		const types = ["Originals", "Grevy", "MLS"];
		const expected = body.data.applicationProps.tabs.filter(({ type }) => types.includes(type));
		for (const tab of expected) {
			tab.title = `服务器本地化标题 ${tab.type}`;
			tab.images = { defaultImage: { url: `https://images.example.test/${tab.type}.png`, width: 100, height: 100 } };
		}
		const response = await processResponse({ url: fixture.url, headers: {}, $argument: "LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
		const actual = JSON.parse(response.body).data.applicationProps.tabs.filter(({ type }) => types.includes(type));
		assert.deepEqual(actual, expected);
	});

	test(`${variant}: a missing tabs array skips navigation injection`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		const injectTabs = t.mock.method(InjectBrand.prototype, "InjectUTSConfigurationTabs");
		const response = await processResponse({ url: fixture.url, headers: {}, $argument: "LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: { applicationProps: {} } }) });
		assert.equal(injectTabs.mock.callCount(), 0);
		assert.equal(
			(JSON.parse(response.body).data.applicationProps.tabs ?? []).some(({ type }) => type === "Grevy"),
			false,
		);
	});

	test(`${variant}: explicit tab selection can omit Formula 1 and retain legacy Kids`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		const response = await processResponse({ url: fixture.url, headers: {}, $argument: "Tabs=WatchNow,Kids,Library&LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(fixture.body) });
		assert.deepEqual(
			JSON.parse(response.body).data.applicationProps.tabs.map(({ type }) => type),
			["WatchNow", "Kids", ...(variant === "dev" ? ["ChannelsAndApps"] : []), "Library"],
		);
	});

	for (const path of ["/uts/v3/canvases/Channels/tvs.sbd.241000", "/uts/v3/shelves/uts.col.ChannelUpNext.tvs.sbd.241000", "/uts/v3/shelves/edt.col.f1?ctx_brand=tvs.sbd.241000"]) {
		test(`${variant}: F1 preserves client language when selecting the US storefront for ${path}`, async t => {
			t.mock.method(Storage, "getItem", () => ({}));
			for (const [locale, headers, expected] of [
				["zh-Hans", { "X-Apple-I-Locale": "en_US" }, "zh-Hans"],
				["zh-Hant", {}, "zh-Hant"],
				["ja-JP", {}, "ja-JP"],
				["fr-FR", {}, "fr-FR"],
				["zh_Hant_TW", {}, "zh_Hant_TW"],
				["", { "X-Apple-I-Locale": "zh_Hans" }, null],
				["", { "x-apple-i-locale": "zh_Hant_TW" }, null],
				["", { "Accept-Language": "zh-Hant-TW,zh;q=0.9" }, null],
				["", {}, null],
			]) {
				const url = new URL(path, "https://uts-api.itunes.apple.com");
				url.searchParams.set("sf", "143470");
				if (locale) url.searchParams.set("locale", locale);
				const { $request } = await processRequest({ url: url.toString(), headers: structuredClone(headers), $argument: "LogLevel=OFF" });
				assert.equal(new URL($request.url).searchParams.get("sf"), "143441");
				assert.equal(new URL($request.url).searchParams.get("locale"), expected);
				assert.deepEqual($request.headers, headers);
			}
		});

		test(`${variant}: Formula 1 uses its own US region for ${path}`, async t => {
			t.mock.method(Storage, "getItem", () => ({}));
			for (const [argument, storefront] of [
				["", "143441"],
				["CountryCode.Grevy=TW", "143470"],
			]) {
				const url = new URL(path, "https://uts-api.itunes.apple.com");
				url.searchParams.set("sf", "143465");
				url.searchParams.set("pfm", "desktop");
				const { $request } = await processRequest({ url: url.toString(), headers: { "X-Apple-Store-Front": "143465-1,29" }, $argument: `${argument}&LogLevel=OFF` });
				assert.equal(new URL($request.url).searchParams.get("sf"), storefront);
				assert.equal($request.headers["X-Apple-Store-Front"], `${storefront}-1,29`);
			}
		});
	}

	for (const kind of ["canvas", "shelf"]) {
		test(`${variant}: Formula 1 ${kind} follows the playback URL setting`, async t => {
			t.mock.method(Storage, "getItem", () => ({}));
			const items = [{ playable: { assets: { hlsUrl: "https://play.itunes.apple.com/f1.m3u8" } } }];
			const path = kind === "canvas" ? "/uts/v3/canvases/Channels/tvs.sbd.241000" : "/uts/v3/shelves/uts.col.ChannelUpNext.tvs.sbd.241000";
			const body = { data: kind === "canvas" ? { canvas: { shelves: [{ items }] } } : { shelf: { items } } };
			for (const enabled of [true, false]) {
				const response = await processResponse({ url: `https://uts-api.itunes.apple.com${path}?sf=143441`, headers: {}, $argument: `isWorkaroundSSLPinning=${enabled}&LogLevel=OFF` }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
				const data = JSON.parse(response.body).data;
				const actualItems = kind === "canvas" ? data.canvas.shelves[0].items : data.shelf.items;
				assert.equal(actualItems[0].playable.assets.hlsUrl, `https://${enabled ? "play-cdn" : "play"}.itunes.apple.com/f1.m3u8`);
			}
		});
	}
}
