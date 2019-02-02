const rm = require('rimraf')
const fs = require('fs')
const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const RunAfterBuildPlugin = require('webpack-run-after-build-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const WebExt = require('web-ext')
const CRX = require('crx-webpack-plugin')
const ZIP = require('zip-webpack-plugin')
const pkg = require('./package')
module.exports = (env, argv) => {
  const dist = path.resolve(__dirname,  argv.mode === 'production' ? 'dist' : 'dev')
  const filename = 'index.js'
  let config = {
    entry: ['./src/index.js', './src/assets/sass/style.sass'],
    watch: argv.mode !== 'production',
    devtool: argv.mode === 'production' ? 'none' : 'cheap-module-eval-source-map',
    output: {
      path: dist,
      filename
    },
    watchOptions: {
      ignored: "/node_modules/"
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: [
            'babel-loader',
            'eslint-loader'
          ]
        },
        {
          test: /\.svg$/,
          use: 'svg-inline-loader'
        },
        {
          test: /\.sass$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
            'postcss-loader',
            {
              loader: 'sass-loader',
              options: {indentedSyntax: true}
            }
          ]
        }
      ],
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true,
            },
          },
        }),
      ],
    },
    plugins: [
      new CopyWebpackPlugin([
        {
          from: path.resolve(__dirname, 'src', 'assets', 'icons'),
          to: path.resolve(dist, 'icons'),
          toType: 'dir'
        },
        {
          from: path.resolve(__dirname, 'src', 'manifest.json'),
          transform (content) {
            content = JSON.parse(content.toString())
            content.version = pkg.version
            if (typeof content.content_scripts === "undefined") content.content_scripts = [{}]
            content.content_scripts[0].js = [filename]
            content.content_scripts[0].css = ['style.css']
            return JSON.stringify(content)
          }
        }
      ]),
      new MiniCssExtractPlugin({
        filename: 'style.css'
      })
    ]
  }
  if (argv.mode === 'production') {
    const keyDir = path.resolve(process.env.HOME, "Keys")
    const keyFile = path.resolve(keyDir, `${pkg.name}.pem`)
    const apiFile = path.resolve(keyDir, `${pkg.name}-mozilla.json`)
    if (!fs.existsSync(keyFile) || !fs.existsSync(apiFile)) throw new Error("Keyfiles not found!")
    const bundle = path.resolve(__dirname, 'bundle')
    if (!fs.existsSync(bundle))
      fs.mkdirSync(bundle)
    else
      for (const file of fs.readdirSync(bundle)) rm.sync(path.resolve(bundle, file))
    config.plugins.push(...[
      new RunAfterBuildPlugin(() => {
        WebExt.default.cmd.sign({
          sourceDir: dist,
          artifactsDir: bundle,
          ...require(apiFile)
        }, {shouldExitProgram: false})
      }),
      new ZIP({
        path: bundle,
        filename: `${pkg.name}.zip`
      }),
      new CRX({
        keyFile: keyFile,
        contentPath: 'dist',
        outputPath: bundle,
        name: pkg.name
      })
    ])
  }
  return config
}

