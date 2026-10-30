import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import pkg from "./package.json" with { type: "json" };

export default ["request", "response"].map(name => ({
	input: `./src/${name}.js`,
	output: {
		file: `./dist/${name}.bundle.js`,
		format: "es",
		banner: chunk => `console.log('Date: ${new Date().toLocaleString("zh-CN", { timeZone: "PRC" })}');\nconsole.log('Version: ${pkg.version ?? "dev"}');\nconsole.log('${chunk.fileName}');\nconsole.log('${pkg.displayName}');\n/* ${pkg.homepage} */`,
	},
	plugins: [nodeResolve(), terser()],
}));
