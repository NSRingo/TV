import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Console, Storage } from "@nsnanocat/util";
import { Request } from "./host.mjs";
import { RequestDev } from "./host.mjs";
import { Response } from "./host.mjs";
import { ResponseDev } from "./host.mjs";

const fixture = JSON.parse(readFileSync(new URL("fixtures/us-tabs.json", import.meta.url)));
Console.logLevel = "OFF";

for (const [variant, processResponse, processRequest] of [
	["release", Response, Request],
	["dev", ResponseDev, RequestDev],
]) {
	for (const brands of ["[]", "F1", "MLS,F1", "Originals,F1,MLS,MLB"]) {
		test(`${variant}: Brands=${brands} retains all upstream navigation objects and order`, async t => {
			t.mock.method(Storage, "getItem", () => ({}));
			const response = await processResponse({ url: fixture.url, headers: {}, $argument: `Brands=${brands}&LogLevel=OFF` }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(fixture.body) });
			assert.deepEqual(JSON.parse(response.body), fixture.body);
		});
	}

	test(`${variant}: default brands preserve native tabs and insert Lumen before Library`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		const response = await processResponse({ url: fixture.url, headers: {}, $argument: "LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(fixture.body) });
		const body = JSON.parse(response.body);
		const tabs = body.data.applicationProps.tabs;
		const index = tabs.findIndex(({ type }) => type === "ChannelsAndApps");
		assert.equal(tabs[index + 1].type, "Library");
		assert.equal(tabs[index].subTabs[0].target.id, "tvs.sbd.lumen");
		assert.deepEqual(
			tabs.filter(({ type }) => type !== "ChannelsAndApps"),
			fixture.body.data.applicationProps.tabs,
		);
		assert.deepEqual(JSON.parse((await processResponse({ url: fixture.url, headers: {}, $argument: "LogLevel=OFF" }, response)).body), body);
	});

	for (const [platform, version] of [
		["desktop", 92],
		["ipad", 100],
		["atv", 100],
		["appletv", 100],
		["desktop", 50],
	]) {
		test(`${variant}: ${platform} v${version} inserts selected F1 and MLS between existing brands`, async t => {
			t.mock.method(Storage, "getItem", () => ({}));
			const body = structuredClone(fixture.body);
			body.data.applicationProps.tabs = body.data.applicationProps.tabs.filter(({ type }) => !["Grevy", "MLS"].includes(type));
			const url = new URL(fixture.url);
			url.searchParams.set("pfm", platform);
			url.searchParams.set("v", version);
			const response = await processResponse({ url: url.toString(), headers: {}, $argument: "Brands=MLS,F1&LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
			assert.deepEqual(JSON.parse(response.body), fixture.body);
		});
	}

	for (const [platform, version] of [
		["iphone", 100],
		["iphone", 1],
		["ipad", 50],
	]) {
		test(`${variant}: ${platform} v${version} preserves ordinary navigation and applies brand placement`, async t => {
			t.mock.method(Storage, "getItem", () => ({}));
			const body = structuredClone(fixture.body);
			body.data.applicationProps.tabs = body.data.applicationProps.tabs.filter(({ type }) => ["WatchNow", "Library"].includes(type));
			const url = new URL(fixture.url);
			url.searchParams.set("pfm", platform);
			url.searchParams.set("v", version);
			const response = await processResponse({ url: url.toString(), headers: {}, $argument: "Brands=Originals,F1,MLS,MLB&LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
			const tabs = JSON.parse(response.body).data.applicationProps.tabs;
			assert.deepEqual(
				tabs.map(({ type }) => type),
				platform === "iphone" ? ["WatchNow", "Originals", "Library"] : ["WatchNow", "Originals", "Grevy", "MLS", "Library"],
			);
			assert.deepEqual(
				tabs.filter(({ target }) => target?.type === "Brand"),
				fixture.body.data.applicationProps.tabs.filter(({ type }) => (platform === "iphone" ? ["Originals"] : ["Originals", "Grevy", "MLS"]).includes(type)),
			);
			assert.deepEqual(
				tabs.filter(({ type }) => ["WatchNow", "Library"].includes(type)),
				body.data.applicationProps.tabs,
			);
		});
	}

	for (const platform of ["desktop", "iphone"]) {
		test(`${variant}: ${platform} preserves complete server brand tabs even when unselected`, async t => {
			t.mock.method(Storage, "getItem", () => ({}));
			const body = structuredClone(fixture.body);
			for (const tab of body.data.applicationProps.tabs.filter(({ type }) => ["Originals", "Grevy", "MLS"].includes(type))) {
				tab.title = `服务器本地化标题 ${tab.type}`;
				tab.images = { defaultImage: { url: `https://images.example.test/${tab.type}.png`, width: 100, height: 100 } };
			}
			const url = new URL(fixture.url);
			url.searchParams.set("pfm", platform);
			const response = await processResponse({ url: url.toString(), headers: {}, $argument: "Brands=[]&LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
			assert.deepEqual(JSON.parse(response.body), body);
		});
	}

	test(`${variant}: configuration without tabs does not invent Apple navigation`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		const response = await processResponse({ url: fixture.url, headers: {}, $argument: "Brands=Originals,F1,MLS&LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: { applicationProps: {} } }) });
		assert.deepEqual(JSON.parse(response.body), { data: { applicationProps: {} } });
	});

	for (const caller of ["wta", "wlk"]) {
		test(`${variant}: ${caller} injects selected F1 without rebuilding ordinary navigation`, async t => {
			t.mock.method(Storage, "getItem", () => ({}));
			const body = structuredClone(fixture.body);
			body.data.applicationProps.tabs = body.data.applicationProps.tabs.filter(({ type }) => !["Originals", "Grevy", "MLS"].includes(type));
			const url = new URL(fixture.url);
			url.searchParams.set("caller", caller);
			url.searchParams.set("pfm", "ipad");
			const response = await processResponse({ url: url.toString(), headers: {}, $argument: "Brands=F1&LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
			const tabs = JSON.parse(response.body).data.applicationProps.tabs;
			assert.equal(tabs[tabs.findIndex(({ type }) => type === "WatchNow") + 1].type, "Grevy");
			assert.deepEqual(
				tabs.filter(({ type }) => type !== "Grevy"),
				body.data.applicationProps.tabs,
			);
		});
	}

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
