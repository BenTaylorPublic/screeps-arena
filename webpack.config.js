const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');


module.exports = {
    entry: './ts-dist/main.js',
    mode: "production",
    output: {
        pathinfo: true,
        libraryTarget: "commonjs2",
        path: path.resolve(__dirname, 'dist')
    },
    target: "node",
    node: {
        global: true,
        __filename: false,
        __dirname: false,
    },
    optimization: {
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    parse: {},
                    compress: {},
                    mangle: false
                },
                extractComments: true
            }),
        ],
    },
};
