import { defineConfig } from "@iringo/arguments-builder";
import { argsFull } from "./arguments-builder.full.config.ts";

export default defineConfig({
	output: {
		dts: { isExported: true, path: "./src/types.d.ts" },
		surge: {
			path: "./dist/iRingo.TV.dev.sgmodule",
			template: "./template/surge.dev.handlebars",
		},
		loon: {
			path: "./dist/iRingo.TV.dev.plugin",
			template: "./template/loon.dev.handlebars",
		},
		customItems: [
			{
				path: "./dist/iRingo.TV.dev.snippet",
				template: "./template/quantumultx.dev.handlebars",
			},
			{
				path: "./dist/iRingo.TV.dev.stoverride",
				template: "./template/stash.dev.handlebars",
			},
		],
		boxjsSettings: {
			path: "./dist/iRingo.TV.dev.boxjs.json",
			scope: "@iRingo.TV.Settings",
		},
	},
	args: [
		...argsFull,
		{
			key: "LumenKey",
			name: "[Lumen] 搜索鉴权 X-Lumen-Key",
			type: "string",
			defaultValue: "",
			exclude: ["boxjs"],
			description: "可选，填写 Lumen 官方模块中 X-Lumen-Key 的值；留空时跳过搜索中的 Lumen 频道入口与影视结果。仅通过 argument 提供。",
		},
	],
});
