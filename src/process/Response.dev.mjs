import { Console, fetch, Lodash as _ } from "@nsnanocat/util";
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
	/**
	 * @type {{Settings: import('../types').Settings}}
	 */
	const { Settings, Caches, Configs } = setENV("iRingo", "TV", database);
	Console.logLevel = Settings.LogLevel;
	if (!Settings.Tabs.includes("tvs.sbd.lumen")) Settings.Tabs.push("tvs.sbd.lumen");
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
			//body = M3U8.parse($response.body);
			//Console.debug(`body: ${JSON.stringify(body)}`);
			//$response.body = M3U8.stringify(body);
			break;
		case "text/xml":
		case "text/html":
		case "text/plist":
		case "application/xml":
		case "application/plist":
		case "application/x-plist":
			//body = XML.parse($response.body);
			//Console.debug(`body: ${JSON.stringify(body)}`);
			//$response.body = XML.stringify(body);
			break;
		case "text/vtt":
		case "application/vtt":
			//body = VTT.parse($response.body);
			//Console.debug(`body: ${JSON.stringify(body)}`);
			//$response.body = VTT.stringify(body);
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
					Console.info(`Version = ${Version}`, `Platform = ${Platform}`, `Caller = ${Caller}`);
					const StoreFront = url.searchParams.get("sf") ?? url.searchParams.get("sfh")?.split("-")[0];
					const Locale = ($request.headers?.["X-Apple-I-Locale"] ?? $request.headers?.["x-apple-i-locale"])?.split("_")?.[0] ?? "zh";
					Console.info(`StoreFront = ${StoreFront}`, `Locale = ${Locale}`);
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
							for (const tab of body.data?.applicationProps?.tabs ?? []) if (!tab.target) tab.id ??= Configs.Tab[tab.type];
							if (Caller !== "wta") {
								// caller=wta跳过原导航整理，仍注入配置频道
								if (body.data?.applicationProps?.tabs) {
									if (Platform === "iphone") Settings.Tabs = Settings.Tabs.filter(id => id !== "tvs.sbd.241000" && id !== "tvs.sbd.7000");
									injectBrand.InjectUTSConfigurationTabs(body.data.applicationProps.tabs);
									const tabs = body.data.applicationProps.tabs;
									const newTabs = [];
									for (const id of Settings.Tabs) {
										const index = tabs.findIndex(tab => (tab.target?.id ?? tab.id) === id);
										if (index !== -1) {
											if (index === 0) newTabs.unshift(tabs[index]);
											else newTabs.push(tabs[index]);
											continue;
										}
										const tab = Configs.Tabs.find(tab => (tab.target?.id ?? tab.id) === id);
										if (!tab) continue;
										if (tab.subTabs) for (const subTab of tab.subTabs) subTab.title = Configs.i18n?.[subTab.type]?.get(Locale) ?? tab.title;
										tab.title = Configs.i18n?.[tab.type]?.get(Locale) ?? tab.title;
										switch (id) {
											case "tahoma_store":
												if (Version < 54) continue;
												break;
											case "tahoma_movies":
											case "tahoma_tvshows":
												if (Version >= 54) continue;
												if (Platform === "iphone") tab.secondaryEnabled = true;
												break;
											case "tahoma_sports":
											case "tahoma_kids":
												if (Platform === "iphone") {
													if (Version >= 54) continue;
													tab.secondaryEnabled = true;
												}
												break;
											case "ChannelsAndApps":
												if (Version < 74 || !["atv", "ipad", "appletv"].includes(Platform)) continue;
												break;
										}
										newTabs.push(tab);
									}
									body.data.applicationProps.tabs = newTabs;
									//body.data.applicationProps.tabs = createTabsGroup("Tabs", caller, platform, locale, region);
									//body.data.applicationProps.tvAppEnabledInStorefront = true;
									//body.data.applicationProps.enabledClientFeatures = (Version > 53) ? [{ "domain": "tvapp", "name": "snwpcr" }, { "domain": "tvapp", "name": "store_tab" }]
									//	: [{ "domain": "tvapp", "name": "expanse" }, { "domain": "tvapp", "name": "syndication" }, { "domain": "tvapp", "name": "snwpcr" }];
									//body.data.applicationProps.storefront.localesSupported = ["zh_Hans", "zh_Hant", "yue-Hant", "en_US", "en_GB"];
									//body.data.applicationProps.storefront.storefrontId = 143470;
									//body.data.applicationProps.featureEnablers["topShelf"] = true;
									//body.data.applicationProps.featureEnablers["sports"] = true;
									//body.data.applicationProps.featureEnablers["sportsFavorites"] = true;
									//body.data.applicationProps.featureEnablers["unw"] = true;
									//body.data.applicationProps.featureEnablers["imageBasedSubtitles"] = false;
									//body.data.applicationProps.featureEnablers["ageVerification"] = false;
									//body.data.applicationProps.featureEnablers["seasonTitles"] = false;
									//body.data.userProps.activeUser = true;
									//body.data.userProps.utsc = "1:18943";
									//body.data.userProps.country = country;
									//body.data.userProps.gac = true;
								}
							}
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
							//if (url.pathname.includes("/uts/v3/canvases/Channels/")) $response.body = await getData("View", Settings, Configs);
							//else if (url.pathname.includes("/uts/v2/brands/")) $response.body = await getData("View", Settings, Configs);
							//else if (url.pathname.includes("/uts/v3/movies/")) $response.body = await getData("View", Settings, Configs);
							//else if (url.pathname.includes("/uts/v3/shows/")) $response.body = await getData("View", Settings, Configs);
							//else if (url.pathname.includes("/uts/v3/shelves/")) $response.body = await getData("View", Settings, Configs);
							//else if (url.pathname.includes("/uts/v3/playables/")) $response.body = await getData("View", Settings, Configs);
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
							//body.channels.storeFront = "UNITED_STATES";
							//body.channels.storeFront = "TAIWAN";
							break;
						default:
							//if (url.pathname.includes("v3/register/")) Type = "Sports";
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
		/*
		function setUrl(asset, HLSUrl, FPSUrl) {
			Console.log("☑️ Set Url");
			if (asset?.hlsUrl) {
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
		*/
	}

	async function getData(type, settings, database) {
		Console.log("☑️ Get View Data");
		const CCs = [settings.CountryCode[type], "US", "GB"].flat(Number.POSITIVE_INFINITY);
		Console.debug(`CCs=${CCs}`);
		//查询是否有符合语言的字幕
		let data = [];
		for await (const CC of CCs) {
			const request = {
				url: $request.url,
				headers: $request.headers,
			};
			request.url = new URL(request.url);
			request.url.searchParams.set("sf", database.Storefront[CC]);
			Console.debug(`sf=${request.url.searchParams.get("sf")}`);
			Console.debug(`locale=${request.url.searchParams.get("locale")}`);
			request.url = request.url.toString();
			Console.debug(`request.url=${request.url}`);
			request.headers["X-Surge-Skip-Scripting"] = "true";
			data = await fetch(request).then(data => data);
			Console.debug(`data=${JSON.stringify(data)}`);
			if (data.statusCode === 200 || data.status === 200) break;
		}
		Console.debug(`datas: ${JSON.stringify(data.body)}`);
		Console.log("✅ Get EXT-X-MEDIA Data");
		return data.body;
	}
}
