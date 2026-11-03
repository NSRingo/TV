import assert from "node:assert/strict";
import test from "node:test";
import { Console, Storage } from "@nsnanocat/util";
import { Hono } from "hono/tiny";
import app from "../src/Hono.js";
import Adapter from "../src/class/HonoWorkerAdapter.mjs";

Console.logLevel = "OFF";

test("TV routes map Pages, preview, Worker and host-prefixed paths to Apple", () => {
	for (const host of ["uts-api-itunes.pages.dev", "dev.uts-api-itunes.pages.dev", "uts-api-itunes.nanocat.cloud", "example.account.workers.dev"]) {
		assert.equal(Adapter.routeRewrite(new URL(`https://${host}/uts/v3/configurations?sf=143441`)).href, "https://uts-api.itunes.apple.com/uts/v3/configurations?sf=143441");
		assert.equal(Adapter.routeRewrite(new URL(`https://${host}/v3/channels/scoreboard`)).hostname, "umc-tempo-api.apple.com");
		assert.equal(Adapter.routeRewrite(new URL(`https://${host}/uts-api.itunes.apple.com/uts/v3/configurations`)).pathname, "/uts/v3/configurations");
		assert.equal(Adapter.routeRewrite(new URL(`https://${host}/umc-tempo-api.apple.com/v3/register`)).hostname, "umc-tempo-api.apple.com");
	}
	assert.throws(() => Adapter.routeRewrite(new URL("https://uts-api-itunes.pages.dev/example.com/test")), /Unsupported TV route/);
});

test("request conversion preserves text and binary bodies and removes forwarding headers", async () => {
	const route = new Hono().all("/*", async c => c.json({ request: await Adapter.buildRequest(c.req) }));
	const result = await route.request("https://worker.test/uts/v3/user/settings?sf=143470&CountryCode.Settings=US", {
		method: "POST",
		body: '{"enabled":true}',
		headers: { "Content-Type": "application/json", "CF-Ray": "test", Host: "worker.test", $argument: "ThirdParty=true" },
	});
	const { request } = await result.json();
	assert.equal(request.body, '{"enabled":true}');
	assert.equal(request.headers.host, undefined);
	assert.equal(request.headers["cf-ray"], undefined);
	assert.equal(request.headers.$argument, undefined);
	assert.deepEqual(request.$argument, { ThirdParty: "true" });
	assert.equal(new URL(request.url).search, "?sf=143470");
	const binary = await route.request("https://worker.test/uts/v3/binary", { method: "POST", body: new Uint8Array([0, 255, 128]), headers: { "Content-Type": "application/octet-stream" } });
	assert.deepEqual(Object.values((await binary.json()).request.body), [0, 255, 128]);
});

test("response conversion preserves binary bytes, repeated headers and bodyless statuses", async () => {
	const route = new Hono().get("/", c => Adapter.writeResponse(c, { status: 200, headers: { "Content-Type": "application/octet-stream", "CONTENT-LENGTH": "999", "Content-Encoding": "gzip", "Set-Cookie": ["a=1", "b=2"] }, body: "decoded text must not replace bytes", bodyBytes: new Uint8Array([0, 255, 128]) }));
	const response = await route.request("/");
	assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [0, 255, 128]);
	assert.deepEqual(response.headers.getSetCookie(), ["a=1", "b=2"]);
	assert.equal(response.headers.get("content-length"), null);
	assert.equal(response.headers.get("content-encoding"), null);
	for (const status of [204, 205, 304]) {
		const empty = new Hono().get("/", c => Adapter.writeResponse(c, { status, headers: {}, body: "" }));
		assert.equal((await empty.request("/")).status, status);
	}
});

test("Hono pipeline isolates interleaved request settings across upstream fetch", async t => {
	t.mock.method(Storage, "getItem", () => ({}));
	const calls = [];
	t.mock.method(globalThis, "fetch", async (url, options) => {
		calls.push({ url, options });
		await new Promise(resolve => setTimeout(resolve, url.includes("pfm=ipad") ? 10 : 0));
		return new globalThis.Response(
			JSON.stringify({
				data: {
					applicationProps: {
						tabs: [
							{ type: "WatchNow", title: "Home" },
							{ type: "Library", title: "Library" },
						],
					},
				},
			}),
			{ status: 200, headers: { "Content-Type": "application/json" } },
		);
	});
	globalThis.fetch.cookieJar = {};
	const [first, second] = await Promise.all([app.request("https://uts-api-itunes.pages.dev/uts/v3/configurations?pfm=ipad&v=80&Brands=F1&LogLevel=OFF"), app.request("https://dev.uts-api-itunes.pages.dev/uts/v3/configurations?pfm=iphone&v=80&Brands=Originals&LogLevel=OFF")]);
	assert.deepEqual(
		(await first.json()).data.applicationProps.tabs.map(tab => tab.type),
		["WatchNow", "Grevy", "Library"],
	);
	assert.deepEqual(
		(await second.json()).data.applicationProps.tabs.map(tab => tab.type),
		["WatchNow", "Originals", "Library"],
	);
	assert.equal(calls.length, 2);
	for (const { url, options } of calls) {
		assert.equal(new URL(url).hostname, "uts-api.itunes.apple.com");
		assert.equal(new URL(url).searchParams.has("Brands"), false);
		assert.equal(options.$argument, undefined);
	}
});

test("health check does not fetch and upstream failures return 500", async t => {
	t.mock.method(globalThis, "fetch", async () => {
		throw new Error("upstream unavailable");
	});
	globalThis.fetch.cookieJar = {};
	t.mock.method(console, "error", () => {});
	assert.equal(await (await app.request("/")).text(), "OK");
	const response = await app.request("https://worker.test/uts/v3/configurations?LogLevel=OFF");
	assert.equal(response.status, 500);
	assert.match(await response.text(), /upstream unavailable/);
});
