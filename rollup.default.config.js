import pkg from './package.json' with { type: "json" };
import json from '@rollup/plugin-json';
import commonjs from "@rollup/plugin-commonjs";
import terser from '@rollup/plugin-terser';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default [
	{
		input: 'src/request.js',
		output: {
			file: 'dist/request.js',
			format: 'es',
			banner: `/* README: https://github.com/NSRingo/TV */\nconsole.log(' iRingo: 📺 TV Request')\nconsole.log('Version: ${pkg.version}')\nconsole.log('${new Date().toLocaleString()}')`,
		},
		plugins: [json(), commonjs(), nodeResolve(), terser()]
	},
	{
		input: 'src/response.js',
		output: {
			file: 'dist/response.js',
			format: 'es',
			banner: `/* README: https://github.com/NSRingo/TV */\nconsole.log(' iRingo: 📺 TV Response')\nconsole.log('Version: ${pkg.version}')\nconsole.log('${new Date().toLocaleString()}')`,
		},
		plugins: [json(), commonjs(), nodeResolve(), terser()]
	}
];
