import { fetch } from "@nsnanocat/util";
import { Hono } from "hono/tiny";
import HonoWorkerAdapter from "./class/HonoWorkerAdapter.mjs";
import { Request } from "./process/Request.mjs";
import { Response } from "./process/Response.mjs";

export default new Hono()
	.get("/", c => c.text("OK"))
	.all("/:rest{.*}", async c => {
		let $request = await HonoWorkerAdapter.buildRequest(c.req);
		let $response;
		globalThis.$argument = $request.$argument;
		({ $request, $response } = await Request($request));
		if ($response === undefined) {
			// Only forward the HTTP payload; $argument is local to this request.
			const { $argument, ...upstream } = $request;
			try {
				$response = await fetch(upstream);
			} catch (error) {
				// The util Node adapter can reject with a string; Hono handles Error objects.
				throw error instanceof Error ? error : new Error(String(error));
			}
			globalThis.$argument = $request.$argument;
			$response = await Response($request, $response);
		}
		return HonoWorkerAdapter.writeResponse(c, $response);
	})
	.onError((error, c) => {
		console.error(error);
		return c.text(error.message, 500);
	});
