import { Lodash as _, Console, fetch } from "@nsnanocat/util";

/**
 * Apple TV 频道注入器，按各方法入参原地修改 UTS 正文。
 * @author VirgilClyne
 * @version 1.0.0
 */
export default class InjectChannel {
	/** 初始化名称、版本及构造日志；请求参数由各注入方法接收。 */
	constructor() {
		this.Name = "InjectChannel";
		this.Version = "1.0.0";
		Console.log(`🟧 ${this.Name} v${this.Version}`);
	}

	/**
	 * 服务身份、端点和素材；Brand 协议字段由组装器派生。
	 * @type {Object[]}
	 */
	#Config = [
		{
			id: "tvs.sbd.lumen",
			name: "Lumen",
			url: "https://tv.apple.com/us/channel/lumen/{id}",
			searchURL: "https://www.lumen.ax/api/appletv/v1/search",
			hexColor: "#080809",
			images: {
				icon: { width: 1280, height: 768, url: "https://www.lumen.ax/api/appletv/pub/brand/v1/icon/{w}x{h}.{f}" },
				tile: {
					width: 1000,
					height: 1500,
					joeColor: "b:rgb(8,8,9) p:rgb(255,255,255) s:rgb(220,220,220) t:rgb(210,210,210) q:rgb(190,190,190)",
					url: "https://www.lumen.ax/api/appletv/pub/tile/v1/{w}x{h}sr.{f}",
				},
				logo: { width: 1764, height: 335, url: "https://www.lumen.ax/api/appletv/pub/brand/v1/logo/{w}x{h}.{f}" },
			},
		},
	];

	/**
	 * 原地首插配置中的频道导航，缺少 ChannelsAndApps 分组或 subTabs 时创建。
	 * 导航 target 与 data.channels[id] 共用同一完整 Brand。
	 * @param {Object} body - 已解析的 UTS 配置正文。
	 * @param {Object} options - 本次调用的地区与平台。
	 * @param {string|null} options.platform - 请求 pfm；空值使用桌面宿主字段。
	 * @param {string} options.region - Response 已解析的小写地区码，例如 us、tw。
	 * @returns {Object} 原 body 引用。
	 */
	InjectUTSConfigurationChannelsAndApps(body, { platform, region }) {
		const channels = this.#BuildChannels(body, platform, region);
		_.set(body, "data.applicationProps.tabs", body.data?.applicationProps?.tabs ?? []);
		const tabs = body.data.applicationProps.tabs;
		const tab = tabs.find(({ type }) => type === "ChannelsAndApps") ?? this.#BuildChannelsAndAppsTab();
		const subTabs = channels.map(channel => this.#BuildChannelSubTab(channel));
		_.set(tab, "subTabs", [...subTabs, ...(tab.subTabs ?? []).filter(({ target }) => !channels.some(({ id }) => id === target?.id))]);
		switch (tabs.indexOf(tab)) {
			case -1: {
				const index = tabs.findIndex(({ type }) => type === "Library");
				tabs.splice(index < 0 ? tabs.length : index, 0, tab);
				break;
			}
		}
		for (const channel of channels) _.set(body, ["data", "channels", channel.id], channel);
		return body;
	}

	/**
	 * 原地首插已有 channelLockup、brandLockup 或 door 中 moretv section 的频道项。
	 * 没有目标行时保持正文原样，不创建首页行。
	 * @param {Object} body - 已解析的首页正文，频道行位于 data.canvas.shelves。
	 * @param {Object} options - 本次调用的地区与平台。
	 * @param {string|null} options.platform - 请求 pfm；空值使用桌面宿主字段。
	 * @param {string} options.region - Response 已解析的小写地区码。
	 * @returns {Object} 原 body 引用。
	 */
	InjectWatchNowLockup(body, { platform, region }) {
		const brands = this.#BuildChannels(body, platform, region);
		for (const shelf of body.data?.canvas?.shelves ?? []) {
			switch (shelf.displayType) {
				case "channelLockup":
				case "brandLockup":
					_.set(shelf, "items", [...brands, ...(shelf.items ?? []).filter(({ id }) => !brands.some(brand => brand.id === id))]);
					for (const brand of brands) _.set(body, ["data", "channels", brand.id], brand);
					break;
				case "doorLockupWithSections":
					for (const section of shelf.sections ?? []) {
						switch (section.id) {
							case "uts.shlfsect.moretv":
								_.set(section, "items", [...brands, ...(section.items ?? []).filter(({ id }) => !brands.some(brand => brand.id === id))]);
								for (const brand of brands) _.set(body, ["data", "channels", brand.id], brand);
								break;
						}
					}
					break;
			}
		}
		return body;
	}

	/**
	 * 原地向搜索落地页的 Browse 网格首插 Brand，缺少网格时创建。
	 * 两条 landing 路径共用此结构，不生成 Room 或搜索结果 BR 行。
	 * @param {Object} body - 已解析的搜索落地页正文。
	 * @param {Object} options - 本次调用的地区与平台。
	 * @param {string|null} options.platform - 请求 pfm；空值使用桌面宿主字段。
	 * @param {string} options.region - Response 已解析的小写地区码。
	 * @returns {Object} 原 body 引用。
	 */
	InjectSearchLanding(body, { platform, region }) {
		const brands = this.#BuildChannels(body, platform, region);
		_.set(body, "data.canvas.shelves", body.data?.canvas?.shelves ?? []);
		const shelves = body.data.canvas.shelves;
		const shelf = shelves.find(({ displayType, isGrid }) => displayType === "brick" && isGrid) ?? this.#BuildSearchLandingShelf(brands[0]);
		_.set(shelf, "items", [...brands, ...(shelf.items ?? []).filter(({ id }) => !brands.some(brand => brand.id === id))]);
		switch (shelves.indexOf(shelf)) {
			case -1:
				shelves.unshift(shelf);
				break;
		}
		for (const brand of brands) _.set(body, ["data", "channels", brand.id], brand);
		return body;
	}

	/**
	 * 查询频道影视后端并原地写入搜索结果；频道名完整匹配时才加入频道入口。
	 * 主响应使用 data.canvas.shelves，官方 TR/BR 导航使用 data.shelf。
	 * @param {Object} body - 已解析的搜索主响应或 TR/BR 导航正文。
	 * @param {Object} options - 由 Response 为本次调用准备的搜索参数。
	 * @param {string|null} options.platform - 请求 pfm；空值使用桌面宿主字段。
	 * @param {string} options.region - Response 已解析的小写地区码。
	 * @param {string} options.pathname - 主搜索或官方 TR/BR 路径；其他路径保持原样。
	 * @param {string} options.searchTerm - 原始搜索词；频道名匹配忽略大小写及首尾空白。
	 * @param {boolean} options.topResultsOnly - 主搜索是否仅合并到 TR；TR 导航始终合并到 TR。
	 * @param {string} [options.lumenKey] - 本次 argument 提供的 X-Lumen-Key 值；缺省或空白时跳过全部 Lumen 搜索注入。
	 * @returns {Promise<Object>} 解析为原 body 引用；无鉴权或空词不查询，BR 导航不查询影视后端。
	 */
	async InjectSearch(body, { platform, region, pathname, searchTerm, topResultsOnly, lumenKey }) {
		const keyword = searchTerm.trim().toLowerCase();
		// 脚本内部请求不经过 Surge Header Rewrite，鉴权必须随本次查询显式传入。
		const headers = { "X-Lumen-Key": lumenKey?.trim() };
		const channels = this.#BuildChannels(body, platform, region).filter(() => keyword && headers["X-Lumen-Key"]);
		// 只有频道名称匹配搜索词时，才向官方 TR/BR 加入频道入口。
		const brands = channels.filter(({ name }) => name.toLowerCase() === keyword);
		const categories = this.#BuildSearchCategoryShelves(region, searchTerm);
		switch (pathname) {
			case "/uts/v3/search":
			case "/uts/v3/shelves/uts.col.search.TR": {
				const results = await this.#SearchChannels(channels, searchTerm, headers);
				switch (results.reduce((count, { items }) => count + items.length, brands.length)) {
					case 0:
						break;
					default: {
						switch (pathname) {
							case "/uts/v3/search": {
								_.set(body, "data.canvas.shelves", body.data?.canvas?.shelves ?? []);
								const items = topResultsOnly ? [...brands, ...results.flatMap(({ items }) => items)] : brands;
								for (const category of categories.filter(({ id }) => (topResultsOnly ? id === "uts.col.search.TR" : brands.length))) {
									const shelf = body.data.canvas.shelves.find(({ id }) => id === category.id) ?? { ...category };
									switch (body.data.canvas.shelves.indexOf(shelf)) {
										case -1: {
											const index = category.id === "uts.col.search.TR" ? 0 : body.data.canvas.shelves.findIndex(({ id }) => id === "uts.col.search.PN");
											body.data.canvas.shelves.splice(index < 0 ? body.data.canvas.shelves.length : index, 0, shelf);
											break;
										}
									}
									_.set(shelf, "items", [...items, ...(shelf.items ?? []).filter(({ id }) => !items.some(item => item.id === id))]);
								}
								// 完整主响应保留独立的频道内容行，直接修改原 shelves 数组。
								switch (topResultsOnly) {
									case false: {
										const injected = results.filter(({ items }) => items.length).map(({ channel, items }) => this.#BuildSearchResultShelf(channel, items));
										body.data.canvas.shelves.splice(0, body.data.canvas.shelves.length, ...injected, ...body.data.canvas.shelves.filter(({ id }) => !injected.some(shelf => shelf.id === id)));
										break;
									}
								}
								break;
							}
							case "/uts/v3/shelves/uts.col.search.TR": {
								_.set(body, "data.shelf", body.data?.shelf ?? { ...categories.find(({ id }) => id === "uts.col.search.TR") });
								const items = [...brands, ...results.flatMap(({ items }) => items)];
								_.set(body, "data.shelf.items", [...items, ...(body.data.shelf.items ?? []).filter(({ id }) => !items.some(item => item.id === id))]);
								break;
							}
						}
						// ID 含点号，字典使用数组路径。
						for (const channel of channels) _.set(body, ["data", "channels", channel.id], channel);
						break;
					}
				}
				break;
			}
			case "/uts/v3/shelves/uts.col.search.BR":
				switch (brands.length) {
					case 0:
						break;
					default:
						_.set(body, "data.shelf", body.data?.shelf ?? { ...categories.find(({ id }) => id === "uts.col.search.BR") });
						_.set(body, "data.shelf.items", [...brands, ...(body.data.shelf.items ?? []).filter(({ id }) => !brands.some(brand => brand.id === id))]);
						for (const brand of brands) _.set(body, ["data", "channels", brand.id], brand);
						break;
				}
				break;
		}
		return body;
	}

	/**
	 * 并发查询各频道影视后端；错误记录后保留该频道的空 items。
	 * @private
	 * @param {Object[]} channels - 包含 searchURL 的完整 Brand 数组。
	 * @param {string} term - 传给后端 q 参数的原始搜索词。
	 * @param {Object} headers - 本次查询显式携带的鉴权头，不写入 Brand 或响应正文。
	 * @returns {Promise<Array<{channel: Object, items: Object[]}>>} 按输入频道顺序排列的影视结果。
	 */
	async #SearchChannels(channels, term, headers) {
		return Promise.all(
			channels.map(async channel => {
				const result = { channel, items: [] };
				try {
					const url = new URL(channel.searchURL);
					url.searchParams.set("q", term);
					const response = await fetch({ url: url.toString(), headers, timeout: 5 });
					switch (response.ok) {
						case false:
							throw new Error(`${channel.name} search HTTP ${response.status}`);
					}
					const { items } = JSON.parse(response.body);
					switch (Array.isArray(items)) {
						case false:
							throw new TypeError(`${channel.name} search items must be an array`);
					}
					result.items = items;
				} catch (error) {
					Console.error(`${this.Name}.InjectSearch`, error);
				}
				return result;
			}),
		);
	}

	/**
	 * 组装 data.applicationProps.tabs[] 的频道和 App 分组模板。
	 * @private
	 * @returns {Object} subTabs 为空数组的 ChannelsAndApps 导航分组。
	 */
	#BuildChannelsAndAppsTab() {
		return {
			title: "频道和 App",
			type: "ChannelsAndApps",
			destinationType: "SubTabs",
			subTabsPlacementType: "ExpandedList",
			subTabs: [],
		};
	}

	/**
	 * 组装 ChannelsAndApps.subTabs[] 的频道导航包装。
	 * @private
	 * @param {Object} channel - 完整 Brand，直接复用为 target。
	 * @returns {Object} 含标题、target 和 universalLinks 的子导航。
	 */
	#BuildChannelSubTab(channel) {
		return {
			type: "Channel",
			destinationType: "Target",
			title: channel.title,
			target: channel,
			universalLinks: [channel.url],
		};
	}

	/**
	 * 组装 data.canvas.shelves[] 的搜索 Browse 网格模板。
	 * @private
	 * @param {Object} channel - 用于派生 Browse 集合 ID 的 Brand。
	 * @returns {Object} items 为空数组的 brick 网格。
	 */
	#BuildSearchLandingShelf(channel) {
		return {
			id: `edt.col.${channel.id.split(".").at(-1)}-browse`,
			displayType: "brick",
			isGrid: true,
			header: { title: "Browse", supportsSeeAllView: false },
			items: [],
		};
	}

	/**
	 * 组装 data.canvas.shelves[] 或 data.shelf 使用的官方 TR、BR 分类模板。
	 * @private
	 * @param {string} region - 用于分类导航 URL 的小写地区码。
	 * @param {string} term - 需要编码到分类导航 URL 的原始搜索词。
	 * @returns {Object[]} TR、BR 顺序的分类模板，保留官方标题与 ID 契约。
	 */
	#BuildSearchCategoryShelves(region, term) {
		return [
			{ id: "uts.col.search.TR", title: "Top Results", displayType: "cardLockup", slug: "top-results" },
			{ id: "uts.col.search.BR", title: "Channels & Apps", displayType: "lockup", slug: "channels--apps" },
		].map(({ slug, ...category }) => ({
			...category,
			header: { title: category.title, supportsSeeAllView: true, url: `https://tv.apple.com/${region}/shelf/${slug}/${category.id}?searchTerm=${encodeURIComponent(term)}` },
			url: `https://tv.apple.com/${region}/collection/${slug}/${category.id}?searchTerm=${encodeURIComponent(term)}`,
			items: [],
		}));
	}

	/**
	 * 组装 data.canvas.shelves[] 的频道影视结果行，集合 ID 从 Brand ID 派生。
	 * @private
	 * @param {Object} channel - 提供 ID 和标题的完整 Brand。
	 * @param {Object[]} items - 后端影视卡片，直接复用此数组。
	 * @returns {Object} cardLockup 内容行。
	 */
	#BuildSearchResultShelf(channel, items) {
		return {
			id: `edt.shelf.${channel.id.split(".").at(-1)}-search`,
			title: channel.title,
			header: { title: channel.title },
			displayType: "cardLockup",
			items,
		};
	}

	/**
	 * 按配置顺序组装导航、首页、搜索和品牌字典共用的完整 Brand。
	 * 仅读取正文中的已有状态，不修改 body。
	 * @private
	 * @param {Object} body - 提供 data.channels[id] 中已有的订阅、安装和同意状态。
	 * @param {string|null} platform - 本次调用的请求 pfm。
	 * @param {string} region - 本次调用的小写地区码。
	 * @returns {Object[]} 配置顺序的完整 Brand 数组。
	 */
	#BuildChannels(body, platform, region) {
		return this.#Config.map(channel => this.#BuildChannel(channel, platform, region, body.data?.channels?.[channel.id]));
	}

	/**
	 * 从服务配置组装完整 Brand，宿主参考官方响应，分类采用 Lumen 自身接入定义。
	 * @private
	 * @param {Object} config - #Config 中的服务身份、端点和素材。
	 * @param {string|null} platform - 请求 pfm，仅决定宿主字段，不限制注入。
	 * @param {string} region - 用于频道 URL 的小写地区码。
	 * @param {Object} [state] - 已有品牌记录；保留其订阅、安装和同意状态。
	 * @returns {Object} 导航、卡片和 data.channels[id] 共用的完整 Brand。
	 * @see https://github.com/NSRingo/apple.TVKit/blob/main/docs/channels-apps-brand-taxonomy.md
	 */
	#BuildChannel(config, platform, region, state) {
		// 只匹配宿主字段，不按平台限制注入；官方 iPhone/ipad 与 desktop/appletv 返回不同宿主。
		const mobile = ["iphone", "ipad"].includes(platform?.toLowerCase());
		return {
			id: config.id,
			name: config.name,
			title: config.name,
			type: "Brand",
			flavor: "FullBleed",
			url: config.url.replace("{id}", config.id).replace("/us/", `/${region}/`),
			searchURL: config.searchURL,
			intents: ["NAVIGATE"],
			isPinned: false,
			appAdamIds: [mobile ? "1174078549" : "1171145244"],
			appBundleIds: [mobile ? "com.apple.tv" : "com.apple.TVWatchList"],
			appName: mobile ? "Apple TV" : "TV",
			hexColor: config.hexColor,
			// Lumen 不声明 Apple 内置收费订阅或第一方接入，这两个标志均保持 false。
			isApSubscription: false,
			isAppleMusicImmersiveBrand: false,
			isAppleTvPlus: false,
			// 已有响应状态优先；缺省沿用 Lumen 后端的显示状态，不代表真实订阅或播放授权。
			isConsented: state?.isConsented ?? true,
			isFirstParty: false,
			isInstalled: state?.isInstalled ?? true,
			isItunes: false,
			isMountainBrand: false,
			isStaging: false,
			isSubscribed: state?.isSubscribed ?? true,
			// true 对应 tvs.sbd.3000（TV app 聚合品牌），并非“在 TV 内播放”的开关。
			isTvAppBrand: false,
			// Lumen 后端尚未声明继续观看/进度上报能力，不能照搬官方 Channel 的开启值。
			isWatchlistEnabled: false,
			shouldTrackPlayActivity: false,
			images: {
				appIcon: { ...config.images.icon, supportsLayeredImage: false },
				shelfImage: { ...config.images.icon, supportsLayeredImage: false },
				shelfItemImage: { ...config.images.tile, isP3: false, supportsLayeredImage: false },
				logoGlyph: { ...config.images.logo, supportsLayeredImage: false },
				whiteLogo: { ...config.images.logo, supportsLayeredImage: false },
			},
		};
	}
}
