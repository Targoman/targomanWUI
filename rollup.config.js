// this is the rollup plugin that adds babel as a compilation stage.
import babel from 'rollup-plugin-babel';

//Convert CommonJS modules to ES6,
// so they can be included in a Rollup bundle
import commonjs from 'rollup-plugin-commonjs';

// Locate modules using the Node resolution algorithm,
// for using third party modules in node_modules
import nodeResolve from 'rollup-plugin-node-resolve';

// Rollup plugin to minify generated bundle.
import uglify from 'rollup-plugin-uglify';

// Serve your rolled up bundle like webpack-dev-server
// without hot reload
import serve from 'rollup-plugin-serve';

// this will refresh the browser when detect changes in bundle.
import livereload from 'rollup-plugin-livereload';

// Copy static assets and resources
import copy from 'rollup-plugin-copy';

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
        babel({
            exclude: 'node_modules/**'
        }),
        nodeResolve(),
        commonjs({
            include: 'node_modules/**'
        })
    ]
};

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
    config.plugins.push(
        uglify({
            compress: {
                screw_ie8: true,
                warnings: false
            },
            output: {
                comments: false
            },
            sourceMap: false
        })
    );
}

export default config;
