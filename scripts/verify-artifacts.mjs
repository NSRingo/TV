import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

const mode = process.argv[2];
assert.ok(["dev", "release"].includes(mode), "Usage: npm run verify:artifacts -- dev|release");
const suffix = mode === "dev" ? ".dev" : "";
const files = [`dist/request${suffix}.bundle.js`, `dist/response${suffix}.bundle.js`, ...["sgmodule", "plugin", "snippet", "stoverride"].map(extension => `dist/iRingo.TV${suffix}.${extension}`)];
if (mode === "dev") files.push("dist/iRingo.TV.dev.boxjs.json", "dist/response.lumen.dev.bundle.js");
else files.push("dist/iRingo.TV.srmodule", "dist/iRingo.TV.yaml", "template/boxjs.settings.json", ...["sgmodule", "lpx", "srmodule", "stoverride", "yaml"].map(extension => `dist/iRingo.TV.Rewrite.${extension}`));

for (const file of files) {
	assert.ok(statSync(file).size > 0, `Empty artifact: ${file}`);
	const source = readFileSync(file, "utf8");
	assert.doesNotMatch(source, /\{\{[@#]|NSRingo\/(MapKit|WeatherKit)|tvkit\.(pages\.dev|nanocat\.cloud)/, file);
	if (file.endsWith(".bundle.js")) assert.doesNotMatch(source, /^import\s/m, `Unbundled dependency in ${file}`);
	else if (!file.endsWith(".json") && !file.includes(".Rewrite.")) {
		const prefix = mode === "dev" ? "https://gist.githubusercontent.com/VirgilClyne/fa7b08c6994b555b82b6d22df89f8a31/raw/" : "https://github.com/NSRingo/TV/releases/download/v";
		assert.ok(source.includes(prefix), `Wrong script source in ${file}`);
		assert.ok(source.includes(`request${suffix}.bundle.js`), `Wrong request bundle in ${file}`);
		assert.ok(source.includes(`response${suffix}.bundle.js`), `Wrong response bundle in ${file}`);
	}
	if (file.endsWith(".json")) JSON.parse(source);
	if (file.includes(".Rewrite.")) {
		const normalize = text => text.replace(/^#!date.*\n|^date:.*\n/gm, "");
		assert.equal(normalize(source), normalize(readFileSync(file.replace("dist/", "modules/"), "utf8")), `Rewrite module is out of sync: ${file}`);
	}
}
console.log(`Verified ${files.length} ${mode} artifacts`);
