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
	test(`${fixture.variant}: ${fixture.name} ${fixture.phase === "request" ? "preserves client language with routing from" : fixture.name.startsWith("tabs-") ? "preserves upstream navigation with no selected brands from" : "matches"} TV ${baseline.commit.slice(0, 7)}`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		const request = { ...structuredClone(fixture.request), $argument: `${fixture.argument}&Brands=[]&LogLevel=OFF` };
		let actual;
		let expected = structuredClone(fixture.expected);
		if (fixture.phase === "request") {
			// 旧基线的 locale 覆盖已移除；其余路由、请求头和正文继续与基线对照。
			// Locale overrides from the historical baseline are retired; compare the remaining routing, headers and body.
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
			if (fixture.name.startsWith("tabs-")) expected = JSON.parse(fixture.response.body);
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

test("setENV resolves brand names into IDs without selecting ordinary navigation", t => {
	t.mock.method(Storage, "getItem", () => ({}));
	const original = JSON.stringify(database);
	globalThis.$argument = qs.parse("Brands=Originals,F1,MLS,MLB,Lumen,WatchNow,Sports,Store,Movies,TV,ChannelsAndApps,Library,Search&LogLevel=OFF");
	const { Settings } = setENV("iRingo", "TV", database);
	assert.deepEqual(Settings.Brands, ["tvs.sbd.4000", "tvs.sbd.241000", "tvs.sbd.7000", "edt.item.62327df1-6874-470e-98b2-a5bbeac509a2", "tvs.sbd.lumen"]);
	assert.equal(JSON.stringify(database), original);
});

test("stored brand names become request-local IDs while argument precedence remains intact", t => {
	const stored = { TV: { Settings: { Brands: ["F1", "MLS"] } } };
	t.mock.method(Storage, "getItem", () => stored);
	globalThis.$argument = qs.parse("Brands=MLB&LogLevel=OFF");
	const persistent = setENV("iRingo", "TV", database).Settings;
	assert.deepEqual(persistent.Brands, ["tvs.sbd.241000", "tvs.sbd.7000"]);
	globalThis.$argument = qs.parse("Storage=Argument&Brands=MLB&LogLevel=OFF");
	const argument = setENV("iRingo", "TV", database).Settings;
	assert.deepEqual(argument.Brands, ["edt.item.62327df1-6874-470e-98b2-a5bbeac509a2"]);
	assert.deepEqual(stored.TV.Settings.Brands, ["F1", "MLS"]);
});

test("retired Tabs settings do not select brands", t => {
	t.mock.method(Storage, "getItem", () => ({ TV: { Settings: { Tabs: ["Originals", "MLS"], Brands: [] } } }));
	globalThis.$argument = qs.parse("Tabs=F1,Sports&LogLevel=OFF");
	assert.deepEqual(setENV("iRingo", "TV", database).Settings.Brands, []);
});

test("empty BoxJs and argument arrays disable brand injection with normal Storage precedence", t => {
	for (const stored of [{ Brands: [] }, JSON.stringify({ Brands: [] })]) {
		t.mock.method(Storage, "getItem", () => ({ TV: { Settings: stored } }));
		globalThis.$argument = qs.parse("Brands=F1&LogLevel=OFF");
		assert.deepEqual(setENV("iRingo", "TV", database).Settings.Brands, []);
		globalThis.$argument = qs.parse("Storage=Argument&Brands=F1&LogLevel=OFF");
		assert.deepEqual(setENV("iRingo", "TV", database).Settings.Brands, ["tvs.sbd.241000"]);
		globalThis.$argument = { Storage: "Argument", Brands: [], LogLevel: "OFF" };
		assert.deepEqual(setENV("iRingo", "TV", database).Settings.Brands, []);
		globalThis.$argument = { Storage: "database", Brands: [], LogLevel: "OFF" };
		assert.deepEqual(setENV("iRingo", "TV", database).Settings.Brands, ["tvs.sbd.4000", "tvs.sbd.241000", "tvs.sbd.7000", "edt.item.62327df1-6874-470e-98b2-a5bbeac509a2", "tvs.sbd.lumen"]);
	}
});

test("successive settings do not leak to subsequent calls", t => {
	t.mock.method(Storage, "getItem", () => ({}));
	globalThis.$argument = qs.parse("Brands=MLB&CountryCode.View=JP,SG&LogLevel=OFF");
	const first = setENV("iRingo", "TV", database).Settings;
	assert.deepEqual(first.Brands, ["edt.item.62327df1-6874-470e-98b2-a5bbeac509a2"]);
	assert.deepEqual(first.CountryCode.View, ["JP", "SG"]);
	first.CountryCode.Sports = "JP";
	globalThis.$argument = qs.parse({ LogLevel: "OFF" });
	const second = setENV("iRingo", "TV", database).Settings;
	assert.deepEqual(
		second.Brands,
		database.TV.Settings.Brands.flatMap(brand => database.TV.Configs.Brand[brand]),
	);
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
