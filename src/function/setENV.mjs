import getStorage from "@nsnanocat/util/getStorage.mjs";
import { Console, Lodash as _, qs } from "@nsnanocat/util";

/**
 * Set Environment Variables
 * @author VirgilClyne
 * @param {String} name - Persistent Store Key
 * @param {Array} platforms - Platform Names
 * @param {Object} database - Default DataBase
 * @return {Object} { Settings, Caches, Configs, LumenKey }
 */
export default function setENV(name, platforms, database, argument = globalThis.$argument) {
	Console.log("☑️ Set Environment Variables");
	// 鉴权值仅从本次 argument 读取，不交给会记录配置内容的 getStorage。
	const { LumenKey, ...settingsArgument } = qs.parse(argument);
	const previousArgument = globalThis.$argument;
	let profile;
	try {
		globalThis.$argument = settingsArgument;
		profile = getStorage(name, platforms, JSON.parse(JSON.stringify(database)));
	} finally {
		globalThis.$argument = previousArgument;
	}
	const { Settings, Caches, Configs } = profile;
	/***************** Settings *****************/
	if (!Array.isArray(Settings?.Tabs)) _.set(Settings, "Tabs", Settings?.Tabs ? [Settings.Tabs.toString()] : []);
	Settings.Tabs = Settings.Tabs.flatMap(tab => Configs.Tab[tab] ?? []);
	Console.info(`typeof Settings: ${typeof Settings}`, `Settings: ${JSON.stringify(Settings, null, 2)}`);
	/***************** Caches *****************/
	//Console.debug(`typeof Caches: ${typeof Caches}`, `Caches: ${JSON.stringify(Caches)}`);
	/***************** Configs *****************/
	//Configs.Storefront = new Map(Configs.Storefront);
	if (Configs.i18n) for (const type in Configs.i18n) Configs.i18n[type] = new Map(Configs.i18n[type]);
	Console.log("✅ Set Environment Variables");
	return { Settings, Caches, Configs, LumenKey };
}
