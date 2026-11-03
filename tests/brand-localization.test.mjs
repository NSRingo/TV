import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Console, Storage } from "@nsnanocat/util";
import InjectBrand from "../src/class/InjectBrand.mjs";
import database from "../src/function/database.mjs";
import { Response, ResponseDev } from "./host.mjs";

const fixture = JSON.parse(readFileSync(new URL("fixtures/brand-localization.json", import.meta.url)));
const sports = JSON.parse(readFileSync(new URL("fixtures/us-f1-home.json", import.meta.url)));
const f1Id = "tvs.sbd.241000";
const settings = { ...database.TV.Settings, Brands: [f1Id, "tvs.sbd.7000", "edt.item.62327df1-6874-470e-98b2-a5bbeac509a2", "tvs.sbd.lumen"] };
const context = { pfm: "ipad", region: "us", settings };
const sportsTitles = {
	"en-US": "Explore F1, MLS, and MLB",
	"zh-Hans": "探索 F1、MLS 和 MLB",
	"zh-Hant": "探索 F1、MLS 和 MLB",
	"yue-Hant": "探索 F1、MLS 和 MLB",
	"ja-JP": "F1、MLS、MLBをチェック",
	"ko-KR": "F1, MLS, MLB 둘러보기",
};
Console.logLevel = "OFF";

test("constructor uses the resolved context locale without reapplying language settings", () => {
	const options = { ...context, locale: "en-US", settings: { ...settings, Locale: "zh-Hans" } };
	const tabs = [];
	new InjectBrand(options).InjectUTSConfigurationTabs(tabs, options);
	const expected = fixture.samples.find(({ locale }) => locale === options.locale);
	assert.equal(tabs.find(({ type }) => type === "Grevy").title, expected.configuration.tabs.find(({ target }) => target?.id === f1Id).title);
});

for (const sample of fixture.samples) {
	const f1 = sample.configuration.tabs.find(({ target }) => target?.id === f1Id);
	for (const [variant, processResponse] of [
		["release", Response],
		["dev", ResponseDev],
	]) {
		test(`${variant}: ${sample.locale} supplements native names from Apple captures`, async t => {
			t.mock.method(Storage, "getItem", () => ({}));
			const tabs = sample.configuration.tabs.filter(({ target }) => target?.id !== f1Id);
			const body = { data: { applicationProps: { tabs } } };
			const request = { url: sample.configuration.url, headers: {}, $argument: "LogLevel=OFF" };
			const response = await processResponse(request, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
			const actual = JSON.parse(response.body);
			assert.equal(actual.data.applicationProps.tabs.find(({ type }) => type === "Grevy").title, f1.title);
			assert.equal(actual.data.applicationProps.tabs.find(({ type }) => type === "ChannelsAndApps").title, sample.channelsAndApps.title);
			assert.equal(actual.data.applicationProps.tabs.find(({ type }) => type === "ChannelsAndApps").subTabs[0].title, "Lumen");
			assert.deepEqual(
				actual.data.applicationProps.tabs.filter(({ type }) => !["Grevy", "ChannelsAndApps"].includes(type)),
				tabs,
			);
			assert.deepEqual(JSON.parse((await processResponse(request, response)).body), actual);

			const channels = await processResponse({ ...request, url: request.url.replace("/configurations?", "/channels?") }, { headers: { "Content-Type": "application/json" }, body: "{}" });
			const brand = JSON.parse(channels.body).data.channels[f1Id];
			assert.equal(brand.name, f1.title);
			assert.equal(brand.title, f1.title);
		});
	}

	test(`${sample.locale}: F1 cards and the known English sports header localize while existing cards are preserved`, () => {
		const injector = new InjectBrand({ settings, locale: sample.locale });
		for (const [method, shelf] of [
			["InjectWatchNowLockup", { displayType: "brandLockup", items: [] }],
			["InjectSearchLanding", { displayType: "brick", isGrid: true, items: [] }],
		]) {
			const body = { data: { canvas: { shelves: [shelf] } } };
			injector[method](body, context);
			assert.equal(shelf.items.find(({ id }) => id === f1Id).title, f1.title);
			assert.equal(body.data.channels[f1Id].title, f1.title);
		}
		const shelf = structuredClone(sports.body.data.canvas.shelves[0]);
		shelf.items = shelf.items.filter(({ id }) => id !== f1Id);
		const before = structuredClone(shelf);
		before.header.title = sportsTitles[sample.locale];
		injector.InjectBrick([shelf], {}, context);
		assert.equal(shelf.items.find(({ id }) => id === f1Id).title, f1.title);
		assert.deepEqual({ ...shelf, items: shelf.items.filter(({ id }) => id !== f1Id) }, before);
		const channels = structuredClone(sports.body.data.channels);
		const original = channels[f1Id];
		injector.InjectChannels(channels, context);
		assert.equal(channels[f1Id], original);
		assert.deepEqual(channels[f1Id], sports.body.data.channels[f1Id]);
	});

	test(`${sample.locale}: supplementary sports brick localizes its header and captured card names`, () => {
		const options = { ...context, locale: sample.locale };
		const shelves = [{ id: "uts.col.home-popular-movies", items: [] }];
		new InjectBrand(options).InjectBrick(shelves, {}, options);
		const shelf = shelves[0];
		assert.equal(shelf.header.title, sportsTitles[sample.locale]);
		assert.equal(shelf.items.find(({ id }) => id === f1Id).title, f1.title);
		for (const item of sample.sportsShelf.items ?? []) assert.equal(shelf.items.find(({ id }) => id === item.id).title, item.title);
	});

	test(`${sample.locale}: search BR uses the shared label and preserves existing localized headers`, async t => {
		t.mock.method(globalThis, "fetch", async () => new globalThis.Response(JSON.stringify({ items: [] }), { status: 200 }));
		globalThis.fetch.cookieJar = {};
		const injector = new InjectBrand({ settings, locale: sample.locale });
		const options = { ...context, pathname: "/uts/v3/shelves/uts.col.search.BR", searchTerm: "Lumen", topResultsOnly: false, lumenKey: "test-key" };
		const body = {};
		await injector.InjectSearch(body, options);
		assert.equal(body.data.shelf.title, sample.channelsAndApps.title);
		assert.equal(body.data.shelf.header.title, sample.channelsAndApps.title);
		const shelf = { id: "uts.col.search.BR", header: { title: sample.channelsAndApps.title }, items: [] };
		const header = structuredClone(shelf.header);
		await injector.InjectSearch({ data: { shelf } }, options);
		assert.deepEqual(shelf.header, header);
	});
}

for (const [locale, headers, configuredLocale, expectedLocale] of [
	["zh-Hans", { "X-Apple-I-Locale": "en_US" }, "AUTO", "zh-Hans"],
	["en-US", { "X-Apple-I-Locale": "zh_Hans" }, "zh-Hant", "zh-Hant"],
	[undefined, { "x-apple-i-locale": "zh_Hans_TW", "Accept-Language": "en-US" }, "AUTO", "zh-Hans"],
	[undefined, { "X-Apple-I-Locale": "zh-Hant_TW" }, "AUTO", "zh-Hant"],
	[undefined, { "accept-language": "yue-Hant-HK,zh-Hant;q=0.9" }, "AUTO", "yue-Hant"],
	["zh-TW", {}, "AUTO", "zh-Hant"],
	["en-GB", {}, "AUTO", "en-US"],
	["fr-FR", {}, "AUTO", "en-US"],
	[undefined, {}, "AUTO", "en-US"],
]) {
	for (const [variant, processResponse] of [
		["release", Response],
		["dev", ResponseDev],
	]) {
		test(`${variant}: ${JSON.stringify({ locale, headers, configuredLocale })} selects ${expectedLocale} independently of region`, async t => {
			t.mock.method(Storage, "getItem", () => ({}));
			const url = new URL("https://uts-api.itunes.apple.com/uts/v3/configurations?sf=143470&pfm=ipad");
			if (locale) url.searchParams.set("locale", locale);
			const request = { url: url.toString(), headers, $argument: `Locale=${configuredLocale}&LogLevel=OFF` };
			const before = structuredClone(request);
			const response = await processResponse(request, { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: { applicationProps: { tabs: [] } } }) });
			const tabs = JSON.parse(response.body).data.applicationProps.tabs;
			const expected = fixture.samples.find(({ locale }) => locale === expectedLocale);
			assert.equal(tabs.find(({ type }) => type === "Grevy").title, expected.configuration.tabs.find(({ target }) => target?.id === f1Id).title);
			assert.equal(tabs.find(({ type }) => type === "ChannelsAndApps").title, expected.channelsAndApps.title);
			assert.deepEqual(request, before);
		});
	}
}
