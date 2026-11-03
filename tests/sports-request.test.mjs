import assert from "node:assert/strict";
import test from "node:test";
import { Console, Storage } from "@nsnanocat/util";
import { Request } from "./host.mjs";
import { RequestDev } from "./host.mjs";

Console.logLevel = "OFF";

for (const [variant, processRequest] of [["release", Request], ["dev", RequestDev]]) {
	test(`${variant}: MLS sporting events preserve the incoming storefront and locale`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		for (const pfm of ["ipad", "desktop"]) for (const sf of ["143441", "143470", "143462", undefined]) {
			const url = new URL("https://uts-api.itunes.apple.com/uts/v3/sporting-events/umc.cse.1zd46m5ezykhybum56m74ccbp?caller=js&ctx_brand=tvs.sbd.7000&locale=zh-Hant&v=101");
			url.searchParams.set("pfm", pfm);
			if (sf !== undefined) url.searchParams.set("sf", sf);
			const headers = { "X-Apple-Store-Front": `${sf ?? "143470"}-18,33`, "x-apple-store-front": `${sf ?? "143470"}-18,33`, "Accept-Language": "zh-Hant" };
			const { $request } = await processRequest({ method: "GET", url: url.toString(), headers: { ...headers }, $argument: "CountryCode.Sports=JP&CountryCode.Others=US&Locale=AUTO&LogLevel=OFF" });
			const actual = new URL($request.url);
			assert.equal(actual.searchParams.get("sf"), sf ?? null);
			assert.equal(actual.searchParams.get("locale"), "zh-Hant");
			assert.equal(actual.searchParams.get("pfm"), "ipad");
			assert.deepEqual($request.headers, headers);
		}
	});

	test(`${variant}: Formula 1 brand context shares Sports country settings without changing platform handling`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		const { $request } = await processRequest({
			url: "https://uts-api.itunes.apple.com/uts/v3/sporting-events/umc.cse.synthetic?ctx_brand=tvs.sbd.241000&pfm=desktop&sf=143470&locale=zh-Hant",
			headers: { "X-Apple-Store-Front": "143470-18,33", "x-apple-store-front": "143470-18,33" },
			$argument: "CountryCode.Sports=JP&CountryCode.Grevy=TW&LogLevel=OFF",
		});
		const actual = new URL($request.url);
		assert.equal(actual.searchParams.get("sf"), "143462");
		assert.equal(actual.searchParams.get("pfm"), "desktop");
		assert.equal(actual.searchParams.get("locale"), "zh-Hant");
		assert.equal($request.headers["X-Apple-Store-Front"], "143462-18,33");
		assert.equal($request.headers["x-apple-store-front"], "143462-18,33");
	});

	test(`${variant}: other sporting events retain configured Sports storefront routing`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		for (const brand of [undefined, "tvs.sbd.synthetic"]) {
			const url = new URL("https://uts-api.itunes.apple.com/uts/v3/sporting-events/umc.cse.synthetic?caller=js&locale=zh-Hant&pfm=desktop&sf=143470&v=101");
			if (brand !== undefined) url.searchParams.set("ctx_brand", brand);
			const { $request } = await processRequest({ method: "GET", url: url.toString(), headers: { "X-Apple-Store-Front": "143470-18,33" }, $argument: "CountryCode.Sports=JP&Locale=AUTO&LogLevel=OFF" });
			assert.equal(new URL($request.url).searchParams.get("sf"), "143462");
			assert.equal(new URL($request.url).searchParams.get("locale"), "zh-Hant");
			assert.equal(new URL($request.url).searchParams.get("pfm"), "ipad");
			assert.equal($request.headers["X-Apple-Store-Front"], "143462-18,33");
		}
	});
}
