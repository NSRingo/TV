import { Lodash as _, Console } from "@nsnanocat/util";
import InjectBrand from "../class/InjectBrand.mjs";
import database from "../function/database.mjs";
import setENV from "../function/setENV.mjs";
/***************** Processing *****************/
/**
 * 临时修复 Lumen UTS 响应的行头部与电影页面编排，沿用 TV response 的处理骨架。
 * @param {Object} $request - 当前请求，支持 LogLevel argument。
 * @param {Object} $response - 待原地修改的响应。
 * @returns {Promise<Object>} 原响应对象。
 * @see https://github.com/NSRingo/apple.TVKit/blob/main/docs/lumen-ios-api-compatibility.md
 */
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
	const { Settings, Configs } = setENV("iRingo", "TV", database);
	Console.logLevel = Settings.LogLevel;
	Settings.Brands = Settings.Brands.filter(id => id === "tvs.sbd.lumen");
	if (!Settings.Brands.length) return $response;
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
				case "www.lumen.ax": {
					const Platform = url.searchParams.get("pfm"),
						StoreFront = url.searchParams.get("sf") ?? url.searchParams.get("sfh")?.split("-")[0];
					const Region =
						Object.entries(Configs.Storefront)
							.find(([, sf]) => sf === StoreFront)?.[0]
							.toLowerCase() ?? "us";
					/** @type {import('../class/InjectBrand.mjs').BrandContext} */
					const brandContext = { pfm: Platform, region: Region, settings: Settings };
					const injectBrand = new InjectBrand(brandContext);
					// 路径判断
					switch (PATHs.slice(0, 5).join("/")) {
						case "api/appletv/v1/uts/v3":
							switch (PATHs[5]) {
								case "canvases":
									switch (PATHs[6]) {
										case "Channels":
										case "Rooms":
											switch (Boolean(body.data?.canvas)) {
												case true:
													body.data.channels ??= {};
													injectBrand.InjectChannels(body.data.channels, brandContext);
													for (const shelf of body.data.canvas.shelves ?? []) {
														setShelfHeader(shelf, body.data.channels["tvs.sbd.lumen"]);
														removeEmptyGenres(shelf);
													}
													// body.data.canvas.shelves ??= [];
													// injectBrand.InjectWebsiteLink(body.data.canvas.shelves, { region: Region });
													break;
											}
											break;
									}
									break;
								case "shelves":
									switch (Boolean(body.data?.shelf)) {
										case true:
											body.data.channels ??= {};
											injectBrand.InjectChannels(body.data.channels, brandContext);
											setShelfHeader(body.data.shelf, body.data.channels["tvs.sbd.lumen"]);
											removeEmptyGenres(body.data.shelf);
											break;
									}
									break;
								case "movies":
									switch (Boolean(body.data?.canvas && body.data?.content)) {
										case true:
											_.set(body, "data.canvas.shelves", body.data.canvas.shelves ?? []);
											// 仅为已有数据补官方章节标记，不虚构预告片、卡司或相关推荐。
											for (const [id] of [
												["uts.marker.HowToWatch", body.data.howToWatch?.length],
												["uts.marker.About", body.data.content.description],
												["uts.marker.Info", body.data.content],
											].filter(([, available]) => available)) {
												switch (body.data.canvas.shelves.some(shelf => shelf.id === id)) {
													case false:
														body.data.canvas.shelves.push({ id });
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
	/**
	 * 原地省略内容项的空 genres 数组，保留非空分类及其他字段。
	 * TV JS 27.1.16 的 tvOS 分支读取 genres?.[0].name 时会因空数组抛错，随后静默丢弃该海报；省略字段可避开此分支。
	 * @param {Object} shelf - 频道、Room 或独立 shelf 中的内容行。
	 * @returns {Object} 原 shelf 引用；内容数量、顺序和分页不变。
	 */
	function removeEmptyGenres(shelf) {
		for (const item of shelf.items ?? []) {
			switch (item.genres?.length === 0) {
				case true:
					delete item.genres;
					break;
			}
		}
		return shelf;
	}

	/**
	 * 原地补齐频道 canvas 与独立 shelf 共用的官方行头部，保留已有 header 字段。
	 * @param {Object} shelf - 待修改的行。
	 * @param {Object} channel - InjectBrand 组装的完整 Lumen Brand，直接复用。
	 * @returns {Object} 原 shelf 引用。
	 */
	function setShelfHeader(shelf, channel) {
		switch (shelf?.displayType) {
			case "lockup":
				_.set(shelf, "header", {
					title: shelf.title,
					supportsSeeAllView: Boolean(shelf.url),
					...shelf.header,
					// 官方 header 使用 /shelf/ 导航，顶层 /collection/ 地址保持原样。
					url: shelf.header?.url ?? shelf.url?.replace("/collection/", "/shelf/"),
				});
				break;
			case "epicStage":
				_.set(shelf, "header", {
					title: channel.title,
					supportsSeeAllView: false,
					url: channel.url,
					...shelf.header,
					entityType: "Brand",
					entity: channel,
					images: { headerImage: channel.images.headerImage ?? channel.images.squareColorLogo ?? channel.images.appIcon, ...shelf.header?.images },
				});
				break;
		}
		return shelf;
	}
}
