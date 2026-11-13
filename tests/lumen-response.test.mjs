import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Console, Storage } from "@nsnanocat/util";
import InjectBrand from "../src/class/InjectBrand.mjs";
import { ResponseLumen as Response } from "./host.mjs";

const fixtures = JSON.parse(readFileSync(new URL("fixtures/lumen-resources.json", import.meta.url)));
const episodeFixture = JSON.parse(readFileSync(new URL("fixtures/episode-images.json", import.meta.url))).lumen;
const settings = { Brands: ["tvs.sbd.lumen"] };
Console.logLevel = "OFF";

test("Surge dev module loads the Lumen response body for show and episode-list paths", () => {
	const source = readFileSync(new URL("../template/surge.dev.handlebars", import.meta.url), "utf8");
	const line = source.split("\n").find(line => line.startsWith("📺 TV.lumen.response ="));
	assert.ok(line);
	assert.ok(line.includes("requires-body=1"));
	assert.ok(line.includes("/raw/response.lumen.dev.bundle.js"));
	const pattern = new RegExp(line.match(/pattern=(.*?), requires-body=/)[1]);
	for (const path of ["shows/umc.cmc.lumen1718603", "shows/umc.cmc.lumen1718603/episodes"]) assert.ok(pattern.test(`https://www.lumen.ax/api/appletv/v1/uts/v3/${path}?pfm=iphone&v=100`));
	for (const path of ["movies/umc.cmc.lumen1580066", "shows/umc.cmc.lumen1718603/episodes/extra", "shows/umc.cmc.lumen1718603/similar"]) assert.equal(pattern.test(`https://www.lumen.ax/api/appletv/v1/uts/v3/${path}?pfm=iphone`), false);
	assert.match(source, /^hostname = %APPEND% .*www\.lumen\.ax$/m);
});

test("deselected Lumen leaves backend resources unchanged", async t => {
	t.mock.method(Storage, "getItem", () => ({}));
	for (const brands of ["[]", "F1,MLS,MLB"]) {
		for (const [path, body] of [
			["canvases/Channels/tvs.sbd.lumen", fixtures.channel],
			["shelves/edt.col.lumen-lib-284", { data: { shelf: fixtures.channel.data.canvas.shelves[0] } }],
			["movies/umc.cmc.lumen1580066", fixtures.movie],
			["shows/umc.cmc.lumen1718603/episodes", episodeFixture],
		]) {
			const response = { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
			await Response({ url: `https://www.lumen.ax/api/appletv/v1/uts/v3/${path}`, $argument: `Brands=${brands}&LogLevel=OFF` }, response);
			assert.deepEqual(JSON.parse(response.body), body);
		}
	}
});

for (const platform of ["iphone", "iPhone", "ipad", "desktop", "atv", "appletv"]) {
	test(`Lumen ${platform}: episode images use sampled Apple dimensions with native URL placeholders`, async t => {
		const expected = structuredClone(episodeFixture);
		for (const episode of expected.data.episodes) {
			for (const image of [episode.images.contentImage, episode.images.posterArt]) {
				image.width = 3840;
				image.height = 2160;
			}
		}
		const path = "/uts/v3/shows/umc.cmc.lumen1718603/episodes";
		const actual = await replay(t, path, episodeFixture, undefined, platform);
		assert.deepEqual(actual, expected);
		assert.equal(actual.data.episodes[0].images.contentImage.url, "https://www.lumen.ax/api/appletv/i/fixture/img/1718605/Primary/f4b384c7712c61b18f23a54abb6c3df8/{w}x{h}.{f}");
		assert.deepEqual(
			actual.data.episodes.map(episode => [episode.images.contentImage.width, episode.images.contentImage.height]),
			[
				[3840, 2160],
				[3840, 2160],
			],
		);
		assert.deepEqual(await replay(t, path, actual, undefined, platform), actual);
	});
}

for (const platform of ["web", ""]) {
	test(`Lumen ${platform || "missing"}: episode list retains the upstream model`, async t => {
		assert.deepEqual(await replay(t, "/uts/v3/shows/umc.cmc.lumen1718603/episodes", episodeFixture, undefined, platform), episodeFixture);
	});
}

async function replay(t, path, body, origin = "https://www.lumen.ax/api/appletv/v1", platform = "iphone", version = "101") {
	t.mock.method(Storage, "getItem", () => ({}));
	const response = { status: 200, headers: { "Content-Type": "application/json;charset=utf-8" }, body: JSON.stringify(body) };
	const query = new URLSearchParams({ pfm: platform, sf: "143470" });
	if (version !== null) query.set("v", version);
	const result = await Response({ url: `${origin}${path}?${query}`, headers: {}, $argument: "LogLevel=OFF" }, response);
	assert.equal(result, response);
	return JSON.parse(result.body);
}

// 原站 HBO 的 v83/v84 相邻版本在普通行、品牌头部与独立 shelf 上确认了 header 分界。
// Adjacent origin HBO v83/v84 responses confirm the header boundary for content rows, brand headers, and standalone shelves.
for (const version of ["82", "83", "84", "101", null]) {
	test(`Lumen v=${version ?? "absent"}: uses the matching shelf header format`, async t => {
		for (const platform of ["iphone", "atv", "appletv", "ipad", "desktop"]) {
			for (const [path, input] of [
				["/uts/v3/canvases/Channels/tvs.sbd.lumen", fixtures.channel],
				["/uts/v3/canvases/Rooms/edt.item.lumen", fixtures.channel],
				["/uts/v3/shelves/edt.col.lumen-lib-284", { data: { shelf: fixtures.channel.data.canvas.shelves[1] } }],
			]) {
				const actual = await replay(t, path, input, undefined, platform, version);
				const shelves = actual.data.shelf ? [actual.data.shelf] : actual.data.canvas.shelves;
				const row = shelves.at(-1);
				assert.equal(row.title, "其他剧集");
				if (version === "82" || version === "83") {
					assert.deepEqual(shelves, input.data.shelf ? [input.data.shelf] : input.data.canvas.shelves);
				} else {
					assert.equal(row.header.title, "其他剧集");
					assert.equal(row.header.supportsSeeAllView, true);
					assert.equal(row.header.url, "https://tv.apple.com/us/shelf/lumen/edt.col.lumen-lib-284");
					if (actual.data.canvas) assert.equal(shelves[0].header.entity.id, "tvs.sbd.lumen");
				}
				assert.deepEqual(row.items, fixtures.channel.data.canvas.shelves[1].items);
				assert.deepEqual(await replay(t, path, actual, undefined, platform, version), actual);
			}
		}
	});
}

for (const path of ["/uts/v3/canvases/Channels/tvs.sbd.lumen", "/uts/v3/canvases/Rooms/edt.item.lumen", "/uts/v3/shelves/edt.col.lumen-lib-284"]) {
	test(`Lumen ${path}: omits empty genres so tvOS keeps Movie and Show lockups`, async t => {
		const items = [
			{ id: "movie-empty", type: "Movie", title: "Movie", genres: [] },
			{ id: "show-empty", type: "Show", title: "Show", genres: [] },
			{ id: "movie-drama", type: "Movie", genres: [{ id: "drama", name: "Drama" }] },
			{ id: "show-missing", type: "Show" },
		];
		const body = structuredClone(fixtures.channel);
		for (const shelf of body.data.canvas.shelves) {
			shelf.items = items;
			shelf.nextToken = "page-two";
		}
		const input = path.includes("/shelves/") ? { data: { shelf: body.data.canvas.shelves[1] } } : body;
		const expected = structuredClone(items);
		delete expected[0].genres;
		delete expected[1].genres;
		for (const platform of ["atv", "appletv", "iphone", "ipad", "desktop"]) {
			const actual = await replay(t, path, input, undefined, platform);
			const shelves = actual.data.shelf ? [actual.data.shelf] : actual.data.canvas.shelves;
			assert.equal(shelves.length, path.includes("/shelves/") ? 1 : body.data.canvas.shelves.length);
			for (const shelf of shelves) {
				assert.deepEqual(shelf.items, expected);
				assert.equal(shelf.nextToken, "page-two");
				// TV JS 27.1.16 的 tvOS 分类文案分支实际读取方式。
				assert.doesNotThrow(() => shelf.items.map(item => item.genres?.[0].name));
			}
			assert.deepEqual(await replay(t, path, actual, undefined, platform), actual);
		}
	});
}

for (const platform of ["atv", "appletv", "iphone", "ipad", "desktop"]) {
	test(`Lumen ${platform}: uses the native Channel model for canvas and shelf responses`, async t => {
		const brandId = "tvs.sbd.lumen";
		const body = structuredClone(fixtures.channel);
		const state = { isSubscribed: false, isInstalled: false, isConsented: false, isPinned: true };
		Object.assign(body.data.channels[brandId], state, { isWatchlistEnabled: false, shouldTrackPlayActivity: false });
		body.data.channels.other = { id: "other", isApSubscription: false, isFirstParty: false };
		for (const [path, input, activityEnabled] of [
			["/uts/v3/canvases/Channels/tvs.sbd.lumen", body, true],
			["/uts/v3/canvases/Rooms/edt.item.lumen", body, false],
			["/uts/v3/shelves/edt.shelf.lumen-hero", { data: { shelf: body.data.canvas.shelves[0], channels: body.data.channels } }, false],
		]) {
			const actual = await replay(t, path, input, undefined, platform);
			const brand = actual.data.channels[brandId];
			assert.equal(brand.type, "Brand");
			assert.equal(brand.isApSubscription, true);
			assert.equal(brand.isFirstParty, true);
			assert.equal(brand.isTvAppBrand, false);
			assert.equal(brand.isAppleTvPlus, false);
			assert.equal(brand.isItunes, false);
			assert.equal(brand.isWatchlistEnabled, activityEnabled);
			assert.equal(brand.shouldTrackPlayActivity, activityEnabled);
			const mobile = platform === "iphone" || platform === "ipad";
			assert.deepEqual(brand.appBundleIds, [mobile ? "com.apple.tv" : "com.apple.TVWatchList"]);
			assert.deepEqual(brand.appAdamIds, [mobile ? "1174078549" : "1171145244"]);
			for (const [key, value] of Object.entries(state)) assert.equal(brand[key], value);
			assert.deepEqual(actual.data.channels.other, input.data.channels.other);
			const hero = actual.data.shelf ?? actual.data.canvas.shelves[0];
			assert.deepEqual(hero.header.entity, brand);
			assert.deepEqual(hero.items, body.data.canvas.shelves[0].items);
			assert.deepEqual(await replay(t, path, actual, undefined, platform), actual);
		}
	});
}

for (const [path, activityEnabled] of [
	["/uts/v3/canvases/Channels/tvs.sbd.lumen", true],
	["/uts/v3/canvases/Rooms/edt.item.lumen", false],
]) {
	test(`Lumen ${path}: repairs header hierarchy and reuses the complete Brand`, async t => {
		const actual = await replay(t, path, fixtures.channel);
		const [hero, row] = actual.data.canvas.shelves;
		assert.equal(row.header.title, row.title);
		assert.equal(row.header.supportsSeeAllView, true);
		assert.equal(row.header.url, row.url.replace("/collection/", "/shelf/"));
		assert.equal(hero.header.entityType, "Brand");
		assert.deepEqual(hero.header.entity, actual.data.channels["tvs.sbd.lumen"]);
		assert.equal(hero.header.title, "Lumen");
		assert.equal(hero.header.supportsSeeAllView, false);
		assert.equal(hero.header.url, actual.data.channels["tvs.sbd.lumen"].url);
		assert.deepEqual(hero.header.images.headerImage, actual.data.channels["tvs.sbd.lumen"].images.appIcon);
		const expected = structuredClone(fixtures.channel);
		new InjectBrand({ settings }).InjectChannels(expected.data.channels, { pfm: "iphone", region: "tw", settings });
		expected.data.channels["tvs.sbd.lumen"].isWatchlistEnabled = activityEnabled;
		expected.data.channels["tvs.sbd.lumen"].shouldTrackPlayActivity = activityEnabled;
		assert.deepEqual(actual.data.channels, JSON.parse(JSON.stringify(expected.data.channels)));
		for (const [index, shelf] of actual.data.canvas.shelves.entries()) {
			const { header, ...unchanged } = shelf;
			assert.deepEqual(unchanged, fixtures.channel.data.canvas.shelves[index]);
		}
		assert.equal(actual.data.canvas.shelves.length, fixtures.channel.data.canvas.shelves.length);
		assert.deepEqual(await replay(t, path, actual), actual);
	});
}

test("website injection mutates the supplied shelves, preserves rows and pagination, and replaces its own row", () => {
	const body = structuredClone(fixtures.channel);
	const shelves = body.data.canvas.shelves;
	const originals = [...shelves];
	body.data.canvas.nextToken = "page-two";
	const inject = new InjectBrand({ settings });
	assert.equal(inject.InjectWebsiteLink(shelves, { region: "tw", settings }), shelves);
	assert.equal(body.data.canvas.shelves, shelves);
	assert.equal(body.data.canvas.nextToken, "page-two");
	for (const [index, row] of originals.entries()) assert.equal(shelves[index], row);
	const website = shelves.at(-1);
	assert.equal(website.id, "edt.col.lumen-website");
	assert.equal(website.displayType, "epicShowcase");
	assert.equal(website.url, "https://tv.apple.com/tw/collection/edt.col.lumen-website");
	assert.equal(website.items[0].type, "ExternalLink");
	assert.equal(website.items[0].isExternalUrl, true);
	assert.equal(website.items[0].flavorType, "Flavor_D");
	assert.equal(website.items[0].url, "https://www.lumen.ax/");
	assert.equal(website.items[0].shortNote, "https://www.lumen.ax/");
	const expected = structuredClone(body);
	shelves.at(-1).items[0].url = "https://example.test/stale";
	inject.InjectWebsiteLink(shelves, { region: "tw", settings });
	assert.deepEqual(body, expected);
});

test("website injection populates an empty shelves array", () => {
	const shelves = [];
	new InjectBrand({ settings }).InjectWebsiteLink(shelves, { region: "us", settings });
	assert.equal(shelves.length, 1);
	assert.equal(shelves[0].items[0].url, "https://www.lumen.ax/");
});

test("independent Lumen shelf preserves pagination, items and existing header fields", async t => {
	const shelf = { ...structuredClone(fixtures.channel.data.canvas.shelves[1]), nextToken: "page-two", header: { title: "Existing title", supportsSeeAllView: false, url: "https://tv.apple.com/tw/shelf/existing/edt.col.lumen-lib-284", custom: true } };
	const body = { data: { shelf } };
	assert.deepEqual((await replay(t, "/uts/v3/shelves/edt.col.lumen-lib-284", body)).data.shelf, shelf);
	delete shelf.header;
	const actual = await replay(t, "/uts/v3/shelves/edt.col.lumen-lib-284", body);
	assert.equal(actual.data.shelf.header.title, shelf.title);
	assert.equal(actual.data.shelf.nextToken, "page-two");
	assert.deepEqual(actual.data.shelf.items, shelf.items);
});

test("hero preserves existing header metadata and uses the shared Brand definition", async t => {
	const body = structuredClone(fixtures.channel);
	body.data.canvas.shelves[0].header = { title: "Existing hero", supportsSeeAllView: false, url: "https://tv.apple.com/tw/channel/existing/tvs.sbd.lumen", images: { headerImage: { url: "https://images.example.test/custom.png" }, extra: true }, custom: true };
	const actual = await replay(t, "/uts/v3/canvases/Channels/tvs.sbd.lumen", body);
	const { entityType, entity, ...header } = actual.data.canvas.shelves[0].header;
	assert.deepEqual(header, body.data.canvas.shelves[0].header);
	assert.deepEqual(entity, actual.data.channels["tvs.sbd.lumen"]);
	assert.deepEqual(entity.appBundleIds, ["com.apple.tv"]);
	assert.equal(entity.isApSubscription, true);
	assert.equal(entity.isFirstParty, true);
	assert.equal(entityType, "Brand");
});

for (const path of ["/uts/v3/canvases/Channels/tvs.sbd.lumen", "/uts/v3/canvases/Rooms/edt.item.lumen"]) {
	test(`Lumen ${path}: normalizes an incorrect backend Channel entity to Brand`, async t => {
		const body = structuredClone(fixtures.channel);
		const channel = body.data.channels["tvs.sbd.lumen"];
		channel.type = "Channel";
		body.data.canvas.shelves[0].header = { entityType: "Channel", entity: channel };
		const actual = await replay(t, path, body);
		assert.equal(actual.data.channels["tvs.sbd.lumen"].type, "Brand");
		assert.equal(actual.data.canvas.shelves[0].header.entityType, "Brand");
		assert.equal(actual.data.canvas.shelves[0].header.entity.type, "Brand");
		assert.deepEqual(actual.data.canvas.canvasInfo, body.data.canvas.canvasInfo);
		assert.equal(actual.data.canvas.canvasInfo.canvasType, "Channel");
	});
}

test("movie adds official section markers while preserving content, playback, channels and the canvas URL", async t => {
	const path = "/uts/v3/movies/umc.cmc.lumen1580066";
	const actual = await replay(t, path, fixtures.movie);
	assert.deepEqual(actual.data.canvas.shelves, [{ id: "uts.marker.HowToWatch" }, { id: "uts.marker.About" }, { id: "uts.marker.Info" }]);
	const withoutMarkers = structuredClone(actual);
	withoutMarkers.data.canvas.shelves = [];
	assert.deepEqual(withoutMarkers, fixtures.movie);
	assert.deepEqual(await replay(t, path, actual), actual);
});

test("movie keeps existing rows and markers and only adds sections backed by data", async t => {
	const body = structuredClone(fixtures.movie);
	body.data.canvas.shelves.push({ id: "uts.col.Trailers.example", displayType: "lockup", items: [{ id: "trailer" }] }, { id: "uts.marker.Info", custom: true });
	body.data.howToWatch = [];
	delete body.data.content.description;
	assert.deepEqual(await replay(t, "/uts/v3/movies/umc.cmc.lumen1580066", body), body);
	delete body.data.canvas.shelves;
	const actual = await replay(t, "/uts/v3/movies/umc.cmc.lumen1580066", body);
	assert.deepEqual(actual.data.canvas.shelves, [{ id: "uts.marker.Info" }]);
});

for (const [path, body, origin] of [
	["/uts/v3/movies/umc.cmc.lumen1580066", { error: { code: 404 } }, undefined],
	["/uts/v3/shelves/edt.col.lumen-missing", { error: { code: 404 } }, undefined],
	["/uts/v3/canvases/Channels/tvs.sbd.lumen", { data: {} }, undefined],
	["/uts/v3/canvases/Roots/tahoma_searchlanding", fixtures.channel, undefined],
	["/uts/v3/shows/umc.cmc.lumen1580066", fixtures.movie, undefined],
	["/uts/v2/movies/umc.cmc.lumen1580066", fixtures.movie, undefined],
	["/uts/v3/movies/umc.cmc.lumen1580066", fixtures.movie, "https://uts-api.itunes.apple.com"],
	["/uts/v3/movies/umc.cmc.lumen1580066", fixtures.movie, "https://example.test/api/appletv/v1"],
]) {
	test(`unmatched or error response remains unchanged: ${origin ?? "Lumen"}${path}`, async t => {
		assert.deepEqual(await replay(t, path, body, origin), body);
	});
}

test("Room without a backend Brand receives the configured Brand while unknown rows remain unchanged", async t => {
	const body = structuredClone(fixtures.channel);
	delete body.data.channels;
	body.data.canvas.shelves[1].displayType = "unknown";
	const actual = await replay(t, "/uts/v3/canvases/Rooms/edt.item.lumen", body);
	assert.equal(actual.data.channels["tvs.sbd.lumen"].type, "Brand");
	assert.equal(actual.data.channels["tvs.sbd.lumen"].isWatchlistEnabled, false);
	assert.equal(actual.data.channels["tvs.sbd.lumen"].shouldTrackPlayActivity, false);
	assert.deepEqual(actual.data.canvas.shelves[0].header.entity, actual.data.channels["tvs.sbd.lumen"]);
	assert.deepEqual(actual.data.canvas.shelves[1], body.data.canvas.shelves[1]);
});

for (const format of [undefined, "text/html", "application/octet-stream", "application/vnd.apple.mpegurl"]) {
	test(`non-JSON body is preserved: ${format}`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		const response = { headers: { "content-type": format }, body: "unchanged content" };
		assert.equal(await Response({ url: "https://www.lumen.ax/api/appletv/v1/uts/v3/movies/umc.cmc.lumen1", $argument: "LogLevel=OFF" }, response), response);
		assert.equal(response.body, "unchanged content");
	});
}

test("invalid upstream JSON is surfaced to the standard response wrapper", async t => {
	t.mock.method(Storage, "getItem", () => ({}));
	const response = { headers: { "Content-Type": "application/json" }, body: "invalid JSON" };
	await assert.rejects(Response({ url: "https://www.lumen.ax/api/appletv/v1/uts/v3/movies/umc.cmc.lumen1", $argument: "LogLevel=OFF" }, response), SyntaxError);
	assert.equal(response.body, "invalid JSON");
});
