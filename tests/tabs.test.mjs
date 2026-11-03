import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Console, Storage } from "@nsnanocat/util";
import { Request } from "./host.mjs";
import { RequestDev } from "./host.mjs";
import { Response } from "./host.mjs";
import { ResponseDev } from "./host.mjs";

const fixture = JSON.parse(readFileSync(new URL("fixtures/us-tabs.json", import.meta.url)));
for (const tab of fixture.body.data.applicationProps.tabs) if (!tab.target) tab.id = tab.type;
Console.logLevel = "OFF";

for (const [variant, processResponse, processRequest] of [
	["release", Response, Request],
	["dev", ResponseDev, RequestDev],
]) {
	test(`${variant}: a native Library without an ID receives its configured ID`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		const body = structuredClone(fixture.body);
		delete body.data.applicationProps.tabs.find(({ type }) => type === "Library").id;
		const response = await processResponse({ url: fixture.url, headers: {}, $argument: "LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
		assert.equal(JSON.parse(response.body).data.applicationProps.tabs.find(({ type }) => type === "Library").id, "Library");
	});

	test(`${variant}: F1 settings select and order the complete native Grevy tab`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		const response = await processResponse({ url: fixture.url, headers: {}, $argument: "Tabs=Library,F1&LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(fixture.body) });
		const tabs = JSON.parse(response.body).data.applicationProps.tabs;
		assert.deepEqual(tabs.filter(({ type }) => type !== "ChannelsAndApps").map(({ type }) => type), ["Library", "Grevy"]);
		assert.deepEqual(tabs.find(({ type }) => type === "Grevy"), fixture.body.data.applicationProps.tabs.find(({ type }) => type === "Grevy"));
		assert.equal(tabs.some(({ type }) => type === "F1"), false);
	});

	test(`${variant}: native US Formula 1 stays between Apple TV and MLS, with Search first`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		const response = await processResponse({ url: fixture.url, headers: {}, $argument: "LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(fixture.body) });
		const tabs = JSON.parse(response.body).data.applicationProps.tabs;
		assert.deepEqual(
			tabs.filter(({ type }) => type !== "ChannelsAndApps").map(({ type }) => type),
			["Search", "WatchNow", "Originals", "Grevy", "MLS", "Sports", "Store", "Library"],
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
	]) {
		test(`${variant}: ${platform} v${version} gets missing Formula 1 and MLS navigation`, async t => {
			t.mock.method(Storage, "getItem", () => ({}));
			const body = structuredClone(fixture.body);
			body.data.applicationProps.tabs = body.data.applicationProps.tabs.filter(({ type }) => !["Grevy", "MLS"].includes(type));
			const url = new URL(fixture.url);
			url.searchParams.set("pfm", platform);
			url.searchParams.set("v", version);
			const response = await processResponse({ url: url.toString(), headers: {}, $argument: "LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
			const tabs = JSON.parse(response.body).data.applicationProps.tabs;
			const index = tabs.findIndex(({ type }) => type === "Grevy");
			assert.equal(index, 3);
			assert.equal(tabs[index - 1].type, "Originals");
			assert.deepEqual(tabs.slice(index, index + 2), fixture.body.data.applicationProps.tabs.filter(({ type }) => ["Grevy", "MLS"].includes(type)));
		});
	}

	for (const [platform, version] of [["iphone", 100], ["iphone", 1]]) {
		test(`${variant}: ${platform} v${version} only gets Apple TV root navigation`, async t => {
			t.mock.method(Storage, "getItem", () => ({}));
			const body = structuredClone(fixture.body);
			body.data.applicationProps.tabs = body.data.applicationProps.tabs.filter(({ type }) => ["WatchNow", "Library"].includes(type));
			const url = new URL(fixture.url);
			url.searchParams.set("pfm", platform);
			url.searchParams.set("v", version);
			for (const argument of ["LogLevel=OFF", "Tabs=WatchNow,Originals,F1,MLS,Library&LogLevel=OFF"]) {
				const response = await processResponse({ url: url.toString(), headers: {}, $argument: argument }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
				const tabs = JSON.parse(response.body).data.applicationProps.tabs;
				assert.deepEqual(tabs.filter(({ type }) => ["Originals", "Grevy", "MLS"].includes(type)).map(({ type }) => type), ["Originals"]);
				assert.deepEqual(tabs.find(({ type }) => type === "Originals"), fixture.body.data.applicationProps.tabs.find(({ type }) => type === "Originals"));
				assert.equal(tabs[0].type, "WatchNow");
				assert.ok(tabs.some(({ type }) => type === "Library"));
			}
		});
	}

	for (const platform of ["desktop", "iphone"]) {
		test(`${variant}: ${platform} retains selected Apple navigation as complete server objects`, async t => {
			t.mock.method(Storage, "getItem", () => ({}));
			const body = structuredClone(fixture.body);
			const types = ["Originals", "Grevy", "MLS"];
			const expected = body.data.applicationProps.tabs.filter(({ type }) => types.includes(type));
			for (const tab of expected) {
				tab.title = `服务器本地化标题 ${tab.type}`;
				tab.images = { defaultImage: { url: `https://images.example.test/${tab.type}.png`, width: 100, height: 100 } };
			}
			const url = new URL(fixture.url);
			url.searchParams.set("pfm", platform);
			const response = await processResponse({ url: url.toString(), headers: {}, $argument: "LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
			const actual = JSON.parse(response.body).data.applicationProps.tabs.filter(({ type }) => types.includes(type));
			assert.deepEqual(actual, platform === "iphone" ? expected.filter(({ type }) => type === "Originals") : expected);
		});
	}

	test(`${variant}: configuration without tabs does not invent an F1 tab`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		const response = await processResponse({ url: fixture.url, headers: {}, $argument: "LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: { applicationProps: {} } }) });
		assert.equal(
			(JSON.parse(response.body).data.applicationProps.tabs ?? []).some(({ type }) => type === "Grevy"),
			false,
		);
	});

	test(`${variant}: explicit tab selection can omit Formula 1 and retain legacy Kids`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		const response = await processResponse({ url: fixture.url, headers: {}, $argument: "Tabs=WatchNow,Kids,Library&LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(fixture.body) });
		assert.deepEqual(
			JSON.parse(response.body).data.applicationProps.tabs.filter(({ type }) => type !== "ChannelsAndApps").map(({ type }) => type),
			["WatchNow", "Kids", "Library"],
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

		test(`${variant}: Formula 1 follows the Sports region for ${path}`, async t => {
			t.mock.method(Storage, "getItem", () => ({}));
			for (const [argument, storefront] of [
				["", "143441"],
				["CountryCode.Sports=TW", "143470"],
				["CountryCode.Sports=AUTO", "143465"],
				["CountryCode.Grevy=TW&CountryCode.Sports=JP", "143462"],
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
