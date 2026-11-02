import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Console, Storage } from "@nsnanocat/util";
import { Response } from "../src/process/Response.mjs";
import { Response as ResponseDev } from "../src/process/Response.dev.mjs";

const fixture = JSON.parse(readFileSync(new URL("fixtures/us-f1-home.json", import.meta.url)));
const brandId = "tvs.sbd.241000";
Console.logLevel = "OFF";

for (const [variant, processResponse] of [
	["release", Response],
	["dev", ResponseDev],
]) {
	for (const displayType of ["channelLockup", "brandLockup", "doorLockupWithSections", "brick"]) {
		test(`${variant}: existing ${displayType} uses its injection method without platform/version conditions`, async t => {
			t.mock.method(Storage, "getItem", () => ({}));
			const items = [{ id: "tvs.sbd.4000", title: "Apple TV" }, { id: "tvs.sbd.7000", title: "MLS" }, { id: "other" }];
			const container = { items, nextToken: "preserved" };
			const shelf =
				displayType === "doorLockupWithSections"
					? {
							displayType,
							sections: [
								{ id: "other", items: [{ id: "keep" }] },
								{ id: "uts.shlfsect.moretv", ...container },
							],
						}
					: { id: displayType === "brick" ? "uts.col.tv-plus-sports-nav-brick" : "legacy-channel-row", displayType, ...container };
			const body = { data: { canvas: { shelves: [shelf], nextToken: "canvas-preserved" } } };
			const request = { url: "https://uts-api.itunes.apple.com/uts/v3/canvases/Roots/tahoma_watchnow?pfm=iphone&v=1&sf=143470", headers: {}, $argument: "LogLevel=OFF" };
			const response = await processResponse(request, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
			const actual = JSON.parse(response.body);
			const actualShelf = actual.data.canvas.shelves[0];
			const actualContainer = displayType === "doorLockupWithSections" ? actualShelf.sections[1] : actualShelf;
			assert.deepEqual(
				actualContainer.items.filter(({ id }) => id !== "tvs.sbd.lumen").map(({ id }) => id),
				displayType === "doorLockupWithSections" ? ["tvs.sbd.4000", "tvs.sbd.7000", "other"] : ["tvs.sbd.4000", brandId, "tvs.sbd.7000", ...(displayType === "brick" ? ["edt.item.62327df1-6874-470e-98b2-a5bbeac509a2"] : []), "other"],
			);
			if (displayType === "doorLockupWithSections") assert.equal(actual.data.channels?.[brandId], undefined);
			else assert.deepEqual(actualContainer.items.find(({ id }) => id === brandId).images.shelfItemImage, fixture.body.data.canvas.shelves[0].items[0].images.shelfItemImage);
			assert.equal(actualContainer.nextToken, "preserved");
			assert.equal(actual.data.canvas.nextToken, "canvas-preserved");
			const twice = await processResponse(request, { headers: { "Content-Type": "application/json" }, body: response.body });
			assert.deepEqual(JSON.parse(twice.body), actual);
		});
	}

	test(`${variant}: native iPhone sports brick and existing F1 state stay intact`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		const body = structuredClone(fixture.body);
		body.data.channels[brandId].isSubscribed = false;
		const response = await processResponse({ url: "https://uts-api.itunes.apple.com/uts/v3/canvases/Roots/tahoma_watchnow?pfm=desktop&v=1&sf=143441", headers: {}, $argument: "LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
		const actual = JSON.parse(response.body);
		assert.deepEqual(actual.data.canvas, body.data.canvas);
		assert.deepEqual(actual.data.channels[brandId], body.data.channels[brandId]);
		assert.equal(actual.data.channels["tvs.sbd.7000"].isFirstParty, true);
	});

	test(`${variant}: a missing F1 item reuses native brand state and precedes MLS`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		const body = structuredClone(fixture.body);
		body.data.channels[brandId].isSubscribed = false;
		body.data.canvas.shelves[0].items.shift();
		const response = await processResponse({ url: "https://uts-api.itunes.apple.com/uts/v3/canvases/Roots/tahoma_watchnow?pfm=iphone&v=1&sf=143441", headers: {}, $argument: "LogLevel=OFF" }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
		const actual = JSON.parse(response.body);
		assert.equal(actual.data.canvas.shelves[0].items[0].id, brandId);
		assert.equal(actual.data.canvas.shelves[0].items[1].id, "tvs.sbd.7000");
		assert.deepEqual(actual.data.channels[brandId], body.data.channels[brandId]);
		assert.equal(actual.data.channels[brandId].isSubscribed, false);
	});

	for (const argument of ["LogLevel=OFF", "Tabs=WatchNow&LogLevel=OFF"]) {
		test(`${variant}: no new F1 row is created, and tab selection controls supplementation: ${argument}`, async t => {
			t.mock.method(Storage, "getItem", () => ({}));
			const shelf = argument.startsWith("Tabs=") ? { displayType: "channelLockup", items: [] } : { displayType: "brick", id: "unrelated", items: [{ id: "keep" }] };
			const response = await processResponse({ url: "https://uts-api.itunes.apple.com/uts/v3/canvases/Roots/tahoma_watchnow?pfm=ipad&v=100&sf=143441", headers: {}, $argument: argument }, { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: { canvas: { shelves: [shelf] } } }) });
			const body = JSON.parse(response.body);
			assert.equal(body.data.canvas.shelves.length, 1);
			assert.equal(
				body.data.canvas.shelves[0].items.some(({ id }) => id === brandId),
				false,
			);
			assert.equal(body.data.channels?.[brandId], undefined);
		});
	}
}
