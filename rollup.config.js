import fs from 'fs-extra';

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

//Use babel and uglify from source
import { transform } from "@babel/core";
import { minify } from "uglify-js";


function isObject(val) {
    return (
        val != null && typeof val === "object" && Array.isArray(val) === false
    );
}

function isObjectObject(o) {
    return (
        isObject(o) === true &&
        Object.prototype.toString.call(o) === "[object Object]"
    );
}

function isPlainObject(o) {
    var ctor, prot;

    if (isObjectObject(o) === false) return false;

    // If has modified constructor
    ctor = o.constructor;
    if (typeof ctor !== "function") return false;

    // If has modified prototype
    prot = ctor.prototype;
    if (isObjectObject(prot) === false) return false;

    // If constructor does not have an Object-specific method
    if (prot.hasOwnProperty("isPrototypeOf") === false) {
        return false;
    }

    // Most likely a plain Object
    return true;
}

function copy(options = {}) {
    const {
        outputFolder,
        targets = [],
        verbose = false,
        warnOnNonExist = false,
        ...rest
    } = options;

    function processArrayOfTargets(targets, outputFolder) {
        return targets.map(target => ({
            from: target,
            to: path.join(outputFolder, path.basename(target))
        }));
    }

    function processObjectOfTargets(targets) {
        return Object.entries(targets).reduce(
            (processedTargets, [from, to]) => 
                Array.isArray(to)
                    ? [
                          ...processedTargets,
                          ...to.map(target => ({ from, to: target }))
                      ]
                    : [...processedTargets, { from, to }],
            []
        );
    }

    let processedTargets = [];

    if (Array.isArray(targets) && targets.length) {
        if (!outputFolder) {
            this.error(
                "'outputFolder' is not set. It is required if 'targets' is an array"
            );
        }

        processedTargets = processArrayOfTargets(targets, outputFolder);
    }

    if (isObject(targets) && Object.entries(targets).length) {
        processedTargets = processObjectOfTargets(targets);
    }

    return {
        name: 'copy',
        async buildStart() {
            const addWatchFilesRecursive = (path) => {
                if(fs.lstatSync(path).isDirectory()) {
                    for(let subPath of fs.readdirSync(path))
                        this.addWatchFile(`${path}/${subPath}`);
                    return;
                }
                this.addWatchFile(path);
            };
            for (const { from } of processedTargets)
                addWatchFilesRecursive(`${__dirname}/${from}`);
        },
        async buildEnd() {
            if (processedTargets.length) {
                if (verbose) {
                    console.log('Copied files and folders:');
                }

                // eslint-disable-next-line no-restricted-syntax
                for (const { from, to } of processedTargets) {
                    try {
                        // eslint-disable-next-line no-await-in-loop
                        await fs.copy(from, to, rest);

                        if (verbose) {
                            console.log(chalk.green(`${from} -> ${to}`));
                        }
                    } catch (e) {
                        if (e.code === 'ENOENT') {
                            if (verbose) {
                                console.log(
                                    chalk.red(
                                        `${from} -> ${to} (no such file or folder: ${
                                            e.path
                                        })`
                                    )
                                );
                            }

                            if (warnOnNonExist) {
                                this.warn(e);
                            }
                        } else {
                            this.error(e);
                        }
                    }
                }
            }
        }
    };
}

function finalize() {
    return {
        name: "finalize",
        generateBundle: (options, bundle) => {
            for (let key in bundle)
                if (bundle[key].code) {
                    let { code, map } = transform(bundle[key].code, {
                        filename: key,
                        ast: false,
                        code: true,
                        babelrc: false,
                        presets: ["@babel/preset-env"]
                    });
                    ({ code, map } = minify(code, {
                        sourceMap: {
                            content: map,
                            url: `${key}.map`
                        }
                    }));
                    bundle[key].code = code.replace(
                        /http:\/\/api\.targoman.com\/v9\.1/g,
                        "http://targoman.ir/API/"
                    );
                    bundle[key].map = map;
                }
        }
    };
}

let config = {
    input: "./src/ui/index.js",
    output: {
        file: "./dist/bundle.js",
        format: "iife"
    },
    plugins: [
        copy({
            targets: {
                "src/ui/index.html": "dist/index.html",
                "src/ui/img": "dist/img",
                "src/ui/css": "dist/css",
                "src/ui/font": "dist/font"
            }
        }),
        nodeResolve(),
        commonjs({
            include: "node_modules/**"
        })
    ]
};

if (process.env.NODE_ENV !== "production") {
    console.log("DEVELOPMENT MODE!");
    config.watch = {
        clearScreen: false,
        include: "src/**"
    };
    config.plugins.push(
        serve({ contentBase: "dist", open: true }),
        livereload({ watch: "dist" })
    );
} else {
    console.log("PRODUCTION MODE!");
    config.output.format = "iife";
    config.plugins.push(finalize());
}

export default config;
