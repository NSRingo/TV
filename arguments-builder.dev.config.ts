import { defineConfig } from "@iringo/arguments-builder";
import { argsFull } from "./arguments-builder.full.config.ts";

export default defineConfig({
	output: {
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
	args: argsFull,
});
