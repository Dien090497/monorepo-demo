// import * as Repack from '@callstack/repack';
// module.exports = new Repack.plugins.ModuleFederationPlugin({
//     devServer: {
//         historyApiFallback: true,
//         contentBase: './',
//         port: 8082 // <--- Add this line and choose your own port number
//     },
//     name: 'app_cbql',
//     exposes: {
//         'Test': './App',
//     },
//     shared: {
//         'react': {
//             singleton: true,
//             eager: true,
//             requiredVersion: '18.2.0',
//         },
//         'react-native': {
//             singleton: true,
//             eager: true,
//             requiredVersion: '0.72.4',
//         },
//     },
// })


import * as Repack from '@callstack/repack';
import path from 'path';
import TerserPlugin from 'terser-webpack-plugin';
const appDirectory = path.resolve(__dirname, '../../');

export default env => {
    const {
        mode = 'development',
        context = Repack.getDirname(import.meta.url),
        entry = './index.js',
        platform = process.env.PLATFORM,
        minimize = mode === 'production',
        devServer = undefined,
        bundleFilename = undefined,
        sourceMapFilename = undefined,
        assetsPath = undefined,
        reactNativePath = new URL('../../node_modules/react-native', import.meta.url)
            .pathname,
    } = env;
    const dirname = Repack.getDirname(import.meta.url);

    if (!platform) {
        throw new Error('Missing platform');
    }
    // if (devServer) {
    //   devServer.hmr = false;
    // }
    process.env.BABEL_ENV = mode;

    return {
        mode,
        devtool: false,
        context,
        entry: [
            ...Repack.getInitializationEntries(reactNativePath, {
                hmr: devServer && devServer.hmr,
            }),
            entry,
        ],
        resolve: {
            ...Repack.getResolveOptions(platform),
            // alias: {
            //   'react-native': reactNativePath,
            // },
        },
        output: {
            clean: true,
            path: path.join(dirname, 'build/generated', platform),
            filename: 'index.bundle',
            chunkFilename: '[name].chunk.bundle',
            publicPath: Repack.getPublicPath({platform, devServer}),
        },
        optimization: {
            minimize,
            minimizer: [
                new TerserPlugin({
                    test: /\.(js)?bundle(\?.*)?$/i,
                    extractComments: false,
                    terserOptions: {
                        format: {
                            comments: false,
                        },
                    },
                }),
            ],
            chunkIds: 'named',
        },
        module: {
            rules: [
                {
                    test: /\.[jt]sx?$/,
                    include: [
                        path.resolve(appDirectory, 'node_modules/react'),
                        path.resolve(appDirectory, 'node_modules/@react-native'),
                        path.resolve(appDirectory, 'node_modules/@react-native-community'),
                        path.resolve(appDirectory, 'node_modules/metro'),
                        path.resolve(appDirectory, 'node_modules/@callstack/repack'),
                        // /node_modules(.*[/\\])+react/,
                        // /node_modules(.*[/\\])+@react-native/,
                        // /node_modules(.*[/\\])+@react-navigation/,
                        // /node_modules(.*[/\\])+@react-native-community/,
                        // /node_modules(.*[/\\])+@expo/,
                        // /node_modules(.*[/\\])+pretty-format/,
                        // /node_modules(.*[/\\])+metro/,
                        // /node_modules(.*[/\\])+abort-controller/,
                        // /node_modules(.*[/\\])+@callstack\/repack/,
                    ],
                    use: 'babel-loader',
                },
                {
                    test: /\.[jt]sx?$/,
                    exclude: path.resolve(appDirectory, 'node_modules'),
                    use: {
                        loader: 'babel-loader',
                        options: {
                            /** Add React Refresh transform only when HMR is enabled. */
                            plugins:
                                devServer && devServer.hmr
                                    ? ['module:react-refresh/babel']
                                    : undefined,
                        },
                    },
                },
                {
                    test: Repack.getAssetExtensionsRegExp(Repack.ASSET_EXTENSIONS),
                    use: {
                        loader: '@callstack/repack/assets-loader',
                        options: {
                            platform,
                            devServerEnabled: Boolean(devServer),
                            inline: true,
                            scalableAssetExtensions: Repack.SCALABLE_ASSETS,
                        },
                    },
                },
            ],
        },
        plugins: [
            new Repack.RepackPlugin({
                context,
                mode,
                platform,
                devServer,
                output: {
                    bundleFilename,
                    sourceMapFilename,
                    assetsPath,
                },
            }),
            new Repack.plugins.ModuleFederationPlugin({
                name: 'app_cbql',
                exposes: {
                    './App': '.App',
                },
                shared: {
                    'react': {
                        singleton: true,
                        eager: true,
                        requiredVersion: '18.2.0',
                    },
                    'react-native': {
                        singleton: true,
                        eager: true,
                        requiredVersion: '0.72.4',
                    },
                },
            }),
            new Repack.plugins.CodeSigningPlugin({
                enabled: mode === 'production',
                privateKeyPath: path.join('..', '..', 'code-signing.pem'),
                outputPath: path.join('build', 'outputs', platform, 'remotes'),
            }),
        ],
    };
};
