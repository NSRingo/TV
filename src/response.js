import { Console, done, Lodash as _ } from "@nsnanocat/util";
import { URL } from "@nsnanocat/url";
import database from "./function/database.mjs";
import setENV from "./function/setENV.mjs";
/***************** Processing *****************/
// 解构URL
const url = new URL($request.url);
Console.info(`url: ${url.toJSON()}`);
// 获取连接参数
const PATHs = url.pathname.split("/").filter(Boolean);
Console.info(`PATHs: ${PATHs}`);
// 解析格式
const FORMAT = ($response.headers?.["Content-Type"] ?? $response.headers?.["content-type"])?.split(";")?.[0];
Console.info(`FORMAT: ${FORMAT}`);
(async () => {
	/**
	 * @type {{Settings: import('./types').Settings}}
	 */
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
					const Version = Number.parseInt(url.searchParams.get("v"), 10),
						Platform = url.searchParams.get("pfm"),
						Caller = url.searchParams.get("caller");
					const StoreFront = url.searchParams.get("sf");
					const Locale = ($request.headers?.["X-Apple-I-Locale"] ?? $request.headers?.["x-apple-i-locale"])?.split("_")?.[0] ?? "zh";
					// 路径判断
					switch (url.pathname) {
						case "/uts/v3/configurations":
							if (Caller !== "wta") {
								// 不修改caller=wta的configurations数据
								if (body?.data?.applicationProps) {
									const newTabs = [];
									Settings.Tabs.forEach(type => {
										if (body.data.applicationProps.tabs.some(Tab => Tab?.type === type)) {
											const tab = body.data.applicationProps.tabs.find(Tab => Tab?.type === type);
											const index = body.data.applicationProps.tabs.findIndex(Tab => Tab?.type === type);
											if (index === 0) newTabs.unshift(tab);
											else newTabs.push(tab);
										} else if (Configs.Tabs.some(Tab => Tab?.type === type)) {
											const tab = Configs.Tabs.find(Tab => Tab?.type === type);
											switch (tab?.destinationType) {
												// biome-ignore lint/suspicious/noFallthroughSwitchClause: <explanation>
												case "SubTabs":
													tab.subTabs = tab.subTabs.map(subTab => {
														subTab.title = Configs.i18n?.[subTab.type]?.get(Locale) ?? tab.title;
														return subTab;
													});
												case "Target":
												case "Client":
													tab.title = Configs.i18n?.[tab.type]?.get(Locale) ?? tab.title;
													break;
											}
											switch (tab?.type) {
												case "WatchNow":
												case "Originals":
													newTabs.push(tab);
													break;
												case "Store":
													if (Version >= 54) {
														if (Version >= 74) {
															tab.destinationType = "Target";
															tab.target = { id: "tahoma_store", type: "Root", url: "https://tv.apple.com/store" };
															tab.universalLinks = ["https://tv.apple.com/store", "https://tv.apple.com/movies", "https://tv.apple.com/tv-shows"];
															delete tab?.subTabs;
														}
														newTabs.push(tab);
													}
													break;
												case "Movies":
												case "TV":
													if (Version < 54) tab.secondaryEnabled = true;
													if (Version < 54) newTabs.push(tab);
													break;
												case "MLS":
													if (Version >= 64) {
														switch (Platform) {
															case "atv":
															case "ipad":
															case "appletv":
															case "desktop":
															// biome-ignore lint/suspicious/noFallthroughSwitchClause: <explanation>
															default:
																newTabs.push(tab);
															case "iphone":
																return;
														}
													}
													break;
												case "Sports":
												case "Kids":
													if (Version < 54) tab.secondaryEnabled = true;
													if (Version < 54) newTabs.push(tab);
													else {
														switch (Platform) {
															case "atv":
															case "ipad":
															case "appletv":
															case "desktop":
															default:
																newTabs.push(tab);
																break;
															case "iphone":
																break;
														}
													}
													break;
												case "Search":
													if (Version >= 74) tab.target.id = "tahoma_searchlanding";
													newTabs.push(tab);
													break;
												case "ChannelsAndApps":
													if (Version >= 74) {
														switch (Platform) {
															case "atv":
															case "ipad":
															case "appletv":
																newTabs.push(tab);
																break;
															case "desktop":
															case "iphone":
															default:
																break;
														}
													}
													break;
												case "Library":
												default:
													newTabs.push(tab);
													break;
											}
										}
									});
									body.data.applicationProps.tabs = newTabs;
								}
							}
							break;
						case "/uts/v3/user/settings":
							break;
						case "/uts/v3/canvases/Roots/watchNow": // 立即观看
						case "/uts/v3/canvases/Channels/tvs.sbd.4000": // Apple TV+
						case "/uts/v3/canvases/Channels/tvs.sbd.7000": {
							// MLS Season Pass
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
							break;
						}
						case "/uts/v3/shelves/uts.col.UpNext": // 待播清單
						case "/uts/v3/shelves/uts.col.ChannelUpNext.tvs.sbd.4000": // Apple TV+ 待播節目
						case "/uts/v3/shelves/uts.col.ChannelUpNext.tvs.sbd.7000": // MLS Season Pass 待播節目
						case "/uts/v3/shelves/edt.col.62d7229e-d9a1-4f00-98e5-458c11ed3938": {
							// 精選推薦
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
})()
	.catch(e => Console.error(e))
	.finally(() => done($response));

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

	function setUrl(asset, HLSUrl, FPSUrl) {
		Console.log("☑️ Set Url");
		if (asset?.hlsUrl) {
			const hlsUrl = new URL(asset.hlsUrl);
			switch (hlsUrl.pathname) {
				case "/WebObjects/MZPlay.woa/hls/playlist.m3u8":
					hlsUrl.hostname = HLSUrl || "play.itunes.apple.com";
					switch (hlsUrl.hostname) {
						case "play.itunes.apple.com":
							hlsUrl.pathname = "/WebObjects/MZPlay.woa/hls/playlist.m3u8";
							break;
						case "play-edge.itunes.apple.com":
							hlsUrl.pathname = "/WebObjects/MZPlayLocal.woa/hls/playlist.m3u8";
							break;
					}
					break;
				case "/WebObjects/MZPlayLocal.woa/hls/subscription/playlist.m3u8":
					hlsUrl.hostname = HLSUrl || "play-edge.itunes.apple.com";
					switch (hlsUrl.hostname) {
						case "play.itunes.apple.com":
							hlsUrl.pathname = "/WebObjects/MZPlay.woa/hls/subscription/playlist.m3u8";
							break;
						case "play-edge.itunes.apple.com":
							hlsUrl.pathname = "/WebObjects/MZPlayLocal.woa/hls/subscription/playlist.m3u8";
							break;
					}
					break;
				case "/WebObjects/MZPlay.woa/hls/workout/playlist.m3u8":
					hlsUrl.hostname = HLSUrl || "play.itunes.apple.com";
					switch (hlsUrl.hostname) {
						case "play.itunes.apple.com":
							hlsUrl.pathname = "/WebObjects/MZPlay.woa/hls/workout/playlist.m3u8";
							break;
						case "play-edge.itunes.apple.com":
							hlsUrl.pathname = "/WebObjects/MZPlayLocal.woa/hls/workout/playlist.m3u8";
							break;
					}
					break;
			}
			asset.hlsUrl = hlsUrl.toString();
		}
		if (asset?.fpsKeyServerUrl) {
			const fpsKeyServerUrl = new URL(asset.fpsKeyServerUrl);
			fpsKeyServerUrl.hostname = FPSUrl || "play-edge.itunes.apple.com";
			switch (fpsKeyServerUrl.hostname) {
				case "play.itunes.apple.com":
					fpsKeyServerUrl.pathname = "/WebObjects/MZPlay.woa/wa/fpsRequest";
					break;
				case "play-edge.itunes.apple.com":
					fpsKeyServerUrl.pathname = "/WebObjects/MZPlayLocal.woa/wa/fpsRequest";
					break;
			}
			asset.fpsKeyServerUrl = fpsKeyServerUrl.toString();
		}
		if (asset?.fpsNonceServerUrl) {
			const fpsNonceServerUrl = new URL(asset.fpsNonceServerUrl);
			fpsNonceServerUrl.hostname = FPSUrl || "play.itunes.apple.com";
			switch (fpsNonceServerUrl.hostname) {
				case "play.itunes.apple.com":
					fpsNonceServerUrl.pathname = "/WebObjects/MZPlay.woa/wa/checkInNonceRequest";
					break;
				case "play-edge.itunes.apple.com":
					fpsNonceServerUrl.pathname = "/WebObjects/MZPlayLocal.woa/wa/checkInNonceRequest";
					break;
			}
			asset.fpsNonceServerUrl = fpsNonceServerUrl.toString();
		}
		Console.log("✅ Set Url");
		return asset;
	}
}
