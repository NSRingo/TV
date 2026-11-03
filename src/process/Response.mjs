import { Console, Lodash as _ } from "@nsnanocat/util";
import InjectBrand from "../class/InjectBrand.mjs";
import database from "../function/database.mjs";
import setENV from "../function/setENV.mjs";
/***************** Processing *****************/
export async function Response($request, $response) {
	// 解构URL
	const url = new URL($request.url);
	Console.info(`url: ${url.toJSON()}`);
	// 获取连接参数
	const PATHs = url.pathname.split("/").filter(Boolean);
	Console.info(`PATHs: ${PATHs}`);
	// 解析格式
	const FORMAT = ($response.headers?.["Content-Type"] ?? $response.headers?.["content-type"])?.split(";")?.[0];
	Console.info(`FORMAT: ${FORMAT}`);
	const { Settings, Caches, Configs } = setENV("iRingo", "TV", database);
	Console.logLevel = Settings.LogLevel;
	// 创建空数据
	let body = {};
	// 格式判断
	switch (FORMAT) {
		case undefined: // 视为无body
			break;
		case "application/x-www-form-urlencoded":
		case "text/plain":
		default:
			break;
		case "application/x-mpegURL":
		case "application/x-mpegurl":
		case "application/vnd.apple.mpegurl":
		case "audio/mpegurl":
			break;
		case "text/xml":
		case "text/html":
		case "text/plist":
		case "application/xml":
		case "application/plist":
		case "application/x-plist":
			break;
		case "text/vtt":
		case "application/vtt":
			break;
		case "text/json":
		case "application/json":
			body = JSON.parse($response.body);
			// 主机判断
			switch (url.hostname) {
				case "uts-api.itunes.apple.com": {
					const Platform = url.searchParams.get("pfm");
					Console.info(`Platform = ${Platform}`);
					const StoreFront = url.searchParams.get("sf") ?? url.searchParams.get("sfh")?.split("-")[0];
					Console.info(`StoreFront = ${StoreFront}`);
					const Region =
						Object.entries(Configs.Storefront)
							.find(([, sf]) => sf === StoreFront)?.[0]
							.toLowerCase() ?? "us";
					/** @type {import('../class/InjectBrand.mjs').BrandContext} */
					const brandContext = { pfm: Platform, region: Region, settings: Settings };
					const injectBrand = new InjectBrand(brandContext);
					// 路径判断
					switch (url.pathname) {
						case "/uts/v3/configurations":
							if (body.data?.applicationProps?.tabs) injectBrand.InjectUTSConfigurationTabs(body.data.applicationProps.tabs, brandContext);
							body = injectBrand.InjectUTSConfigurationChannelsAndApps(body, brandContext);
							break;
						case "/uts/v3/search/landing":
						case "/uts/v3/canvases/Roots/tahoma_searchlanding":
							body = injectBrand.InjectSearchLanding(body, brandContext);
							break;
						case "/uts/v3/search":
						case "/uts/v3/shelves/uts.col.search.TR":
						case "/uts/v3/shelves/uts.col.search.BR":
							body = await injectBrand.InjectSearch(body, { ...brandContext, pathname: url.pathname, searchTerm: url.searchParams.get("searchTerm") ?? "", topResultsOnly: url.searchParams.get("topResultsOnly") === "true", lumenKey: Settings.LumenKey });
							break;
						case "/uts/v3/channels":
							_.set(body, "data.channels", body.data?.channels ?? {});
							injectBrand.InjectChannels(body.data.channels, brandContext);
							break;
						case "/uts/v3/user/settings":
							_.set(body, "data.brandSidebarSetting", body.data?.brandSidebarSetting ?? {});
							injectBrand.InjectUTSUserSettings(body.data.brandSidebarSetting);
							break;
						case "/uts/v3/canvases/Roots/watchNow": // 立即观看
						case "/uts/v3/canvases/Roots/tahoma_watchnow":
						// biome-ignore lint/suspicious/noFallthroughSwitchClause: 首页继续执行原播放地址处理
						case "/uts/v3/canvases/roots/tahoma_watchnow":
							body = injectBrand.InjectWatchNowLockup(body, brandContext);
							if (body.data?.canvas?.shelves) {
								const channels = body.data.channels ?? {};
								injectBrand.InjectBrick(body.data.canvas.shelves, channels, brandContext);
								if (!body.data.channels && Object.keys(channels).length) body.data.channels = channels;
							}
						case "/uts/v3/canvases/Channels/tvs.sbd.4000": // Apple TV+
						case "/uts/v3/canvases/Channels/tvs.sbd.241000": // Formula 1
						case "/uts/v3/canvases/Channels/tvs.sbd.7000": {
							// MLS Season Pass
							if (Settings?.isWorkaroundSSLPinning) {
								let shelves = body?.data?.canvas?.shelves;
								if (shelves) {
									shelves = shelves.map(shelf => {
										if (shelf?.items) {
											shelf.items = shelf.items.map(item => {
												let playable = item?.playable || item?.videos?.shelfVideoTall;
												const playables = item?.playables;
												if (playable) playable = setPlayable(playable, Settings?.HLSUrl, Settings?.FPSUrl);
												if (playables) Object.keys(playables).forEach(playable => (playables[playable] = setPlayable(playables[playable], Settings?.HLSUrl, Settings?.FPSUrl)));
												return item;
											});
										}
										return shelf;
									});
									body.data.canvas.shelves = shelves;
								}
							}
							break;
						}
						case "/uts/v3/shelves/uts.col.UpNext": // 待播清單
						case "/uts/v3/shelves/uts.col.ChannelUpNext.tvs.sbd.4000": // Apple TV+ 待播節目
						case "/uts/v3/shelves/uts.col.ChannelUpNext.tvs.sbd.241000": // Formula 1 待播節目
						case "/uts/v3/shelves/uts.col.ChannelUpNext.tvs.sbd.7000": // MLS Season Pass 待播節目
						case "/uts/v3/shelves/edt.col.62d7229e-d9a1-4f00-98e5-458c11ed3938": {
							// 精選推薦
							if (Settings?.isWorkaroundSSLPinning) {
								const shelf = body?.data?.shelf;
								if (shelf?.items) {
									shelf.items = shelf.items.map(item => {
										let playable = item?.playable || item?.videos?.shelfVideoTall;
										const playables = item?.playables;
										if (playable) playable = setPlayable(playable, Settings?.HLSUrl, Settings?.FPSUrl);
										if (playables) Object.keys(playables).forEach(playable => (playables[playable] = setPlayable(playables[playable], Settings?.HLSUrl, Settings?.FPSUrl)));
										return item;
									});
								}
							}
							break;
						}
						default:
							switch (PATHs[0]) {
								case "uts":
									switch (PATHs[1]) {
										case "v3":
											switch (PATHs[2]) {
												case "movies": // uts/v3/movies/
												case "shows": // uts/v3/shows/
												case "episodes": // uts/v3/episodes/
												case "sporting-events": {
													// uts/v3/sporting-events/
													if (Settings?.isWorkaroundSSLPinning) {
														let shelves = body?.data?.canvas?.shelves;
														let backgroundVideo = body?.data?.content?.backgroundVideo;
														const playables = body?.data?.playables;
														if (shelves) {
															shelves = shelves.map(shelf => {
																if (shelf?.items) {
																	shelf.items = shelf.items.map(item => {
																		let playable = item?.playable || item?.videos?.shelfVideoTall;
																		if (playable) playable = setPlayable(playable, Settings?.HLSUrl, Settings?.FPSUrl);
																		const playables = item?.playables;
																		if (playables) Object.keys(playables).forEach(playable => (playables[playable] = setPlayable(playables[playable], Settings?.HLSUrl, Settings?.FPSUrl)));
																		return item;
																	});
																}
																return shelf;
															});
															body.data.canvas.shelves = shelves;
														}
														if (backgroundVideo) backgroundVideo = setPlayable(backgroundVideo, Settings?.HLSUrl, Settings?.FPSUrl);
														if (playables) Object.keys(playables).forEach(playable => (playables[playable] = setPlayable(playables[playable], Settings?.HLSUrl, Settings?.FPSUrl)));
													}
													break;
												}
											}
											break;
									}
									break;
							}
							break;
					}
					break;
				}
				case "umc-tempo-api.apple.com":
					// 路径判断
					switch (url.pathname) {
						case "/v3/register":
						case "/v3/channels/scoreboard":
						case "/v3/channels/scoreboard/":
							Console.debug(JSON.stringify(body));
							break;
						default:
							break;
					}
					break;
			}
			$response.body = JSON.stringify(body);
			break;
		case "application/protobuf":
		case "application/x-protobuf":
		case "application/vnd.google.protobuf":
		case "application/grpc":
		case "application/grpc+proto":
		case "application/octet-stream":
			break;
	}
	return $response;

	/***************** Function *****************/
	function setPlayable(playable, HLSUrl, FPSUrl) {
		Console.log("☑️ Set Playable Content");
		let assets = playable?.assets;
		const itunesMediaApiData = playable?.itunesMediaApiData;
		if (assets) assets = setUrl(assets, HLSUrl, FPSUrl);
		if (itunesMediaApiData?.movieClips) itunesMediaApiData.movieClips = itunesMediaApiData.movieClips.map(movieClip => setUrl(movieClip, HLSUrl, FPSUrl));
		if (itunesMediaApiData?.offers) itunesMediaApiData.offers = itunesMediaApiData.offers.map(offer => setUrl(offer, HLSUrl, FPSUrl));
		if (itunesMediaApiData?.personalizedOffers) itunesMediaApiData.personalizedOffers = itunesMediaApiData.personalizedOffers.map(personalizedOffer => setUrl(personalizedOffer, HLSUrl, FPSUrl));
		Console.log("✅ Set Playable Content");
		return playable;

		function setUrl(asset) {
			Console.log("☑️ Set Url");
			if (asset?.hlsUrl) {
				const hlsUrl = new URL(asset.hlsUrl);
				switch (hlsUrl.hostname) {
					case "play.itunes.apple.com":
						hlsUrl.hostname = "play-cdn.itunes.apple.com";
						break;
					case "play-edge.itunes.apple.com":
						hlsUrl.hostname = "play-edge-cdn.itunes.apple.com";
						break;
				}
				asset.hlsUrl = hlsUrl.toString();
			}
			Console.log("✅ Set Url");
			return asset;
		}
	}
}
