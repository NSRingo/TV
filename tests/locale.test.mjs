import assert from "node:assert/strict";
import test from "node:test";
import { Console, Storage } from "@nsnanocat/util";
import { Request } from "../src/process/Request.mjs";
import { Request as RequestDev } from "../src/process/Request.dev.mjs";

Console.logLevel = "OFF";

for (const [variant, processRequest] of [["release", Request], ["dev", RequestDev]]) {
	for (const path of ["/uts/v3/configurations", "/uts/v3/user/settings", "/uts/v3/canvases/Channels/tvs.sbd.241000"]) {
		test(`${variant}: AUTO follows the App language independently of the US region for ${path}`, async t => {
			t.mock.method(Storage, "getItem", () => ({}));
			for (const locale of ["zh-Hans", "zh-Hant", "ja-JP", undefined]) {
				const url = new URL(path, "https://uts-api.itunes.apple.com");
				url.searchParams.set("sf", "143470");
				if (locale !== undefined) url.searchParams.set("locale", locale);
				const headers = { "X-Apple-I-Locale": "zh_Hant_TW", "Accept-Language": "zh-Hant-TW,zh;q=0.9" };
				const { $request } = await processRequest({ url: url.toString(), headers: { ...headers }, $argument: "Locale=AUTO&CountryCode.Configs=US&CountryCode.Settings=US&LogLevel=OFF" });
				assert.equal(new URL($request.url).searchParams.get("sf"), "143441");
				assert.equal(new URL($request.url).searchParams.get("locale"), locale ?? null);
				assert.deepEqual($request.headers, headers);
			}
		});
	}

	test(`${variant}: an explicit language overrides only the UTS locale parameter`, async t => {
		t.mock.method(Storage, "getItem", () => ({}));
		for (const query of ["sf=143470&locale=en-US", "sf=143470"]) {
			const headers = { "X-Apple-I-Locale": "en_US", "Accept-Language": "en-US" };
			const { $request } = await processRequest({ url: `https://uts-api.itunes.apple.com/uts/v3/canvases/Channels/tvs.sbd.241000?${query}`, headers: { ...headers }, $argument: "Locale=zh-Hant&LogLevel=OFF" });
			assert.equal(new URL($request.url).searchParams.get("locale"), "zh-Hant");
			assert.deepEqual($request.headers, headers);
		}
		const { $request } = await processRequest({ url: "https://play.itunes.apple.com/f1.m3u8", headers: {}, $argument: "Locale=zh-Hant&LogLevel=OFF" });
		assert.equal(new URL($request.url).searchParams.has("locale"), false);
	});

	test(`${variant}: persistent AUTO retains the App locale over an argument language`, async t => {
		t.mock.method(Storage, "getItem", () => ({ TV: { Settings: { Locale: "AUTO" } } }));
		const { $request } = await processRequest({ url: "https://uts-api.itunes.apple.com/uts/v3/user/settings?locale=ja-JP", headers: {}, $argument: "Locale=en-US&LogLevel=OFF" });
		assert.equal(new URL($request.url).searchParams.get("locale"), "ja-JP");
	});
}
