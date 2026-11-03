import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Console, Storage, qs } from "@nsnanocat/util";
import database from "../src/function/database.mjs";
import setENV from "../src/function/setENV.mjs";
import { Request } from "./host.mjs";
import { RequestDev } from "./host.mjs";
import { Response } from "./host.mjs";
import { ResponseDev } from "./host.mjs";
import { ResponseLumen } from "./host.mjs";

const baseline = JSON.parse(readFileSync(new URL("fixtures/runtime-baseline.json", import.meta.url)));
const officialAppleTabs = JSON.parse(readFileSync(new URL("fixtures/us-tabs.json", import.meta.url))).body.data.applicationProps.tabs.filter(({ type }) => ["Originals", "Grevy", "MLS"].includes(type)).map(({ type, title, target }) => ({ type, title, target }));
Console.logLevel = "OFF";

for (const [variant, processRequest] of [["release", Request], ["dev", RequestDev]]) {
	test(`${variant}: UTS requests remove conditional ETag headers without changing the request body`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		for (const [method, path] of [["GET", "/uts/v3/canvases/Roots/tahoma_watchnow"], ["GET", "/uts/v3/user/settings"], ["POST", "/uts/v3/configurations"]]) {
			for (const header of ["If-None-Match", "if-none-match"]) {
				const request = { method, url: `https://uts-api.itunes.apple.com${path}?caller=wlk&pfm=atv&sf=143470&v=101`, headers: { "Content-Type": "application/json", "Accept-Language": "zh-Hant", [header]: "cached-uts-response" }, ...(method === "POST" ? { body: '{"featureFlags":{}}' } : {}), $argument: "LogLevel=OFF" };
				const originalBody = request.body;
				const { $request } = await processRequest(request);
				assert.deepEqual($request.headers, { "Content-Type": "application/json", "Accept-Language": "zh-Hant" });
				assert.equal($request.body, originalBody);
			}
		}
	});
	test(`${variant}: non-UTS requests preserve conditional ETag headers`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		for (const hostname of ["play.itunes.apple.com", "play-edge.itunes.apple.com", "umc-tempo-api.apple.com"]) {
			const headers = { "If-None-Match": "cached-response", "if-none-match": "cached-response" };
			const { $request } = await processRequest({ method: "GET", url: `https://${hostname}/test`, headers: { ...headers }, $argument: "LogLevel=OFF" });
			assert.deepEqual($request.headers, headers);
		}
	});
}

for (const fixture of baseline.cases) {
	const injectsChannels = fixture.variant === "dev" && fixture.phase === "response" && new URL(fixture.request.url).pathname === "/uts/v3/configurations";
	test(`${fixture.variant}: ${fixture.name} ${fixture.phase === "request" ? "preserves client language with routing from" : fixture.name.startsWith("tabs-") ? "retains platform navigation from" : injectsChannels ? "adds configured channels to" : "matches"} TV ${baseline.commit.slice(0, 7)}`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		// 固定历史 tab 配置，继续验证旧基线；当前默认值由 tabs.test.mjs 覆盖。
		const tabsArgument = fixture.name.startsWith("tabs-") ? "&Tabs=WatchNow,Originals,MLS,Sports,Kids,Store,Movies,TV,ChannelsAndApps,Library,Search" : "";
		const request = { ...structuredClone(fixture.request), $argument: `${fixture.argument}${tabsArgument}&LogLevel=OFF` };
		let actual;
		let expected = structuredClone(fixture.expected);
		if (fixture.phase === "request") {
			// 旧基线的 locale 覆盖已移除；其余路由、请求头和正文继续与基线对照。
			const locale = new URL(fixture.request.url).searchParams.get("locale");
			if (locale === null) delete expected.query.locale;
			else expected.query.locale = locale;
			const result = await (fixture.variant === "dev" ? RequestDev : Request)(request);
			assert.equal(result.$response, undefined);
			const url = new URL(result.$request.url);
			actual = { origin: url.origin, path: url.pathname, query: Object.fromEntries(url.searchParams), headers: result.$request.headers, ...(result.$request.body !== undefined ? { body: result.$request.body } : {}) };
		} else {
			const response = await (fixture.variant === "dev" ? ResponseDev : Response)(request, structuredClone(fixture.response));
			actual = JSON.parse(response.body);
			if (injectsChannels) {
				const tab = actual.data.applicationProps.tabs.find(({ type }) => type === "ChannelsAndApps");
				assert.equal(tab.subTabs[0].target.id, "tvs.sbd.lumen");
				assert.equal(actual.data.channels["tvs.sbd.lumen"].type, "Brand");
				actual.data.applicationProps.tabs = actual.data.applicationProps.tabs.filter(({ type }) => type !== "ChannelsAndApps");
				if (fixture.name.startsWith("tabs-")) expected = expected.filter(({ type }) => type !== "ChannelsAndApps");
				else delete actual.data.channels;
			}
			if (fixture.name.startsWith("tabs-")) {
				actual = actual.data.applicationProps.tabs.map(({ type, title, secondaryEnabled, target }) => ({ type, title, ...(secondaryEnabled !== undefined ? { secondaryEnabled } : {}), ...(target ? { target } : {}) }));
				// iPhone 不补入 MLS；其余平台沿用当前的频道注入。
				if (new URL(fixture.request.url).searchParams.get("pfm") !== "iphone" && !expected.some(({ type }) => type === "MLS")) expected.splice(expected.findIndex(({ type }) => type === "Originals") + 1, 0, officialAppleTabs.find(({ type }) => type === "MLS"));
				// 注入模板使用完整官方配置，替换旧基线中的预定义苹果导航。
				expected = expected.map(tab => officialAppleTabs.find(({ type }) => type === tab.type) ?? tab);
			}
		}
		assert.deepEqual(actual, expected);
	});
}

for (const [variant, processResponse, origin, path, body, brandId] of [
	["release", Response, "https://uts-api.itunes.apple.com", "/uts/v3/search/landing", { data: { canvas: { shelves: [{ displayType: "brick", isGrid: true, items: [] }] } } }, "tvs.sbd.4000"],
	["dev", ResponseDev, "https://uts-api.itunes.apple.com", "/uts/v3/configurations", { data: { applicationProps: { tabs: [] } } }, "tvs.sbd.lumen"],
	["lumen", ResponseLumen, "https://www.lumen.ax/api/appletv/v1", "/uts/v3/canvases/Channels/tvs.sbd.lumen", { data: { canvas: { shelves: [] } } }, "tvs.sbd.lumen"],
]) {
	test(`${variant}: resolves sfh storefronts while preserving sf precedence and the default region`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		for (const [query, region] of [
			["sfh=143470-18,33", "tw"],
			["sf=143462&sfh=143470-18,33", "jp"],
			["sf=143441", "us"],
			["", "us"],
		]) {
			const request = { url: `${origin}${path}?caller=wlk&pfm=atv&region=TW&v=101&${query}`, method: "POST", headers: {}, $argument: "LogLevel=OFF" };
			const result = await processResponse(request, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
			assert.equal(new URL(JSON.parse(result.body).data.channels[brandId].url).pathname.split("/")[1], region, query);
		}
	});
}

test("Storage precedence merges nested settings and preserves database defaults", t => {
	t.mock.method(Storage, "getItem", () => ({ TV: { Settings: { ThirdParty: false, CountryCode: { Sports: "TW" } } } }));
	const original = JSON.stringify(database);
	globalThis.$argument = qs.parse("ThirdParty=true&CountryCode.Sports=JP&LogLevel=OFF");
	const persistent = setENV("iRingo", "TV", database).Settings;
	assert.equal(persistent.ThirdParty, false);
	assert.equal(persistent.CountryCode.Sports, "TW");
	assert.equal(persistent.CountryCode.Kids, "US");
	globalThis.$argument = qs.parse("Storage=Argument&ThirdParty=true&CountryCode.Sports=JP&LogLevel=OFF");
	const argument = setENV("iRingo", "TV", database).Settings;
	assert.equal(argument.ThirdParty, true);
	assert.equal(argument.CountryCode.Sports, "JP");
	globalThis.$argument = qs.parse("Storage=database&ThirdParty=true&CountryCode.Sports=JP");
	const defaults = setENV("iRingo", "TV", database).Settings;
	assert.equal(defaults.ThirdParty, false);
	assert.equal(defaults.CountryCode.Sports, "US");
	assert.equal(JSON.stringify(database), original);
});

test("setENV resolves functional tab names into IDs once without changing database defaults", t => {
	t.mock.method(Storage, "getItem", () => ({}));
	const original = JSON.stringify(database);
	globalThis.$argument = qs.parse("Tabs=F1,MLS,Library,ChannelsAndApps,Sports&LogLevel=OFF");
	const { Settings, Configs } = setENV("iRingo", "TV", database);
	assert.equal(Configs.Tab.F1, "tvs.sbd.241000");
	assert.deepEqual(Settings.Tabs, ["tvs.sbd.241000", "tvs.sbd.7000", "Library", "ChannelsAndApps", "tahoma_sports", "edt.item.62327df1-6874-470e-98b2-a5bbeac509a2"]);
	assert.equal(Configs.Tabs.find(({ id }) => id === "Library").destinationType, "Client");
	assert.equal(Configs.Tabs.find(({ id }) => id === "ChannelsAndApps").destinationType, "SubTabs");
	assert.equal(JSON.stringify(database), original);
});

test("stored functional tab names become request-local IDs while argument precedence remains intact", t => {
	const stored = { TV: { Settings: { Tabs: ["F1", "MLS"] } } };
	t.mock.method(Storage, "getItem", () => stored);
	globalThis.$argument = qs.parse("Tabs=Store&LogLevel=OFF");
	const persistent = setENV("iRingo", "TV", database).Settings;
	assert.deepEqual(persistent.Tabs, ["tvs.sbd.241000", "tvs.sbd.7000"]);
	globalThis.$argument = qs.parse("Storage=Argument&Tabs=Store&LogLevel=OFF");
	const argument = setENV("iRingo", "TV", database).Settings;
	assert.deepEqual(argument.Tabs, ["tahoma_store"]);
	assert.deepEqual(stored.TV.Settings.Tabs, ["F1", "MLS"]);
});

test("successive settings do not leak to subsequent calls", t => {
	t.mock.method(Storage, "getItem", () => ({}));
	globalThis.$argument = qs.parse("Tabs=Sports&CountryCode.View=JP,SG&LogLevel=OFF");
	const first = setENV("iRingo", "TV", database).Settings;
	assert.deepEqual(first.Tabs, database.TV.Configs.Tab.Sports);
	assert.deepEqual(first.CountryCode.View, ["JP", "SG"]);
	first.CountryCode.Sports = "JP";
	globalThis.$argument = qs.parse({ LogLevel: "OFF" });
	const second = setENV("iRingo", "TV", database).Settings;
	assert.deepEqual(second.Tabs, database.TV.Settings.Tabs.flatMap(tab => database.TV.Configs.Tab[tab]));
	assert.deepEqual(second.CountryCode.View, ["SG", "TW"]);
	assert.equal(second.CountryCode.Sports, "US");
});

test("LumenKey follows normal settings precedence", t => {
	t.mock.method(Storage, "getItem", () => ({ TV: { Settings: { LumenKey: "stored-key" } } }));
	const argument = new URLSearchParams({ LumenKey: "argument+key=", LogLevel: "OFF" });
	globalThis.$argument = qs.parse(argument.toString());
	assert.equal(setENV("iRingo", "TV", database).Settings.LumenKey, "stored-key");
	argument.set("Storage", "Argument");
	globalThis.$argument = qs.parse(argument.toString());
	assert.equal(setENV("iRingo", "TV", database).Settings.LumenKey, "argument+key=");
	argument.set("Storage", "database");
	globalThis.$argument = qs.parse(argument.toString());
	assert.equal(setENV("iRingo", "TV", database).Settings.LumenKey, "");
});
