import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ArgumentsBuilder } from "@iringo/arguments-builder";
import full, { args, argsFull } from "../arguments-builder.full.config.ts";
import dev from "../arguments-builder.dev.config.ts";
import release from "../arguments-builder.release.config.ts";
import rewrite from "../arguments-builder.rewrite.config.ts";
import database from "../src/function/database.mjs";

test("release stays compact while full/dev expose database settings", () => {
	assert.deepEqual(
		args.map(arg => arg.key),
		["ThirdParty", "isWorkaroundSSLPinning", "Locale", "Storage", "LogLevel"],
	);
	assert.deepEqual(release.args, args);
	assert.deepEqual(
		dev.args.filter(({ key }) => key !== "LumenKey"),
		argsFull,
	);
	assert.deepEqual(full.args, argsFull);
	assert.deepEqual(argsFull.find(arg => arg.key === "Tabs").defaultValue, database.TV.Settings.Tabs);
	for (const [key, value] of Object.entries(database.TV.Settings.CountryCode)) assert.deepEqual(argsFull.find(arg => arg.key === `CountryCode.${key}`).defaultValue, value);
	assert.equal(argsFull.find(arg => arg.key === "Storage").defaultValue, "PersistentStore");
});

test("language defaults to AUTO across release, full, dev and BoxJs settings", () => {
	assert.equal(database.TV.Settings.Locale, "AUTO");
	for (const config of [release, full, dev]) {
		const locale = config.args.find(({ key }) => key === "Locale");
		assert.equal(locale.defaultValue, "AUTO");
		assert.equal(locale.options[0].key, "AUTO");
	}
	const settings = new ArgumentsBuilder({ args: argsFull }).buildBoxJsSettings("@iRingo.TV.Settings");
	assert.equal(settings.find(({ id }) => id === "@iRingo.TV.Settings.Locale").val, "AUTO");
});

test("Lumen search authentication is optional and exposed in dev settings", () => {
	const argument = dev.args.find(({ key }) => key === "LumenKey");
	assert.equal(argument.type, "string");
	assert.equal(argument.defaultValue, "");
	assert.equal(new ArgumentsBuilder({ args: dev.args }).buildBoxJsSettings("@iRingo.TV.Settings").find(({ id }) => id.endsWith(".LumenKey")).val, "");
	assert.equal(
		full.args.some(({ key }) => key === "LumenKey"),
		false,
	);
	assert.equal(
		release.args.some(({ key }) => key === "LumenKey"),
		false,
	);
});

test("BoxJs keys and defaults are generated from the full parameter set", () => {
	const settings = new ArgumentsBuilder({ args: argsFull }).buildBoxJsSettings("@iRingo.TV.Settings");
	assert.equal(
		settings.some(item => item.id.endsWith(".Storage")),
		false,
	);
	assert.equal(
		settings.every(item => item.id.startsWith("@iRingo.TV.Settings.")),
		true,
	);
	assert.deepEqual(settings.find(item => item.id.endsWith(".Tabs")).val, database.TV.Settings.Tabs);
	assert.deepEqual(settings.find(item => item.id.endsWith(".CountryCode.View")).val, ["SG", "TW"]);
});

test("Rewrite endpoints follow the UTS hostname and preserve TV paths and query strings", () => {
	assert.equal(rewrite.args[0].defaultValue, "uts-api-itunes.pages.dev");
	assert.deepEqual(
		rewrite.args[0].options.map(option => option.key),
		["uts-api-itunes.pages.dev", "dev.uts-api-itunes.pages.dev", "uts-api-itunes.nanocat.cloud"],
	);
	for (const platform of ["surge", "loon", "shadowrocket", "stash"]) {
		const template = readFileSync(new URL(`../template/${platform}.rewrite.handlebars`, import.meta.url), "utf8");
		for (const input of ["https://uts-api.itunes.apple.com/uts/v3/configurations?sf=143470&pfm=ipad", "https://umc-tempo-api.apple.com/v3/channels/scoreboard?sf=143470"]) {
			const rule = template.split("\n").find(line => line.includes(input.includes("umc-tempo") ? "umc-tempo-api\\." : "uts-api\\.") && line.includes("$1"));
			const tokens = rule.trim().replace(/^- /, "").split(" ");
			const pattern = tokens[0];
			if (platform === "loon") assert.equal(tokens[1], "header");
			const target = tokens[platform === "loon" ? 2 : 1];
			const output = input.replace(new RegExp(pattern), target.replace("\\{{{endpoint}}}", "uts-api-itunes.pages.dev"));
			assert.equal(new URL(output).pathname, new URL(input).pathname);
			assert.equal(new URL(output).search, new URL(input).search);
			assert.equal(new URL(output).hostname, "uts-api-itunes.pages.dev");
		}
	}
});
