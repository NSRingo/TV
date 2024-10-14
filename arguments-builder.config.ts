import { defineConfig } from "@iringo/arguments-builder";
export default defineConfig({
	output: {
		surge: { path: "./dist/TV.sgmodule" },
		loon: { path: "./dist/TV.plugin" },
		customItems: [
			{
				path: "./dist/TV.snippet",
				template: "./template/quantumultx.handlebars",
			},
			{
				path: "./dist/TV.stoverride",
				template: "./template/stash.handlebars",
			},
			{
				path: "./dist/TV.srmodule",
				template: "./template/shadowrocket.handlebars",
			},
		],
		dts: { isExported: true, path: "./src/interface.ts" },
		boxjsSettings: {
			path: "./template/boxjs.settings.json",
			scope: "@iRingo.TV.Settings",
		},
	},
	args: [
		{
			key: "Switch",
			name: "总功能开关",
			defaultValue: true,
			type: "boolean",
			description: "是否启用此APP修改",
			exclude: ["surge", "loon"],
		},
		{
			key: "ThirdParty",
			name: "启用第三方App与TV app关联功能",
			defaultValue: false,
			type: "boolean",
			description: "是否将桌面版/macOS版/app版等平台的TV app转换至iPad版，以启用第三方App与TV app关联功能(如: Disney+,Prime Video等)。",
		},
		{
			key: "HLSUrl",
			name: "HTTP实时流(HLS)地址",
			defaultValue: "play-edge.itunes.apple.com",
			type: "string",
			description: "因为FPS服务域名禁止MitM，修改此地址可以分离HLS与FPS的域名，从而恢复对DualSubs的双语字幕支持。",
			options: [
				{
					"key": "",
					"label": "OFF(不修改)"
				},
				{
					"key": "play.itunes.apple.com",
					"label": "play.itunes.apple.com (不推荐，与播放服务域名重叠)"
				},
				{
					"key": "play-edge.itunes.apple.com",
					"label": "play-edge.itunes.apple.com (默认)"
				}
			]
		},
		{
			key: "FPSUrl",
			name: "FairPlay流(FPS)地址",
			defaultValue: "play.itunes.apple.com",
			type: "string",
			description: "因为FPS服务域名禁止MitM，修改此地址可以分离HLS与FPS的域名，从而恢复对DualSubs的双语字幕支持。",
			options: [
				{
					"key": "",
					"label": "OFF(不修改)"
				},
				{
					"key": "play.itunes.apple.com",
					"label": "play.itunes.apple.com (默认)"
				},
				{
					"key": "play-edge.itunes.apple.com",
					"label": "play-edge.itunes.apple.com (不推荐，与播放服务域名重叠)"
				}
			]
		},
	],
});
