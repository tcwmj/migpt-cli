import fs from 'node:fs'
import path from 'node:path'
import webpack from 'webpack'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import TerserJSPlugin from 'terser-webpack-plugin'
import OptimizeCSSAssetsPlugin from 'css-minimizer-webpack-plugin'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import LiveReloadPlugin from 'webpack-livereload-plugin'

import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 根据参数产出不同的 webpack 配置
 * @param mode {"production"|"development"}
 */
export default function buildWebpackConfig(mode) {
  const IS_PROD = mode === 'production'

  const outputPath = path.join(__dirname, '../dist/')

  const base = {
    mode,
    output: {
      publicPath: '',
      path: outputPath,
      clean: true,
    },
    entry: './src/index.tsx',
    module: {
      rules: [
        {
          test: /\.(woff2|ico|png|jpe?g|eot|svg|ttf|woff)$/i,
          loader: 'file-loader',
          options: {
            name: '[name].[ext]',
          },
        },
        {
          test: /\.s?css$/i,
          oneOf: [
            {
              use: [
                // 官方推荐在 dev 模式时使用 style-loader，在 build 时才用 extract，
                // 但是内容脚本的样式不能注入到宿主页面的 dom 里，所以即使在 dev 模式下也抽离出来
                MiniCssExtractPlugin.loader,
                {
                  loader: 'css-loader',
                  options: {
                    importLoaders: 1,
                    esModule: false,
                  },
                },
                {
                  loader: 'postcss-loader',
                },
                'sass-loader',
              ],
            },
          ],
        },
        {
          test: /\.(tsx?|jsx?|mjs|cjs|js)$/,
          exclude: {
            and: [/node_modules/],
          },
          use: {
            loader: 'babel-loader',
            options: {
              // 指向根 .cache/babel，避免在 packages/gui/node_modules 下生成缓存目录
              cacheDirectory: path.join(__dirname, '../../../.cache/babel'),
            },
          },
        },
      ],
    },
    plugins: [
      new MiniCssExtractPlugin(),
      new HtmlWebpackPlugin({
        filename: 'index.html',
        template: './src/index.html',
      }),
    ],
    resolve: {
      modules: ['node_modules'],
      extensions: ['.tsx', '.ts', '.js'],
    },
    devServer: {
      static: {
        directory: path.join(__dirname, '../public'),
      },
      hot: true,
      open: true,
    },
  }

  const definePluginObj = {
    // 版本号单一来源：取 gui/package.json，避免 UI 多处硬编码导致版本漂移
    __APP_VERSION__: JSON.stringify(
      JSON.parse(
        fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'),
      ).version,
    ),
  }
  if (mode === 'development') {
    base.devtool = 'inline-source-map'
    // 本地开发：webpack --watch 每次重编译后，自动通知已打开的页面刷新，
    // 免去手动 F5 / 硬刷新。仅 dev 模式启用，prod 不受影响。
    base.plugins.push(
      new LiveReloadPlugin({
        port: 35729,
        // 通过 <script> 注入 livereload 客户端，跨端口同源回连 dev 机，单机本地开发无碍
        appendScriptTag: true,
        quiet: false,
      }),
    )
  } else if (IS_PROD) {
    base.devtool = false
    base.optimization = {
      minimizer: [new TerserJSPlugin(), new OptimizeCSSAssetsPlugin()],
    }
  }
  base.plugins.push(new webpack.DefinePlugin(definePluginObj))

  // 构建体积分析按需开启：默认关闭，避免每次 prod 构建都多跑一遍分析拖慢构建；
  // 需要时设 ANALYZE=1 再构建，报告输出到根 .cache/（不入 dist，避免随包发布）
  if (IS_PROD && process.env.ANALYZE) {
    base.plugins.push(
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        reportFilename: path.join(
          __dirname,
          '../../../.cache/webpack-report.html',
        ),
        openAnalyzer: false,
      }),
    )
  }

  return base
}
