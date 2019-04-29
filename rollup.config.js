//Convert CommonJS modules to ES6,
// so they can be included in a Rollup bundle
import commonjs from 'rollup-plugin-commonjs';

// Locate modules using the Node resolution algorithm,
// for using third party modules in node_modules
import nodeResolve from 'rollup-plugin-node-resolve';

// Serve your rolled up bundle like webpack-dev-server
// without hot reload
import serve from 'rollup-plugin-serve';

// this will refresh the browser when detect changes in bundle.
import livereload from 'rollup-plugin-livereload';

// Copy static assets and resources
import copy from 'rollup-plugin-copy';

//Use babel and uglify from source
import { transform } from "@babel/core";
import { minify } from "uglify-js";


let config = {
    input: './src/ui/index.js',
    output: {
        file: './dist/bundle.js',
        format: 'iife'
    },
    plugins: [
        copy({
            targets: {
                'src/ui/index.html': 'dist/index.html',
                'src/ui/img': 'dist/img',
                'src/ui/css': 'dist/css',
                'src/ui/font': 'dist/font',
            }
        }),
        nodeResolve(),
        commonjs({
            include: 'node_modules/**'
        })
    ]
};

function finalize() {
    return {
        name: 'finalize',
        generateBundle: (options, bundle) => {
            for (let key in bundle)
                if (bundle[key].code) {
                    let { code, map } = transform(bundle[key].code, {
                        filename: key,
                        ast: false,
                        code: true,
                        babelrc: false,
                        presets: ['@babel/preset-env']
                    });
                    ({ code, map } = minify(code, {
                        sourceMap: {
                            content: map,
                            url: `${key}.map`
                        }
                    }));
                    bundle[key].code = code;
                    bundle[key].map = map;
                }
        }
    };
}

if (process.env.NODE_ENV !== 'production') {
    console.log('DEVELOPMENT MODE!');
    config.watch = {
        clearScreen: false,
        include: 'src/**'
    };
    config.plugins.push(
        serve({ contentBase: 'dist', open: true }),
        livereload({ watch: 'dist' })
    );
} else {
    console.log('PRODUCTION MODE!');
    config.output.format = 'iife';
    config.plugins.push(finalize());
}

export default config;
