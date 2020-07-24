//Convert CommonJS modules to ES6,
// so they can be included in a Rollup bundle
import commonjs from "rollup-plugin-commonjs";

// Locate modules using the Node resolution algorithm,
// for using third party modules in node_modules
import nodeResolve from "rollup-plugin-node-resolve";

// Serve your rolled up bundle like webpack-dev-server
// without hot reload
import serve from "rollup-plugin-serve";

// this will refresh the browser when detect changes in bundle.
import livereload from "rollup-plugin-livereload";

// custom rollup plugins
import { copy, finalize } from './rollup.plugins';

let config = {
    input: "./src/ui/index.js",
    output: {
        file: "./dist/bundle.js",
        format: "iife"
    },
    plugins: [
        copy({
            targets: {
                "src/ui/img": "dist/img",
                "src/ui/css": "dist/css",
                "src/ui/font": "dist/font",
                "src/ui/index.ejs": "dist/index.html",
                "src/ui/about.ejs": "dist/about.html",
                "src/ui/api.ejs": "dist/api.html",
                "src/ui/terms.ejs": "dist/terms.html",
            }
        }),
        nodeResolve(),
        commonjs({
            include: "node_modules/**"
        })
    ]
};

if (process.env.NODE_ENV == "production") {
    console.log("PRODUCTION MODE!");
    config.output.format = "iife";
    config.plugins.push(finalize());
} else {
    console.log("DEVELOPMENT MODE!");
    config.watch = {
        clearScreen: false,
        include: "src/**"
    };
    config.plugins.push(
        serve({ contentBase: "dist", open: true }),
        livereload({ watch: "dist" })
    );
}

export default config;
