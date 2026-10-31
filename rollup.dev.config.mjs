import { nodeResolve } from "@rollup/plugin-node-resolve";
import pkg from "./package.json" with { type: "json" };

export default ["request", "response", "response.lumen"].map(name => ({
	input: `./src/${name}.dev.js`,
	output: {
		file: `./dist/${name}.dev.bundle.js`,
		format: "es",
		banner: chunk => `console.log('Date: ${new Date().toLocaleString("zh-CN", { timeZone: "PRC" })}');\nconsole.log('Version: ${pkg.version ?? "dev"}');\nconsole.log('${chunk.fileName}');\nconsole.log('${pkg.displayName} β');\n/* ${pkg.homepage} */`,
	},
	plugins: [nodeResolve()],
}));
