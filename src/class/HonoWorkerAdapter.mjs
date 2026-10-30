import { qs } from "@nsnanocat/util";

export default class HonoWorkerAdapter {
	static routeRewrite(url) {
		const prefixedHost = url.pathname.split("/")[1];
		if (["uts-api.itunes.apple.com", "umc-tempo-api.apple.com"].includes(prefixedHost)) {
			url.hostname = prefixedHost;
			url.pathname = url.pathname.slice(prefixedHost.length + 1);
		} else if (/^\/uts\/v[123]\//.test(url.pathname)) {
			url.hostname = "uts-api.itunes.apple.com";
		} else if (/^\/v[123]\//.test(url.pathname)) {
			url.hostname = "umc-tempo-api.apple.com";
		} else {
			throw new TypeError("Unsupported TV route");
		}
		url.protocol = "https:";
		url.port = "";
		return url;
	}

	static normalizeRequestHeaders(headers) {
		const blacklist = new Set(["connection", "content-length", "host", "x-forwarded-proto", "x-real-ip"]);
		return Object.fromEntries(Object.entries(headers).filter(([key]) => !key.toLowerCase().startsWith("cf-") && !blacklist.has(key.toLowerCase())));
	}

	static async buildRequest(req) {
		const headers = HonoWorkerAdapter.normalizeRequestHeaders(req.header());
		const request = { method: req.method, url: HonoWorkerAdapter.routeRewrite(new URL(req.url)).toString(), headers };
		if (!["GET", "HEAD"].includes(req.method)) {
			const type = headers["content-type"] ?? "";
			if (/^(text\/|application\/(.*json|.*xml|x-www-form-urlencoded))/.test(type)) request.body = await req.text();
			else request.body = new Uint8Array(await req.arrayBuffer());
		}
		return HonoWorkerAdapter.buildArgument(request);
	}

	static buildArgument(request) {
		const url = new URL(request.url);
		request.$argument = qs.parse(request.headers.$argument ?? url.search);
		delete request.headers.$argument;
		for (const key of [...url.searchParams.keys()]) {
			if (/^[A-Z]/.test(key)) url.searchParams.delete(key);
		}
		request.url = url.toString();
		return request;
	}

	static cleanupResponseHeaders(headers) {
		return Object.fromEntries(Object.entries(headers).filter(([key]) => !["content-encoding", "content-length", "transfer-encoding"].includes(key.toLowerCase())));
	}

	static writeResponse(c, response) {
		for (const [key, value] of Object.entries(HonoWorkerAdapter.cleanupResponseHeaders(response.headers))) {
			if (Array.isArray(value)) {
				for (const entry of value) c.header(key, entry, { append: true });
			} else c.header(key, value);
		}
		const status = response.status ?? response.statusCode;
		c.status(status);
		if (c.req.method === "HEAD" || [204, 205, 304].includes(status)) return c.body(null);
		const type = response.headers["content-type"] ?? response.headers["Content-Type"] ?? "";
		const body = /^(text\/|application\/(.*json|.*xml|.*mpegurl|x-www-form-urlencoded))/.test(type) ? response.body : (response.bodyBytes ?? response.body);
		return c.body(body ?? null);
	}
}
