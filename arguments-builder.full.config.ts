import { type ArgumentItem, defineConfig } from "@iringo/arguments-builder";
import database from "./src/function/database.mjs";

export const output = {
	surge: {
		path: "./dist/iRingo.TV.sgmodule",
		transformEgern: {
			enable: true,
			path: "./dist/iRingo.TV.yaml",
		},
	},
	loon: {
		path: "./dist/iRingo.TV.plugin",
	},
	customItems: [
		{
			path: "./dist/iRingo.TV.snippet",
			template: "./template/quantumultx.handlebars",
		},
		{
			path: "./dist/iRingo.TV.stoverride",
			template: "./template/stash.handlebars",
		},
		{
			path: "./dist/iRingo.TV.srmodule",
			template: "./template/shadowrocket.handlebars",
		},
	],
	dts: { isExported: true, path: "./src/types.d.ts" },
	boxjsSettings: {
		path: "./template/boxjs.settings.json",
		scope: "@iRingo.TV.Settings",
	},
};

const publicArgs: ArgumentItem[] = [
	{
		key: "ThirdParty",
		name: "启用第三方 App 与 TV app 关联功能",
		defaultValue: false,
		type: "boolean",
		description: "是否将桌面版/macOS版/app版等平台的 TV app 转换至 iPad 版，以启用第三方 App 与 TV app 关联功能(如: Disney+, Prime Video 等)。",
	},
	{
		key: "isWorkaroundSSLPinning",
		name: "启用绕过 SSL 证书固定校验",
		defaultValue: true,
		type: "boolean",
		description: "是否绕过播放列表所使用域名的证书固定校验功能，从而恢复对DualSubs的双语字幕支持。",
	},

	{
		key: "LogLevel",
		name: "[调试] 日志等级",
		type: "string",
		defaultValue: "WARN",
		description: "选择脚本日志的输出等级，低于所选等级的日志将全部输出。",
		options: [
			{ key: "OFF", label: "🔴 关闭" },
			{ key: "ERROR", label: "❌ 错误" },
			{ key: "WARN", label: "⚠️ 警告" },
			{ key: "INFO", label: "ℹ️ 信息" },
			{ key: "DEBUG", label: "🅱️ 调试" },
			{ key: "ALL", label: "全部" },
		],
	},
];

const storage: ArgumentItem = {
	key: "Storage",
	name: "[储存] 配置类型",
	defaultValue: "PersistentStore",
	type: "string",
	exclude: ["boxjs"],
	options: [
		{ key: "Argument", label: "优先使用 $argument，其次使用 PersistentStore (BoxJs)，最后使用 database.mjs 的默认配置" },
		{ key: "PersistentStore", label: "优先使用 PersistentStore (BoxJS)，其次使用 $argument，最后使用 database.mjs 的默认配置" },
		{ key: "database", label: "只使用脚本内置默认配置" },
	],
	description: "默认使用 PersistentStore，配置优先级为 database -> $argument -> PersistentStore (BoxJS)；选择 Argument 时为 database -> PersistentStore (BoxJS) -> $argument。",
};

const tabs: ArgumentItem = {
	key: "Tabs",
	name: "启用的标签与栏目",
	type: "array",
	boxJsType: "checkboxes",
	defaultValue: database.TV.Settings.Tabs,
	options: [
		{ key: "WatchNow", label: "主页（立即观看）" },
		{ key: "Originals", label: "Apple TV+（原创内容）" },
		{ key: "MLS", label: "MLS" },
		{ key: "Sports", label: "体育节目" },
		{ key: "Kids", label: "儿童" },
		{ key: "Store", label: "商店" },
		{ key: "Movies", label: "电影" },
		{ key: "TV", label: "电视节目" },
		{ key: "ChannelsAndApps", label: "频道与 App" },
		{ key: "Library", label: "资料库" },
		{ key: "Search", label: "搜索" },
	],
	description: "选择标签与栏目，多个值以逗号分隔；实际入口仍由平台、版本和地区决定。",
};

const countryOptions = [
	{ key: "AUTO", label: "自动（保留原请求地区）" },
	{ key: "CN", label: "中国大陆" },
	{ key: "HK", label: "中国香港" },
	{ key: "TW", label: "中国台湾" },
	{ key: "SG", label: "新加坡" },
	{ key: "US", label: "美国" },
	{ key: "JP", label: "日本" },
	{ key: "AU", label: "澳大利亚" },
	{ key: "GB", label: "英国" },
	{ key: "KR", label: "韩国" },
	{ key: "CA", label: "加拿大" },
	{ key: "IE", label: "爱尔兰" },
];

const countryNames: Record<string, string> = {
	Configs: "配置文件",
	Settings: "用户设置",
	View: "内容详情地区优先级",
	WatchNow: "主页",
	Channels: "频道与 App",
	Originals: "Apple TV+",
	Sports: "体育节目",
	Kids: "儿童",
	Store: "商店",
	Movies: "电影",
	TV: "电视节目",
	Persons: "人物",
	Search: "搜索",
	Others: "其他",
};

const countries: ArgumentItem[] = Object.entries(database.TV.Settings.CountryCode).map(([key, defaultValue]) => ({
	key: `CountryCode.${key}`,
	name: `[${countryNames[key]}] 国家或地区代码`,
	type: key === "View" ? "array" : "string",
	defaultValue,
	...(key === "View" ? { boxJsType: "text" as const, description: "按优先顺序填写地区代码，以逗号分隔，默认 SG,TW。" } : { options: countryOptions, description: "选择此分类请求使用的国家或地区；AUTO 保留原值。" }),
}));

export const args: ArgumentItem[] = [...publicArgs.slice(0, 2), storage, publicArgs[2]];
export const argsFull: ArgumentItem[] = [...publicArgs.slice(0, 2), tabs, ...countries, storage, publicArgs[2]];

export default defineConfig({ output, args: argsFull });
