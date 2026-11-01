import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Console, Storage } from "@nsnanocat/util";
import database from "../src/function/database.mjs";
import setENV from "../src/function/setENV.mjs";
import { Request } from "../src/process/Request.mjs";
import { Request as RequestDev } from "../src/process/Request.dev.mjs";
import { Response } from "../src/process/Response.mjs";
import { Response as ResponseDev } from "../src/process/Response.dev.mjs";

const baseline = JSON.parse(readFileSync(new URL("fixtures/runtime-baseline.json", import.meta.url)));
Console.logLevel = "OFF";

for (const fixture of baseline.cases) {
	const injectsChannels = fixture.variant === "dev" && fixture.phase === "response" && new URL(fixture.request.url).pathname === "/uts/v3/configurations";
	test(`${fixture.variant}: ${fixture.name} ${fixture.name.startsWith("tabs-") ? "retains navigation with ungated Apple channels from" : injectsChannels ? "adds configured channels to" : "matches"} TV ${baseline.commit.slice(0, 7)}`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		// 固定历史 tab 配置，继续验证旧基线；当前默认值由 tabs.test.mjs 覆盖。
		const tabsArgument = fixture.name.startsWith("tabs-") ? "&Tabs=WatchNow,Originals,MLS,Sports,Kids,Store,Movies,TV,ChannelsAndApps,Library,Search" : "";
		const request = { ...structuredClone(fixture.request), $argument: `${fixture.argument}${tabsArgument}&LogLevel=OFF` };
		let actual;
		let expected = structuredClone(fixture.expected);
		if (fixture.phase === "request") {
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
				if (fixture.name.startsWith("tabs-")) {
					if (!expected.some(({ type }) => type === "ChannelsAndApps")) {
						const index = expected.findIndex(({ type }) => type === "Library");
						expected.splice(index < 0 ? expected.length : index, 0, { type: "ChannelsAndApps", title: "频道和 App" });
					}
				} else {
					actual.data.applicationProps.tabs = actual.data.applicationProps.tabs.filter(({ type }) => type !== "ChannelsAndApps");
					delete actual.data.channels;
				}
			}
			if (fixture.name.startsWith("tabs-")) {
				actual = actual.data.applicationProps.tabs.map(({ type, title, secondaryEnabled, target }) => ({ type, title, ...(secondaryEnabled !== undefined ? { secondaryEnabled } : {}), ...(target ? { target } : {}) }));
				// 苹果频道统一按结构补入，MLS 不再受旧平台/版本门槛限制。
				if (!expected.some(({ type }) => type === "MLS")) expected.splice(expected.findIndex(({ type }) => type === "Originals") + 1, 0, { type: "MLS", title: "MLS", target: { id: "tvs.sbd.7000", type: "Brand", url: "https://tv.apple.com/us/channel/tvs.sbd.7000" } });
			}
		}
		assert.deepEqual(actual, expected);
	});
}

test("Storage precedence merges nested settings and preserves database defaults", t => {
	t.mock.method(Storage, "getItem", () => ({ TV: { Settings: { ThirdParty: false, CountryCode: { Sports: "TW" } } } }));
	const original = JSON.stringify(database);
	const persistent = setENV("iRingo", "TV", database, "ThirdParty=true&CountryCode.Sports=JP&LogLevel=OFF").Settings;
	assert.equal(persistent.ThirdParty, false);
	assert.equal(persistent.CountryCode.Sports, "TW");
	assert.equal(persistent.CountryCode.Kids, "US");
	const argument = setENV("iRingo", "TV", database, "Storage=Argument&ThirdParty=true&CountryCode.Sports=JP&LogLevel=OFF").Settings;
	assert.equal(argument.ThirdParty, true);
	assert.equal(argument.CountryCode.Sports, "JP");
	const defaults = setENV("iRingo", "TV", database, "Storage=database&ThirdParty=true&CountryCode.Sports=JP").Settings;
	assert.equal(defaults.ThirdParty, false);
	assert.equal(defaults.CountryCode.Sports, "US");
	assert.equal(JSON.stringify(database), original);
});

test("request-specific arguments restore globals and do not leak to subsequent calls", t => {
	t.mock.method(Storage, "getItem", () => ({}));
	const globalArgument = globalThis.$argument;
	const first = setENV("iRingo", "TV", database, "Tabs=Sports&CountryCode.View=JP,SG&LogLevel=OFF").Settings;
	assert.deepEqual(first.Tabs, ["Sports"]);
	assert.deepEqual(first.CountryCode.View, ["JP", "SG"]);
	first.CountryCode.Sports = "JP";
	const second = setENV("iRingo", "TV", database, { LogLevel: "OFF" }).Settings;
	assert.deepEqual(second.Tabs, database.TV.Settings.Tabs);
	assert.deepEqual(second.CountryCode.View, ["SG", "TW"]);
	assert.equal(second.CountryCode.Sports, "US");
	assert.equal(globalThis.$argument, globalArgument);
});

test("argument credentials stay outside logged settings and do not leak to subsequent calls", t => {
	t.mock.method(Storage, "getItem", () => ({}));
	const logs = [];
	t.mock.method(Console, "debug", (...values) => logs.push(values));
	t.mock.method(Console, "info", (...values) => logs.push(values));
	const previousLevel = Console.logLevel;
	t.after(() => {
		Console.logLevel = previousLevel;
	});
	const key = "private-test-key+with=padding";
	const profile = setENV("iRingo", "TV", database, new URLSearchParams({ LumenKey: key, LogLevel: "DEBUG" }).toString());
	assert.equal(profile.LumenKey, key);
	assert.equal(Object.hasOwn(profile.Settings, "LumenKey"), false);
	assert.equal(JSON.stringify(logs).includes(key), false);
	assert.equal(setENV("iRingo", "TV", database, "LogLevel=OFF").LumenKey, undefined);
});
