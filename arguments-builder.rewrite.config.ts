import { defineConfig } from "@iringo/arguments-builder";

const endpoint = {
	key: "endpoint",
	name: "[重写] 服务端点",
	defaultValue: "tvkit.pages.dev",
	type: "string" as const,
	options: [
		{ key: "tvkit.pages.dev", label: "首选；直连；无需代理" },
		{ key: "dev.tvkit.pages.dev", label: "开发版" },
		{ key: "tvkit.nanocat.cloud", label: "Worker 版；需要代理" },
	],
};

export default defineConfig({
	args: [endpoint],
	output: {
		surge: {
			path: "./dist/iRingo.TV.Rewrite.sgmodule",
			template: "./template/surge.rewrite.handlebars",
			transformEgern: {
				enable: true,
				path: "./dist/iRingo.TV.Rewrite.yaml",
			},
		},
		loon: {
			path: "./dist/iRingo.TV.Rewrite.lpx",
			template: "./template/loon.rewrite.handlebars",
		},
		customItems: [
			{
				path: "./dist/iRingo.TV.Rewrite.srmodule",
				template: "./template/shadowrocket.rewrite.handlebars",
			},
			{
				path: "./dist/iRingo.TV.Rewrite.stoverride",
				template: "./template/stash.rewrite.handlebars",
			},
		],
	},
});
