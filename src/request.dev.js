import { $app, Console, done, fetch, Lodash as _, notification, Storage, time, wait } from "@nsnanocat/util";
import { URL } from "@nsnanocat/url";
import database from "./function/database.mjs";
import setENV from "./function/setENV.mjs";
// 构造回复数据
let $response = undefined;
/***************** Processing *****************/
// 解构URL
const url = new URL($request.url);
Console.info(`url: ${url.toJSON()}`);
// 获取连接参数
const PATHs = url.pathname.split("/").filter(Boolean);
Console.info(`PATHs: ${PATHs}`);
// 解析格式
const FORMAT = ($request.headers?.["Content-Type"] ?? $request.headers?.["content-type"])?.split(";")?.[0];
Console.info(`FORMAT: ${FORMAT}`);
(async () => {
	/**
	 * @type {{Settings: import('./interface').Settings}}
	 */
	const { Settings, Caches, Configs } = setENV("iRingo", "TV", database);
	// 解析参数
	const StoreFront = url.searchParams.get("sf");
	const Locale = ($request.headers?.["X-Apple-I-Locale"] ?? $request.headers?.["x-apple-i-locale"])?.split("_")?.[0] ?? "zh";
	Console.debug(`StoreFront = ${StoreFront}`, `Locale = ${Locale}`);
	// 创建空数据
	let body = {};
	// 设置默认类型
	let Type = "Other";
	// 方法判断
	switch ($request.method) {
		case "POST":
		case "PUT":
		case "PATCH":
		// biome-ignore lint/suspicious/noFallthroughSwitchClause: <explanation>
		case "DELETE":
			// 格式判断
			switch (FORMAT) {
				case undefined: // 视为无body
					break;
				case "application/x-www-form-urlencoded":
				case "text/plain":
				default:
					// 主机判断
					switch (url.hostname) {
						case "uts-api.itunes.apple.com":
							// 路径判断
							switch (url.pathname) {
								case "/uts/v3/favorite-people":
								case "/uts/v3/favorite-teams":
								case "/uts/v2/favorites":
								case "/uts/v2/favorites/add":
								case "/uts/v2/favorites/remove":
									Type = "Sports";
									if ($request.body) $request.body = $request.body.replace(/sf=[\d]{6}/, `sf=${Configs.Storefront[Settings.CountryCode[Type]]}`);
									break;
							}
							break;
						case "play.itunes.apple.com":
							// 路径判断
							switch (url.pathname) {
								case "/WebObjects/MZPlay.woa/wa/fpsRequest": // 仅存在于 play-edge.itunes.apple.com
									url.hostname = "play-edge.itunes.apple.com";
									url.pathname = "/WebObjects/MZPlayLocal.woa/wa/fpsRequest";
									break;
							}
							break;
						case "play-edge.itunes.apple.com":
							break;
					}
					break;
				case "application/x-mpegURL":
				case "application/x-mpegurl":
				case "application/vnd.apple.mpegurl":
				case "audio/mpegurl":
					//body = M3U8.parse($request.body);
					//Console.debug(`body: ${JSON.stringify(body)}`);
					//$request.body = M3U8.stringify(body);
					break;
				case "text/xml":
				case "text/html":
				case "text/plist":
				case "application/xml":
				case "application/plist":
				case "application/x-plist":
					//body = XML.parse($request.body);
					//Console.debug(`body: ${JSON.stringify(body)}`);
					//$request.body = XML.stringify(body);
					break;
				case "text/vtt":
				case "application/vtt":
					//body = VTT.parse($request.body);
					//Console.debug(`body: ${JSON.stringify(body)}`);
					//$request.body = VTT.stringify(body);
					break;
				case "text/json":
				case "application/json":
					body = JSON.parse($request.body ?? "{}");
					// 主机判断
					switch (url.hostname) {
						case "uts-api.itunes.apple.com":
							// 路径判断
							switch (url.pathname) {
								case "/uts/v3/user/settings":
									Type = "Settings";
									Console.debug(JSON.stringify(body));
									break;
							}
							break;
						case "umc-tempo-api.apple.com":
							// 路径判断
							switch (url.pathname) {
								case "/v3/channels/scoreboard":
								case "/v3/channels/scoreboard/":
									Type = "Sports";
									Console.debug(JSON.stringify(body));
									break;
							}
							break;
					}
					$request.body = JSON.stringify(body);
					break;
				case "application/protobuf":
				case "application/x-protobuf":
				case "application/vnd.google.protobuf":
				case "application/grpc":
				case "application/grpc+proto":
				case "applecation/octet-stream":
					break;
			}
		//break; // 不中断，继续处理URL
		case "GET":
		case "HEAD":
		case "OPTIONS":
		case undefined: // QX牛逼，script-echo-response不返回method
		default:
			// 主机判断
			switch (url.hostname) {
				case "uts-api.itunes.apple.com": {
					const Version = Number.parseInt(url.searchParams.get("v"), 10),
						Platform = url.searchParams.get("pfm"),
						Caller = url.searchParams.get("caller");
					Console.debug(`Version = ${Version}`, `Platform = ${Platform}`, `Caller = ${Caller}`);
					// 路径判断
					switch (url.pathname) {
						case "/uts/v3/configurations": {
							Type = "Configs";
							const Region = url.searchParams.get("region"),
								Country = url.searchParams.get("country"),
								StoreFrontH = url.searchParams.get("sfh");
							Console.debug(`Region = ${Region}`, `Country = ${Country}`, `StoreFrontH = ${StoreFrontH}`);
							if (Settings.CountryCode[Type] !== "AUTO") {
								if (Region) url.searchParams.set("region", Settings.CountryCode[Type] ?? Region);
								if (Country) url.searchParams.set("country", Settings.CountryCode[Type] ?? Country);
								if (StoreFrontH) url.searchParams.set("sfh", StoreFrontH.replace(/\d{6}/, Configs.Storefront[Settings.CountryCode[Type]]));
							}
							break;
						}
						case "/uts/v3/user/settings":
							Type = "Settings";
							break;
						case "/uts/v3/canvases/Roots/watchNow":
						case "/uts/v3/canvases/roots/tahoma_watchnow":
						case "/uts/v3/shelves/uts.col.UpNext":
							Type = "WatchNow";
							if (Settings.ThirdParty) url.searchParams.set("pfm", Platform === "desktop" ? "appletv" : Platform);
							break;
						case "/uts/v3/canvases/Channels/tvs.sbd.4000":
						case "/uts/v3/shelves/uts.col.ChannelUpNext.tvs.sbd.4000":
						case "/uts/v2/brands/appleTvPlus":
							Type = "Originals";
							break;
						case "/uts/v3/canvases/Channels/tvs.sbd.7000":
						case "/uts/v3/shelves/uts.col.ChannelUpNext.tvs.sbd.7000":
						case "/uts/v3/shelves/edt.col.63bf2052-50b9-44c8-a67e-30e196e19c60":
							Type = "Originals";
							break;
						case "/uts/v3/channels":
						case "/uts/v2/brands":
							Type = "Channels";
							break;
						case "/uts/v3/canvases/Roots/sports":
						case "/uts/v3/shelves/uts.col.PersonalizedLiveSports":
						case "/uts/v3/clock-scores":
						case "/uts/v3/leagues":
						case "/uts/v2/sports/clockscore":
						case "/uts/v2/sports/competitors":
						case "/uts/v2/sports/league":
						case "/uts/v2/sports/leagues":
						case "/uts/v2/sports/statsIdLookup":
						case "/uts/v2/sports/teamsNearMe":
						case "/uts/v3/canvases/Rooms/edt.item.633e0768-2135-43ac-a878-28965b853ec5": // FIFA World Cup 2022
						case "/uts/v3/canvases/Rooms/edt.item.635968ac-89d7-4619-8f5d-8c7890aef813": // NFL THANKSGIVING 2022
						case "/uts/v3/canvases/Rooms/edt.item.62327df1-6874-470e-98b2-a5bbeac509a2": // Friday Night Baseball - MLB - Apple TV+
							Type = "Sports";
							//if (Settings["ThirdParty"])
							url.searchParams.set("pfm", Platform === "desktop" ? "ipad" : Platform);
							break;
						case "/uts/v3/canvases/Roots/kids":
							Type = "Kids";
							break;
						case "/uts/v3/canvases/Roots/store":
						case "/uts/v3/canvases/Roots/tahoma_store":
							Type = "Store";
							break;
						case "/uts/v3/canvases/Roots/movies":
							Type = "Movies";
							if (Settings.ThirdParty) url.searchParams.set("pfm", Platform === "desktop" ? "ipad" : Platform);
							break;
						case "/uts/v3/canvases/Roots/tv":
							Type = "TV";
							if (Settings.ThirdParty) url.searchParams.set("pfm", Platform === "desktop" ? "ipad" : Platform);
							break;
						case "/uts/v3/favorite-people":
						case "/uts/v3/favorite-teams":
						case "/uts/v2/favorites":
						case "/uts/v2/favorites/add":
						case "/uts/v2/favorites/remove":
							Type = "Sports";
							break;
						case "/uts/v3/canvases/Roots/tahoma_searchlanding":
						case "/uts/v3/search":
						case "/uts/v3/search/landing":
						case "/uts/v2/search/incremental":
						case "/uts/v2/search/landing":
							Type = "Search";
							break;
						case "/uts/v3/watchlist":
						case "/uts/v2/watchlist/contains":
						case "/uts/v2/watchlist/search":
							if (Settings.ThirdParty) url.searchParams.set("pfm", Platform === "desktop" ? "ipad" : Platform);
							break;
						default:
							//if (Settings["ThirdParty"]) url.searchParams.set("pfm", (Platform === "desktop") ? "ipad" : Platform);
							if (url.searchParams.get("ctx_brand") === "tvs.sbd.4000") Type = "Originals";
							else if (url.pathname.includes("/uts/v3/canvases/Channels/")) Type = "Channels";
							else if (url.pathname.includes("/uts/v2/brands/")) Type = "Channels";
							else if (url.pathname.includes("/uts/v3/movies/")) Type = "Movies";
							else if (url.pathname.includes("/uts/v3/shows/")) Type = "TV";
							else if (url.pathname.includes("/uts/v3/sporting-events/")) {
								Type = "Sports";
								//if (Settings["ThirdParty"])
								url.searchParams.set("pfm", Platform === "desktop" ? "ipad" : Platform);
							} else if (url.pathname.includes("/uts/v3/canvases/Sports/")) {
								Type = "Sports";
								//if (Settings["ThirdParty"])
								url.searchParams.set("pfm", Platform === "desktop" ? "ipad" : Platform);
							} else if (url.pathname.includes("/uts/v3/canvases/Persons/")) Type = "Persons";
							else if (url.pathname.includes("/uts/v3/canvases/Rooms/")) Type = "Others";
							//else if (url.pathname.includes("/uts/v3/playables/")) Type = "Others";
							//else if (url.pathname.includes("/uts/v3/shelves/")) Type = "Others";
							else Type = "Others";
							break;
					}
					break;
				}
				case "umc-tempo-api.apple.com":
					switch (url.pathname) {
						case "/v3/register":
						case "/v3/channels/scoreboard":
						case "/v3/channels/scoreboard/":
							Type = "Sports";
							break;
						default:
							if (url.pathname.includes("/v3/register/")) Type = "Sports";
							break;
					}
					break;
				case "play.itunes.apple.com":
					// 路径判断
					switch (url.pathname) {
						case "/WebObjects/MZPlay.woa/hls/subscription/playlist.m3u8": // 仅存在于 play-edge.itunes.apple.com
							url.hostname = "play-edge.itunes.apple.com";
							url.pathname = "/WebObjects/MZPlayLocal.woa/hls/subscription/playlist.m3u8";
							break;
					}
					break;
				case "play-edge.itunes.apple.com":
					// 路径判断
					switch (url.pathname) {
						case "/WebObjects/MZPlayLocal.woa/hls/playlist.m3u8": // 仅存在于 play.itunes.apple.com
							url.hostname = "play.itunes.apple.com";
							url.pathname = "/WebObjects/MZPlay.woa/hls/playlist.m3u8";
							break;
					}
					break;
			}
			Console.info(`Type = ${Type}, CC = ${Settings.CountryCode[Type]}`);
			break;
		case "CONNECT":
		case "TRACE":
			break;
	}
	if ($request.headers?.["X-Apple-Store-Front"]) $request.headers["X-Apple-Store-Front"] = Configs.Storefront[Settings.CountryCode[Type]] ? $request.headers["X-Apple-Store-Front"].replace(/\d{6}/, Configs.Storefront[Settings.CountryCode[Type]]) : $request.headers["X-Apple-Store-Front"];
	if ($request.headers?.["x-apple-store-front"]) $request.headers["x-apple-store-front"] = Configs.Storefront[Settings.CountryCode[Type]] ? $request.headers["x-apple-store-front"].replace(/\d{6}/, Configs.Storefront[Settings.CountryCode[Type]]) : $request.headers["x-apple-store-front"];
	if (StoreFront) url.searchParams.set("sf", Configs.Storefront[Settings.CountryCode[Type]] ?? StoreFront);
	if (Locale) url.searchParams.set("locale", Configs.Locale.get(Settings.CountryCode[Type]) ?? Locale);
	Console.debug(`StoreFront = ${url.searchParams.get("sf")}`, `Locale = ${url.searchParams.get("locale")}`);
	$request.url = url.toString();
	Console.debug(`$request.url: ${$request.url}`);
})()
	.catch(e => Console.error(e))
	.finally(() => {
		switch (typeof $response) {
			case "object": // 有构造回复数据，返回构造的回复数据
				//Console.debug("finally", `echo $response: ${JSON.stringify($response, null, 2)}`);
				if ($response.headers?.["Content-Encoding"]) $response.headers["Content-Encoding"] = "identity";
				if ($response.headers?.["content-encoding"]) $response.headers["content-encoding"] = "identity";
				switch ($app) {
					default:
						done({ response: $response });
						break;
					case "Quantumult X":
						if (!$response.status) $response.status = "HTTP/1.1 200 OK";
						delete $response.headers?.["Content-Length"];
						delete $response.headers?.["content-length"];
						delete $response.headers?.["Transfer-Encoding"];
						done($response);
						break;
				}
				break;
			case "undefined": // 无构造回复数据，发送修改的请求数据
				//Console.debug("finally", `$request: ${JSON.stringify($request, null, 2)}`);
				done($request);
				break;
			default:
				Console.error(`不合法的 $response 类型: ${typeof $response}`);
				break;
		}
	});
