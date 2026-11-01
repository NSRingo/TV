import { Lodash as _, Console, fetch } from "@nsnanocat/util";

/**
 * @typedef {Object} BrandContext
 * @property {string|null} [platform] - pfm 仅用于宿主字段，不限制注入；省略时使用桌面宿主。
 * @property {string} region - 本次响应的小写地区码。
 * @property {import('../types').Settings} [settings] - 选择苹果频道时传入本次请求设置。
 * @property {Array<'apple'|'thirdParty'>} [kinds] - 缺省保持原有第三方调用行为。
 */

/**
 * @typedef {Object} BrandConfig
 * @property {'apple'|'thirdParty'} kind - 内部接入分类，不写入响应。
 * @property {string} id - Brand 完整 ID。
 * @property {string} name - 品牌名称。
 * @property {string} url - 频道 URL；第三方模板中的 {id} 由 Brand ID 替换。
 * @property {Array<'channelLockup'|'brandLockup'|'uts.col.tv-plus-sports-nav-brick'|'uts.shlfsect.moretv'|'tahoma_searchlanding'>} placements - 官方 displayType 或完整 shelf、section、页面根 ID。
 * @property {Object} tab - 官方导航模板；Target 为苹果根 tab，SubTabs 为第三方所属分组。
 * @property {string} tab.title - 导航标题。
 * @property {'Originals'|'Grevy'|'MLS'|'ChannelsAndApps'} tab.type - 官方导航类型，直接用于选取与归组。
 * @property {'Target'|'SubTabs'} tab.destinationType - 官方导航目标类型。
 * @property {string[]} [tab.universalLinks] - 苹果根 tab 的通用链接。
 * @property {Object} [tab.target] - 苹果根 tab 的 Brand 目标。
 * @property {string} [tab.hexColor] - 官方导航背景色。
 * @property {Record<string, Object>} [tab.images] - 官方侧栏图像。
 * @property {string} [tab.subTabsPlacementType] - 第三方分组的子项展示方式。
 * @property {Object[]} [tab.subTabs] - 第三方分组的初始子项模板。
 * @property {Record<string, Object>} images - 以 appIcon、shelfItemImage 等官方字段为键的品牌图片。
 * @property {Record<'tahoma_watchnow'|'tahoma_searchlanding', Object>} [cards] - 苹果频道按官方页面根 ID 区分的卡片图片。
 * @property {Record<string, boolean>} [metadata] - 苹果品牌的公开能力标志，不含账户状态。
 * @property {'Originals'} [countryCodeKey] - MLS 兼容旧地区设置；其余苹果频道直接使用 tab.type。
 * @property {string} [searchURL] - 第三方影视搜索端点。
 * @property {string} [website] - 第三方官网外链。
 * @property {string} [hexColor] - 第三方品牌背景色。
 */

/**
 * @typedef {Record<'all'|'ChannelsAndApps'|'channelLockup'|'brandLockup'|'uts.col.tv-plus-sports-nav-brick'|'uts.shlfsect.moretv'|'tahoma_searchlanding', BrandConfig[]>} BrandConfigGroups
 * all 保留筛选后的配置顺序，其余键直接使用官方标识。
 */

/**
 * @typedef {Object} BrandSearchOptions
 * @property {string} pathname - 主搜索或官方 TR/BR 路径；其他路径保持原样。
 * @property {string} searchTerm - 原始搜索词；频道名匹配忽略大小写及首尾空白。
 * @property {boolean} topResultsOnly - 主搜索是否仅合并到 TR；TR 导航始终合并到 TR。
 * @property {string} [lumenKey] - 本次 argument 的 X-Lumen-Key；缺省或空白时跳过 Lumen 搜索。
 */

/**
 * Apple TV Brand 注入器，按各方法入参原地修改 UTS 正文。
 * @author VirgilClyne
 * @version 1.2.0
 */
export default class InjectBrand {
	/** 初始化名称、版本及构造日志；请求参数由各注入方法接收。 */
	constructor() {
		this.Name = "InjectBrand";
		this.Version = "1.2.0";
		Console.log(`🟧 ${this.Name} v${this.Version}`);
	}

	/**
	 * 服务身份、原生 tab、插入位置和各场景素材；kind 仅供内部选取，不写入响应。
	 * 苹果品牌及搜索素材来自美服搜索落地页；F1/MLS 首页素材来自原站体育 brick。
	 * @type {BrandConfig[]}
	 */
	#Config = [
		{
			kind: "apple",
			id: "tvs.sbd.4000",
			name: "Apple TV",
			url: "https://tv.apple.com/us/channel/apple-tv/tvs.sbd.4000",
			placements: ["channelLockup", "brandLockup", "tahoma_searchlanding"],
			tab: {
				title: "Apple TV+",
				type: "Originals",
				universalLinks: ["https://tv.apple.com/channel/tvs.sbd.4000", "https://tv.apple.com/atv", "https://tv.apple.com/originals"],
				destinationType: "Target",
				target: {
					id: "tvs.sbd.4000",
					type: "Brand",
					url: "https://tv.apple.com/us/channel/tvs.sbd.4000",
				},
			},
			metadata: {
				isApSubscription: true,
				isFirstParty: true,
				isAppleTvPlus: true,
				isTvAppBrand: false,
				isWatchlistEnabled: true,
				shouldTrackPlayActivity: true,
			},
			images: {
				appIcon: {
					height: 1024,
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/a2/74/61/a274610a-1537-0429-df1b-afacfad5a478/tvCalistoga-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/{w}x{h}.{f}",
					width: 1024,
				},
				blackLogo: {
					height: 1483,
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/Aszi6l3ojodS-VY0K0_xFw/{w}x{h}.{f}",
					width: 2983,
				},
				colorLogo: {
					height: 3000,
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/ep5p_iruUEPRCp9E7RCLOA/{w}x{h}.{f}",
					width: 3000,
				},
				coverArt: {
					height: 1728,
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/cx6uAQf2vJTyCdq3e_Otlw/{w}x{h}.{f}",
					width: 2880,
				},
				logoGlyph: {
					height: 540,
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/WaKZAjYkuEvOizdGGTljxg/{w}x{h}.{f}",
					width: 960,
				},
				squareColorLogo: {
					height: 3000,
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/rHiThi7uam2qAiJlhosA4g/{w}x{h}SWL.TVARHBL1.{f}?bColor=000000",
					width: 3000,
				},
				whiteLogo: {
					height: 1483,
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/PC1Kf2TS2__FzsGmQOd4Mg/{w}x{h}.{f}",
					width: 2983,
				},
			},
			cards: {
				tahoma_watchnow: {
					height: 3000,
					isP3: true,
					joeColor: "b:rgb(32,23,30) p:rgb(232,229,229) s:rgb(215,170,144) t:rgb(192,188,189) q:rgb(178,140,121)",
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/Features221/v4/d6/de/ec/d6deeceb-dbdc-8672-9486-fb9f970d0a14/1b67f27d-5a61-4bfb-a205-8c26a8db67ee.png/{w}x{h}sr.{f}",
					width: 2000,
				},
				tahoma_searchlanding: {
					height: 3000,
					isP3: true,
					joeColor: "b:rgb(32,23,30) p:rgb(232,229,229) s:rgb(215,170,144) t:rgb(192,188,189) q:rgb(178,140,121)",
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/Features221/v4/d6/de/ec/d6deeceb-dbdc-8672-9486-fb9f970d0a14/1b67f27d-5a61-4bfb-a205-8c26a8db67ee.png/{w}x{h}sr.{f}",
					width: 2000,
				},
			},
		},
		{
			kind: "apple",
			id: "tvs.sbd.241000",
			name: "Formula 1",
			url: "https://tv.apple.com/us/channel/formula-1/tvs.sbd.241000",
			placements: ["channelLockup", "brandLockup", "uts.col.tv-plus-sports-nav-brick", "tahoma_searchlanding"],
			tab: {
				title: "Formula 1",
				type: "Grevy",
				universalLinks: ["https://tv.apple.com/f1"],
				destinationType: "Target",
				hexColor: "#000000",
				// 原站 configurations 的 F1 侧栏 SVG；四种字重共用相同路径。
				images: Object.fromEntries(
					[["boldImage", "bold"], ["defaultImage", "regular"], ["mediumImage", "medium"], ["regularImage", "regular"]].map(([key, weight]) => [key, {
						embeddedData: "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMTAwcHgiIGhlaWdodD0iMTAwcHgiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiPgogICAgPGcgc3Ryb2tlPSJub25lIiBmaWxsPSIjRkZGRkZGIj4KICAgICAgICA8cGF0aCBkPSJNNzMuMDAwMDAwMyw2MS41IEw5NiwzOC41IEw4Mi4xNTY4NzQ5LDM4LjUgTDU5LjE1NzM1NDQsNjEuNSBMNzMuMDAwMDAwMyw2MS41IFogTTY5LjcwMjM3NTMsNDguNTE2NSBMNDEuODU5NDM3Nyw0OC41MTY1IEMzMy4zNzM4NzUxLDQ4LjUxNjUgMzEuODg4OTM3Niw0OC45NjY0Mzc1IDI4LjI1NDQ1ODQsNTIuNjAwOTE2NyBDMjQuODU1MjUwMSw1Ni4wMDAxMjUgMTkuMzMzODEyNiw2MS41IDE5LjMzMzgxMjYsNjEuNSBMMzEuMzk0OTE2OCw2MS41IEwzNC4yNzIzMTI2LDU4LjYyMjYwNDIgQzM2LjE2NDA2MjYsNTYuNzMwODU0MiAzNy4xMzk2NDYsNTYuNTM0ODc1IDQxLjExMTkzNzcsNTYuNTM0ODc1IEw2MS42ODQ0Nzk0LDU2LjUzNDg3NSBMNjkuNzAyMzc1Myw0OC41MTY1IFogTTI3Ljg4MzEwNDMsNTAuOTYwNzI5MiBDMjUuMzcyNzUwMSw1My4zMjkyNSAxOS45MTA3MjkyLDU4LjYzNTA2MjUgMTYuOTY2NzI5Miw2MS41IEw0LDYxLjUgQzQsNjEuNSAxNC4zOTAyNSw1MS4xMzk5Mzc1IDIwLjE2NTE2NjcsNDUuNDU1NTgzMyBDMjYuMTE0OTc5MywzOS43OTE4MzMzIDI5LjA4MTAyMDksMzguNSAzOS45OTQwNDE4LDM4LjUgTDc5LjcxOTM1NDUsMzguNSBMNzEuMTE3ODMzNiw0Ny4xMDEwNDE3IEw0MC44MDA5NTg1LDQ3LjEwMTA0MTcgQzMzLjEzMjg1NDMsNDcuMTAxMDQxNyAzMS40MDk3NzA5LDQ3LjYzMjQzNzUgMjcuODgzMTA0Myw1MC45NjA3MjkyIFoiIGZpbGwtcnVsZT0ibm9uemVybyI+PC9wYXRoPgogICAgPC9nPgo8L3N2Zz4=",
						format: "embeddedSvg",
						weight,
					}]),
				),
				target: {
					id: "tvs.sbd.241000",
					type: "Brand",
					url: "https://tv.apple.com/us/channel/formula-1/tvs.sbd.241000",
				},
			},
			metadata: {
				isApSubscription: true,
				isFirstParty: true,
				isAppleTvPlus: false,
				isTvAppBrand: false,
				isWatchlistEnabled: true,
				shouldTrackPlayActivity: true,
			},
			images: {
				appIcon: {
					height: 1024,
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/a2/74/61/a274610a-1537-0429-df1b-afacfad5a478/tvCalistoga-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/{w}x{h}.{f}",
					width: 1024,
				},
				blackLogo: {
					height: 750,
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/Y_R2ZJKNFYvhFkiYaXVOag/{w}x{h}.{f}",
					width: 3000,
				},
				colorLogo: {
					height: 3000,
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/oHjtqHYVLwrqU0aEH2Z4aA/{w}x{h}.{f}",
					width: 3000,
				},
				coverArt: {
					height: 2160,
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/UtmzUTJfNIro1jxbT5b17Q/{w}x{h}.{f}",
					width: 3840,
				},
				logoGlyph: {
					height: 540,
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/_n3Zeia0obt4SDPsRCY3cA/{w}x{h}.{f}",
					width: 960,
				},
				squareColorLogo: {
					height: 3000,
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/hxicL9dDhYh2W0Hkt44igw/{w}x{h}SWL.TVARHBL1.{f}?bColor=000000",
					width: 3000,
				},
				whiteLogo: {
					height: 750,
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/q_wAJyObzza-ORtak5B4fg/{w}x{h}.{f}",
					width: 3000,
				},
			},
			cards: {
				tahoma_watchnow: {
					height: 3000,
					isP3: true,
					joeColor: "b:rgb(210,220,227) p:rgb(12,9,9) s:rgb(89,8,2) t:rgb(52,51,53) q:rgb(113,51,47)",
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/Features/v4/83/cb/da/83cbda10-5c59-c960-2a0a-1b80fd309987/a7de939d-fa92-446d-b14c-59f0c4178d81.png/{w}x{h}sr.{f}",
					width: 2000,
				},
				tahoma_searchlanding: {
					height: 3000,
					isP3: true,
					joeColor: "b:rgb(210,220,227) p:rgb(12,9,9) s:rgb(89,8,2) t:rgb(52,51,53) q:rgb(113,51,47)",
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/Features/v4/77/d6/14/77d6147d-dc6f-7f81-dd9f-1ecd0a4a8f01/4998f63d-417f-464b-9b88-0cd8881413e4.png/{w}x{h}sr.{f}",
					width: 2000,
				},
			},
		},
		{
			kind: "apple",
			id: "tvs.sbd.7000",
			name: "MLS",
			url: "https://tv.apple.com/us/channel/mls/tvs.sbd.7000",
			// 兼容现有设置：MLS 沿用 CountryCode.Originals，不新增地区参数。
			countryCodeKey: "Originals",
			placements: ["channelLockup", "brandLockup", "uts.col.tv-plus-sports-nav-brick", "tahoma_searchlanding"],
			tab: {
				title: "MLS",
				type: "MLS",
				universalLinks: ["https://tv.apple.com/mls"],
				destinationType: "Target",
				target: {
					id: "tvs.sbd.7000",
					type: "Brand",
					url: "https://tv.apple.com/us/channel/tvs.sbd.7000",
				},
			},
			metadata: {
				isApSubscription: true,
				isFirstParty: true,
				isAppleTvPlus: false,
				isTvAppBrand: false,
				isWatchlistEnabled: true,
				shouldTrackPlayActivity: true,
			},
			images: {
				appIcon: {
					height: 1024,
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/a2/74/61/a274610a-1537-0429-df1b-afacfad5a478/tvCalistoga-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/{w}x{h}.{f}",
					width: 1024,
				},
				blackLogo: {
					height: 2988,
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/ZEvYpFE1EoNYhZmh6GTUhQ/{w}x{h}.{f}",
					width: 2802,
				},
				colorLogo: {
					height: 3000,
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/OMtZIPVxM030bG18Buj5gw/{w}x{h}.{f}",
					width: 3000,
				},
				coverArt: {
					height: 2160,
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/isvIdExhLoORqDfxoTEhHQ/{w}x{h}.{f}",
					width: 3840,
				},
				logoGlyph: {
					height: 540,
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/_n3Zeia0obt4SDPsRCY3cA/{w}x{h}.{f}",
					width: 960,
				},
				squareColorLogo: {
					height: 2802,
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/1DxKCeYYsjBZyxFm5SYgUg/{w}x{h}SWL.TVARHBL1.{f}?bColor=000000",
					width: 2802,
				},
				whiteLogo: {
					height: 2988,
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/Kc1Xx3Z1QBOuXe1EHDu4TA/{w}x{h}.{f}",
					width: 2802,
				},
			},
			cards: {
				tahoma_watchnow: {
					height: 3000,
					isP3: true,
					joeColor: "b:rgb(20,39,88) p:rgb(232,165,131) s:rgb(246,158,84) t:rgb(190,140,122) q:rgb(201,134,85)",
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/Features/v4/f2/3e/92/f23e9206-8327-dea8-35e5-24aea4932257/4360e847-6a61-4215-8731-a16040db97e4.png/{w}x{h}sr.{f}",
					width: 2000,
				},
				tahoma_searchlanding: {
					height: 3000,
					isP3: true,
					joeColor: "b:rgb(233,130,33) p:rgb(12,6,1) s:rgb(9,17,39) t:rgb(56,31,8) q:rgb(54,40,38)",
					supportsLayeredImage: false,
					url: "https://is1-ssl.mzstatic.com/image/thumb/Features211/v4/79/29/21/79292130-a276-2bcc-06ff-282811d16e37/b08c19c1-5c55-43fd-add4-bc8af491d4a5.png/{w}x{h}sr.{f}",
					width: 2000,
				},
			},
		},
		{
			kind: "thirdParty",
			placements: ["channelLockup", "brandLockup", "uts.shlfsect.moretv", "tahoma_searchlanding"],
			id: "tvs.sbd.lumen",
			name: "Lumen",
			url: "https://tv.apple.com/us/channel/lumen/{id}",
			searchURL: "https://www.lumen.ax/api/appletv/v1/search",
			website: "https://www.lumen.ax/",
			hexColor: "#080809",
			images: {
				appIcon: {
					width: 1280,
					height: 768,
					url: "https://www.lumen.ax/api/appletv/pub/brand/v1/icon/{w}x{h}.{f}",
					supportsLayeredImage: false,
				},
				shelfImage: {
					width: 1280,
					height: 768,
					url: "https://www.lumen.ax/api/appletv/pub/brand/v1/icon/{w}x{h}.{f}",
					supportsLayeredImage: false,
				},
				shelfItemImage: {
					width: 1000,
					height: 1500,
					joeColor: "b:rgb(8,8,9) p:rgb(255,255,255) s:rgb(220,220,220) t:rgb(210,210,210) q:rgb(190,190,190)",
					url: "https://www.lumen.ax/api/appletv/pub/tile/v1/{w}x{h}sr.{f}",
					isP3: false,
					supportsLayeredImage: false,
				},
				logoGlyph: {
					width: 1764,
					height: 335,
					url: "https://www.lumen.ax/api/appletv/pub/brand/v1/logo/{w}x{h}.{f}",
					supportsLayeredImage: false,
				},
				whiteLogo: {
					width: 1764,
					height: 335,
					url: "https://www.lumen.ax/api/appletv/pub/brand/v1/logo/{w}x{h}.{f}",
					supportsLayeredImage: false,
				},
			},
			tab: {
				title: "频道和 App",
				type: "ChannelsAndApps",
				destinationType: "SubTabs",
				subTabsPlacementType: "ExpandedList",
				subTabs: [],
			},
		},
	];

	/**
	 * 将配置派生的完整 Brand 原地写入品牌接口或资源响应共用的 data.channels 字典。
	 * @param {Object} body - 已解析的品牌接口、频道、Room 或 shelf 正文。
	 * @param {BrandContext} options - 本次请求上下文；kinds 含 apple 时必须提供 settings。
	 * @returns {Object} 原 body 引用；已有品牌的订阅、安装、同意和固定状态保留。
	 */
	InjectBrand(body, options) {
		for (const config of this.#SelectConfig(options).all) {
			const channel = this.#BuildBrand(config, options, body.data?.channels?.[config.id]);
			_.set(body, ["data", "channels", channel.id], channel);
		}
		return body;
	}

	/**
	 * 原地补充配置频道的缺省侧栏偏好；不生成外部 App 的同意记录。
	 * @param {Object} body - 已解析的 /uts/v3/user/settings 正文。
	 * @param {Pick<BrandContext, 'kinds'|'settings'>} [options={}] - 按 kinds 及苹果频道开关筛选，再取 ChannelsAndApps 分组。
	 * @returns {Object} 原 body 引用；已有侧栏条目整体保留，不向服务端写回设置。
	 * @see https://github.com/NSRingo/apple.TVKit/blob/main/docs/lumen-user-settings-channel-model.md
	 */
	InjectUTSUserSettings(body, options = {}) {
		for (const { id } of this.#SelectConfig(options).ChannelsAndApps) {
			const sidebarSetting = body.data?.brandSidebarSetting?.[id] ?? { isHidden: false, isPinned: false };
			_.set(body, ["data", "brandSidebarSetting", id], sidebarSetting);
		}
		return body;
	}

	/**
	 * 在频道或 Room 末尾追加独立官网外链；不改变 Brand 导航或客户端自动生成的 App 页脚。
	 * @param {Object} body - 已解析并确认存在 data.canvas 的频道或 Room 正文。
	 * @param {BrandContext} options - 本次地区与频道筛选上下文，官网外链仅处理第三方配置。
	 * @returns {Object} 原 body 引用；保留原 shelves 数组及其他行，重复调用替换同 ID 外链行。
	 * @see https://github.com/NSRingo/apple.TVKit/blob/main/docs/lumen-open-app-and-website.md
	 */
	InjectWebsiteLink(body, options) {
		const { region } = options;
		_.set(body, "data.canvas.shelves", body.data.canvas.shelves ?? []);
		for (const config of this.#SelectConfig(options).all.filter(({ kind, website }) => kind === "thirdParty" && website)) {
			const shelf = this.#BuildWebsiteShelf(config, region);
			const index = body.data.canvas.shelves.findIndex(({ id }) => id === shelf.id);
			switch (index) {
				case -1:
					body.data.canvas.shelves.push(shelf);
					break;
				default:
					body.data.canvas.shelves.splice(index, 1, shelf);
					break;
			}
		}
		return body;
	}

	/**
	 * 原地首插配置中的频道导航，缺少 ChannelsAndApps 分组或 subTabs 时创建。
	 * 导航 target 与 data.channels[id] 共用同一完整 Brand。
	 * @param {Object} body - 已解析的 UTS 配置正文。
	 * @param {BrandContext} options - 本次请求上下文；仅 ChannelsAndApps 分组生成子导航。
	 * @returns {Object} 原 body 引用。
	 */
	InjectUTSConfigurationChannelsAndApps(body, options) {
		const configs = this.#SelectConfig(options).ChannelsAndApps;
		const channels = [];
		for (const config of configs) {
			const channel = this.#BuildBrand(config, options, body.data?.channels?.[config.id]);
			channels.push(channel);
		}
		switch (channels.length) {
			case 0:
				break;
			default: {
				_.set(body, "data.applicationProps.tabs", body.data?.applicationProps?.tabs ?? []);
				const tabs = body.data.applicationProps.tabs;
				const tab = tabs.find(({ type }) => type === configs[0].tab.type) ?? { ...configs[0].tab, subTabs: [] };
				const subTabs = channels.map(channel => this.#BuildBrandSubTab(channel, tab.subTabs?.find(({ target }) => target?.id === channel.id)));
				_.set(tab, "subTabs", [...subTabs, ...(tab.subTabs ?? []).filter(({ target }) => !channels.some(({ id }) => id === target?.id))]);
				switch (tabs.indexOf(tab)) {
					case -1: {
						let index = tabs.findIndex(({ type }) => type === "Library");
						switch (index) {
							case -1:
								index = tabs.length;
								break;
						}
						tabs.splice(index, 0, tab);
						break;
					}
				}
				for (const channel of channels) _.set(body, ["data", "channels", channel.id], channel);
				break;
			}
		}
		return body;
	}

	/**
	 * 在已有 tabs 数组中补齐选中的苹果频道；普通导航排序仍由 Response 处理。
	 * @param {Object} body - 已解析的 UTS 配置正文；缺少 tabs 数组时保持原样。
	 * @param {BrandContext} options - 本次请求上下文；settings.Tabs 决定苹果频道选取。
	 * @returns {Object} 原 body 引用；已有 tab 保留，不创建品牌字典。
	 */
	InjectUTSConfigurationTabs(body, options) {
		const tabs = body.data?.applicationProps?.tabs;
		switch (Array.isArray(tabs)) {
			case true:
				for (const config of this.#SelectConfig(options).all) {
					switch (config.tab.destinationType) {
						case "Target":
							switch (tabs.some(({ type }) => type === config.tab.type)) {
								case false:
									tabs.push({ ...config.tab, universalLinks: [...config.tab.universalLinks], target: { ...config.tab.target } });
									break;
							}
							break;
					}
				}
				break;
		}
		return body;
	}

	/**
	 * 按配置补入已有频道行、体育 brick 和 moretv；苹果与第三方使用各自位置。
	 * 没有目标行时保持正文原样，不创建首页行。
	 * @param {Object} body - 已解析的首页正文，频道行位于 data.canvas.shelves。
	 * @param {BrandContext} options - 本次请求上下文；位置来自各频道 placements，不按平台限制。
	 * @returns {Object} 原 body 引用。
	 */
	InjectWatchNowLockup(body, options) {
		const configs = this.#SelectConfig(options);
		for (const shelf of body.data?.canvas?.shelves ?? []) {
			switch (shelf.displayType) {
				case "channelLockup":
				case "brandLockup":
					this.#InjectCards(body, shelf, configs[shelf.displayType], options, "tahoma_watchnow");
					break;
				case "doorLockupWithSections":
					for (const section of shelf.sections ?? []) {
						switch (section.id) {
							case "uts.shlfsect.moretv":
								this.#InjectCards(body, section, configs[section.id], options, "tahoma_watchnow");
								break;
						}
					}
					break;
				case "brick":
					switch (shelf.id) {
						case "uts.col.tv-plus-sports-nav-brick":
							this.#InjectCards(body, shelf, configs[shelf.id], options, "tahoma_watchnow");
							break;
					}
					break;
			}
		}
		return body;
	}

	/**
	 * 在原站 Browse 网格补齐苹果频道并首插第三方；缺少网格时仅为第三方创建。
	 * 两条 landing 路径共用此结构，不生成 Room 或搜索结果 BR 行。
	 * @param {Object} body - 已解析的搜索落地页正文。
	 * @param {BrandContext} options - 本次请求上下文；苹果频道使用 settings.Tabs 与对应地区设置。
	 * @returns {Object} 原 body 引用。
	 */
	InjectSearchLanding(body, options) {
		let configs = this.#SelectConfig(options).tahoma_searchlanding;
		const thirdParty = configs.filter(({ kind }) => kind === "thirdParty");
		let shelf = body.data?.canvas?.shelves?.find(({ displayType, isGrid }) => displayType === "brick" && isGrid);
		switch (Boolean(shelf)) {
			case false:
				switch (thirdParty.length) {
					case 0:
						break;
					default:
						shelf = this.#BuildSearchLandingShelf(thirdParty[0]);
						_.set(body, "data.canvas.shelves", body.data?.canvas?.shelves ?? []);
						body.data.canvas.shelves.unshift(shelf);
						break;
				}
				break;
		}
		switch (Boolean(shelf)) {
			case true: {
				const fallback = this.#Config.some(({ kind, id }) => kind === "thirdParty" && shelf.id === `edt.col.${id.split(".").at(-1)}-browse`);
				switch (fallback) {
					case true:
						configs = thirdParty;
						break;
				}
				this.#InjectCards(body, shelf, configs, options, "tahoma_searchlanding");
				break;
			}
		}
		return body;
	}

	/**
	 * 查询频道影视后端并原地写入搜索结果；频道名完整匹配时才加入频道入口。
	 * 主响应使用 data.canvas.shelves，官方 TR/BR 导航使用 data.shelf。
	 * @param {Object} body - 已解析的搜索主响应或 TR/BR 导航正文。
	 * @param {BrandContext & BrandSearchOptions} options - 本次请求上下文与搜索参数；只查询选中的第三方后端。
	 * @returns {Promise<Object>} 解析为原 body 引用；无鉴权或空词不查询，BR 导航不查询影视后端。
	 */
	async InjectSearch(body, options) {
		const { region, pathname, searchTerm, topResultsOnly, lumenKey } = options;
		const keyword = searchTerm.trim().toLowerCase();
		// 脚本内部请求不经过 Surge Header Rewrite，鉴权必须随本次查询显式传入。
		const headers = { "X-Lumen-Key": lumenKey?.trim() };
		const configs = this.#SelectConfig(options).all.filter(({ kind, searchURL }) => kind === "thirdParty" && searchURL && keyword && headers["X-Lumen-Key"]);
		const channels = configs.map(config => this.#BuildBrand(config, options, body.data?.channels?.[config.id]));
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
								let items = brands;
								let selectedCategories = categories;
								switch (Boolean(topResultsOnly)) {
									case true:
										items = [...brands, ...results.flatMap(({ items }) => items)];
										selectedCategories = categories.filter(({ id }) => id === "uts.col.search.TR");
										break;
									default:
										switch (brands.length) {
											case 0:
												selectedCategories = [];
												break;
										}
										break;
								}
								for (const category of selectedCategories) {
									const shelf = body.data.canvas.shelves.find(({ id }) => id === category.id) ?? { ...category };
									switch (body.data.canvas.shelves.indexOf(shelf)) {
										case -1: {
											let index = 0;
											switch (category.id) {
												case "uts.col.search.TR":
													break;
												default:
													index = body.data.canvas.shelves.findIndex(({ id }) => id === "uts.col.search.PN");
													switch (index) {
														case -1:
															index = body.data.canvas.shelves.length;
															break;
													}
													break;
											}
											body.data.canvas.shelves.splice(index, 0, shelf);
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
	 * @param {Record<string, string|undefined>} headers - 本次查询显式携带的鉴权头，不写入 Brand 或响应正文。
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
	 * 采用美服实际 ExternalLink 的 epicShowcase / Flavor_D 包装，不伪造 Brand 的打开 App 字段。
	 * @private
	 * @param {BrandConfig} config - #Config 中包含 website 的第三方品牌配置。
	 * @param {string} region - 用于 collection URL 的小写地区码。
	 * @returns {Object} 独立官网行；URL 由客户端外链路由转换为 AppPunchout.contextData.openUrl。
	 */
	#BuildWebsiteShelf(config, region) {
		const id = config.id.split(".").at(-1);
		return {
			id: `edt.col.${id}-website`,
			displayType: "epicShowcase",
			header: { supportsSeeAllView: false },
			url: `https://tv.apple.com/${region}/collection/edt.col.${id}-website`,
			items: [
				{
					id: `edt.item.${id}-website`,
					type: "ExternalLink",
					flavorType: "Flavor_D",
					isExternalUrl: true,
					tagLine: `打开 ${config.name} 官网`,
					shortNote: config.website,
					url: config.website,
					images: { shelfItemImage: { ...config.images.appIcon } },
				},
			],
		};
	}

	/**
	 * 组装 ChannelsAndApps.subTabs[] 的频道导航包装。
	 * @private
	 * @param {Object} brand - 完整 Brand，直接复用为 target。
	 * @param {Object} [state] - 已有子导航，保留其固定状态。
	 * @returns {Object} 含频道菜单、侧栏图片及 Brand target 的子导航。
	 * @see https://github.com/NSRingo/apple.TVKit/blob/main/docs/brand-type-client-behavior.md
	 */
	#BuildBrandSubTab(brand, state) {
		return {
			// 官方子导航以 Brand 标识品牌入口；Channel 是页面分类，不属于导航 type 枚举。
			type: "Brand",
			// Lumen 按频道接入侧栏菜单，Hide 使用 isChannel=true；不决定派生的 channelType 或播放方式。
			brandType: "Channel",
			destinationType: "Target",
			title: brand.title,
			isPinned: state?.isPinned ?? brand.isPinned,
			canBeHiddenFromNavigation: true,
			images: { defaultImage: { ...brand.images.appIcon } },
			target: brand,
			universalLinks: [brand.url],
		};
	}

	/**
	 * 组装 data.canvas.shelves[] 的搜索 Browse 网格模板。
	 * @private
	 * @param {Pick<BrandConfig, 'id'>} channel - 用于派生 Browse 集合 ID 的第三方配置。
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
	 * 按调用分组与苹果频道开关筛选，再由各频道配置的 tab.type、placements 决定归类。
	 * @private
	 * @param {Pick<BrandContext, 'kinds'|'settings'>} options - 缺省只选第三方；包含 apple 时必须提供 settings.Tabs。
	 * @returns {BrandConfigGroups} 按配置顺序排列的频道分组；键直接使用官方类型与完整 ID。
	 */
	#SelectConfig({ kinds = ["thirdParty"], settings }) {
		const candidates = this.#Config.filter(({ kind }) => kinds.includes(kind));
		const selected = [];
		for (const config of candidates) {
			switch (config.kind) {
				case "apple":
					switch (settings.Tabs.includes(config.tab.type)) {
						case true:
							selected.push(config);
							break;
					}
					break;
				case "thirdParty":
					selected.push(config);
					break;
			}
		}
		const grouped = { all: selected, ChannelsAndApps: [], channelLockup: [], brandLockup: [], "uts.col.tv-plus-sports-nav-brick": [], "uts.shlfsect.moretv": [], tahoma_searchlanding: [] };
		for (const config of selected) {
			switch (config.tab.type) {
				case "ChannelsAndApps":
					grouped[config.tab.type].push(config);
					break;
			}
			for (const placement of config.placements) {
				switch (placement) {
					case "channelLockup":
					case "brandLockup":
					case "uts.col.tv-plus-sports-nav-brick":
					case "uts.shlfsect.moretv":
					case "tahoma_searchlanding":
						grouped[placement].push(config);
						break;
				}
			}
		}
		return grouped;
	}

	/**
	 * 苹果按原生顺序补缺项，第三方沿用首插；卡片与品牌字典分别使用对应协议结构。
	 * @private
	 * @param {Object} body - 原响应正文，用于保留或补入 data.channels[id]。
	 * @param {Object} container - 已找到的 shelf 或 section，原地修改其 items。
	 * @param {BrandConfig[]} configs - SelectConfig 按当前位置归组后的频道配置。
	 * @param {BrandContext} options - 传给 BuildBrand 的本次请求上下文。
	 * @param {'tahoma_watchnow'|'tahoma_searchlanding'} rootId - 官方页面根 ID，直接选取苹果频道 cards 素材。
	 * @returns {void} 原地补入卡片与品牌，保留已有苹果卡片及其 URL。
	 */
	#InjectCards(body, container, configs, options, rootId) {
		const items = container.items ?? [];
		const appleOrder = this.#Config.filter(({ kind }) => kind === "apple").map(({ id }) => id);
		const thirdPartyBrands = [];
		for (const config of configs) {
			const channel = this.#BuildBrand(config, options, body.data?.channels?.[config.id]);
			switch (config.kind) {
				case "apple":
					_.set(body, ["data", "channels", channel.id], channel);
					switch (items.some(({ id }) => id === config.id)) {
						case false: {
							// 先找后方原生频道；没有时接在前方频道之后，均不存在则首插。
							const position = appleOrder.indexOf(config.id);
							const later = appleOrder.slice(position + 1);
							const laterIndexes = later.map(id => items.findIndex(item => item.id === id));
							let index = laterIndexes.find(index => index >= 0) ?? -1;
							switch (index) {
								case -1: {
									const earlier = appleOrder.slice(0, position).reverse();
									const earlierIndexes = earlier.map(id => items.findIndex(item => item.id === id));
									const previous = earlierIndexes.find(index => index >= 0) ?? -1;
									index = previous + 1;
									break;
								}
							}
							items.splice(index, 0, {
								id: config.id,
								type: "Brand",
								title: channel.title,
								url: channel.url,
								flavor: "FullBleed",
								intents: ["NAVIGATE"],
								images: { shelfItemImage: { ...config.cards[rootId] } },
							});
							break;
						}
					}
					break;
				case "thirdParty":
					thirdPartyBrands.push(channel);
					break;
			}
		}
		switch (configs.length) {
			case 0:
				break;
			default:
				switch (thirdPartyBrands.length) {
					case 0:
						container.items = items;
						break;
					default:
						container.items = [...thirdPartyBrands, ...items.filter(({ id }) => !thirdPartyBrands.some(brand => brand.id === id))];
						for (const brand of thirdPartyBrands) _.set(body, ["data", "channels", brand.id], brand);
						break;
				}
				break;
		}
	}

	/**
	 * 保留原站苹果 Brand；缺少时使用公开元数据，第三方沿用各自接入定义。
	 * @private
	 * @param {BrandConfig} config - #Config 中的服务身份、端点和素材。
	 * @param {BrandContext} options - pfm 只决定宿主字段，地区由本次设置选择。
	 * @param {Object} [state] - 已有品牌记录；保留其订阅、安装、同意和固定状态。
	 * @returns {Object} 导航、卡片和 data.channels[id] 共用的完整 Brand。
	 * @see https://github.com/NSRingo/apple.TVKit/blob/main/docs/channels-apps-brand-taxonomy.md
	 */
	#BuildBrand(config, { platform, region, settings }, state) {
		// 只匹配宿主字段，不按平台限制注入；官方 iPhone/ipad 与 desktop/appletv 返回不同宿主。
		let appHost;
		switch (platform?.toLowerCase()) {
			case "iphone":
			case "ipad":
				appHost = { appAdamIds: ["1174078549"], appBundleIds: ["com.apple.tv"], appName: "Apple TV" };
				break;
			default:
				appHost = { appAdamIds: ["1171145244"], appBundleIds: ["com.apple.TVWatchList"], appName: "TV" };
				break;
		}
		let channel;
		switch (config.kind) {
			case "apple":
				switch (Boolean(state)) {
					case true:
						channel = state;
						break;
					case false: {
						const country = settings.CountryCode[config.countryCodeKey ?? config.tab.type];
						let channelRegion = region;
						switch (country) {
							case "AUTO":
								break;
							default:
								channelRegion = country.toLowerCase();
								break;
						}
						channel = {
							id: config.id,
							name: config.name,
							title: config.name,
							type: "Brand",
							url: config.url.replace("/us/", `/${channelRegion}/`),
							hexColor: "#000000",
							...config.metadata,
							...appHost,
							images: Object.fromEntries(Object.entries(config.images).map(([key, image]) => [key, { ...image }])),
						};
						break;
					}
				}
				break;
			case "thirdParty":
				channel = {
					id: config.id,
					name: config.name,
					title: config.name,
					type: "Brand",
					flavor: "FullBleed",
					url: config.url.replace("{id}", config.id).replace("/us/", `/${region}/`),
					searchURL: config.searchURL,
					intents: ["NAVIGATE"],
					isPinned: state?.isPinned ?? false,
					...appHost,
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
					images: Object.fromEntries(Object.entries(config.images).map(([key, image]) => [key, { ...image }])),
				};
				break;
		}
		return channel;
	}
}
