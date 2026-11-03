import { qs } from "@nsnanocat/util";
import { Request as request } from "../src/process/Request.mjs";
import { Request as requestDev } from "../src/process/Request.dev.mjs";
import { Response as response } from "../src/process/Response.mjs";
import { Response as responseDev } from "../src/process/Response.dev.mjs";
import { Response as responseLumen } from "../src/process/Response.lumen.dev.mjs";

// 模拟代理平台在脚本启动前提供全局参数。
const run = (process, request, ...args) => {
	globalThis.$argument = qs.parse(request.$argument);
	return process(request, ...args);
};

export const Request = (...args) => run(request, ...args);
export const RequestDev = (...args) => run(requestDev, ...args);
export const Response = (...args) => run(response, ...args);
export const ResponseDev = (...args) => run(responseDev, ...args);
export const ResponseLumen = (...args) => run(responseLumen, ...args);
