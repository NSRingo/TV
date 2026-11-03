import getStorage from "@nsnanocat/util/getStorage.mjs";
import { Console, Lodash as _, Storage } from "@nsnanocat/util";

/**
 * 合并请求设置并将品牌选项解析为 ID。
 * Merge request settings and resolve selected brands to IDs.
 * @author VirgilClyne
 * @param {string} name - 持久化主键 / Persistent store key.
 * @param {string} platforms - 配置名称 / Profile name.
 * @param {Object} database - 默认数据库 / Default database.
 * @return {Object} 合并后的 Settings、Caches 与 Configs / Merged Settings, Caches and Configs.
 */
export default function setENV(name, platforms, database) {
	Console.log("☑️ Set Environment Variables");
	const { Settings, Caches, Configs } = getStorage(name, platforms, JSON.parse(JSON.stringify(database)));
	/***************** Settings *****************/
	// getStorage 忽略用于覆盖的空数组；品牌全不选仍须遵循同一来源优先级。
	// getStorage skips empty array overrides; an empty brand selection must still honor source precedence.
	if ($argument.Storage !== "database") {
		const stored = Storage.getItem(name, {})?.[platforms]?.Settings;
		const storedBrands = (typeof stored === "string" ? JSON.parse(stored || "{}") : stored)?.Brands;
		const brands = ["Argument", "$argument"].includes($argument.Storage) ? ($argument.Brands ?? storedBrands) : (storedBrands ?? $argument.Brands);
		if (Array.isArray(brands) && !brands.length) Settings.Brands = [];
	}
	if (!Array.isArray(Settings?.Brands)) _.set(Settings, "Brands", Settings?.Brands ? [Settings.Brands.toString()] : []);
	Settings.Brands = Settings.Brands.flatMap(brand => Configs.Brand[brand] ?? []);
	Console.info(`typeof Settings: ${typeof Settings}`, `Settings: ${JSON.stringify(Settings, null, 2)}`);
	/***************** Caches *****************/
	//Console.debug(`typeof Caches: ${typeof Caches}`, `Caches: ${JSON.stringify(Caches)}`);
	/***************** Configs *****************/
	//Configs.Storefront = new Map(Configs.Storefront);
	Console.log("✅ Set Environment Variables");
	return { Settings, Caches, Configs };
}
