import { defineConfig } from "@iringo/arguments-builder";
export default defineConfig({
	output: {
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
	},
	args: [
		{
			key: "ThirdParty",
			name: "启用第三方 App 与 TV app 关联功能",
			defaultValue: false,
			type: "boolean",
			description: "是否将桌面版/macOS版/app版等平台的 TV app 转换至 iPad 版，以启用第三方 App 与 TV app 关联功能(如: Disney+, Prime Video 等)。",
		},
		{
			key: "HLSUrl",
			name: "[主机名] HTTP实时流(HLS)地址",
			defaultValue: "play-edge.itunes.apple.com",
			type: "string",
			description: "因为FPS服务域名禁止MitM，修改此地址可以分离HLS与FPS的域名，从而恢复对DualSubs的双语字幕支持。",
			options: [
				{
					key: "",
					label: "OFF(不修改)",
				},
				{
					key: "play.itunes.apple.com",
					label: "play.itunes.apple.com (不推荐，与播放服务域名重叠)",
				},
				{
					key: "play-edge.itunes.apple.com",
					label: "play-edge.itunes.apple.com (默认)",
				},
			],
		},
		{
			key: "FPSUrl",
			name: "[主机名] FairPlay流(FPS)地址",
			defaultValue: "play.itunes.apple.com",
			type: "string",
			description: "因为FPS服务域名禁止MitM，修改此地址可以分离HLS与FPS的域名，从而恢复对DualSubs的双语字幕支持。",
			options: [
				{
					key: "",
					label: "OFF(不修改)",
				},
				{
					key: "play.itunes.apple.com",
					label: "play.itunes.apple.com (默认)",
				},
				{
					key: "play-edge.itunes.apple.com",
					label: "play-edge.itunes.apple.com (不推荐，与播放服务域名重叠)",
				},
			],
		},
	],
});
