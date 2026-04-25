const webpack = require('webpack');
const path = require('path');

module.exports = {
    style: {
        postcss: {
            plugins: [
                require('tailwindcss'),
                require('autoprefixer'),
            ],
        },
    },
    webpack: {
        configure: (webpackConfig) => {
            // Fix for "fully specified" errors in ESM modules
            webpackConfig.module.rules.push({
                test: /\.m?js/,
                resolve: {
                    fullySpecified: false,
                },
            });

            // Add aliases
            webpackConfig.resolve.alias = {
                ...webpackConfig.resolve.alias,
                'process/browser': 'process/browser.js',
                'process/browser.js': 'process/browser.js',
            };

            // Add fallbacks
            webpackConfig.resolve.fallback = {
                ...webpackConfig.resolve.fallback,
                crypto: require.resolve('crypto-browserify'),
                stream: require.resolve('stream-browserify'),
                buffer: require.resolve('buffer'),
                process: require.resolve('process/browser.js'),
                util: require.resolve('util'),
                vm: require.resolve('vm-browserify'),
            };

            // Add plugins
            webpackConfig.plugins.push(
                new webpack.ProvidePlugin({
                    process: 'process/browser.js',
                    Buffer: ['buffer', 'Buffer'],
                })
            );

            return webpackConfig;
        },
    },
};
