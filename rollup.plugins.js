import fs from "fs-extra";
import path from "path";
import ejs from 'ejs';
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

export function copy(options = {}) {
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
        name: "copy",
        async buildStart() {
            const addWatchFilesRecursive = path => {
                if (fs.lstatSync(path).isDirectory()) {
                    for (let subPath of fs.readdirSync(path))
                        this.addWatchFile(`${path}/${subPath}`);
                    return;
                }
                this.addWatchFile(path);
                if(path.endsWith('.ejs'))
                    this.addWatchFile(`${path}.json`);
            };
            for (const { from } of processedTargets)
                addWatchFilesRecursive(`${__dirname}/${from}`);
        },
        async buildEnd() {
            if (processedTargets.length) {
                if (verbose) {
                    console.log("Copied files and folders:");
                }

                // eslint-disable-next-line no-restricted-syntax
                for (const { from, to } of processedTargets) {
                    try {
                        // eslint-disable-next-line no-await-in-loop
                        if(from.endsWith('.ejs')) {
                            console.log(`Rendering template ${from} -> ${to}`);
                            fs.mkdirpSync(path.dirname(to));
                            let context = JSON.parse(fs.readFileSync(`${from}.json`, { encoding: 'utf8'}));
                            let template = fs.readFileSync(from, { encoding: 'utf8'});
                            fs.writeFileSync(to, ejs.render(template, context, { filename: from}), { encoding: 'utf8'});
                        } else
                            await fs.copy(from, to, rest);

                        if (verbose)
                            console.log(chalk.green(`${from} -> ${to}`));
                    } catch (e) {
                        if (e.code === "ENOENT") {
                            if (verbose)
                                console.log(
                                    chalk.red(
                                        `${from} -> ${to} (no such file or folder: ${
                                            e.path
                                        })`
                                    )
                                );

                            if (warnOnNonExist) this.warn(e);
                        } else this.error(e);
                    }
                }
            }
        }
    };
}

export function finalize() {
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
                        /http:\/\/targoman.test\/TestAPI/g,
                        "https://targoman.ir/API"
                    );
                    bundle[key].map = map;
                }
        }
    };
}
