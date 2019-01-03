const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CRX = require('crx-webpack-plugin')
const ZIP = require('zip-webpack-plugin')
const pkg = require('./package')
module.exports = (env, argv) => {
  const dist = path.resolve(__dirname,  argv.mode === 'production' ? 'dist' : 'dev')
  const bundle = path.resolve(__dirname, 'bundle')
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
            {
              loader: 'sass-loader',
              options: {indentedSyntax: true}
            }
          ]
        }
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
  console.log(process.env)
  if (argv.mode === 'production') {
    config.plugins.push(...[
      new ZIP({
        path: bundle,
        filename: `${pkg.name}.zip`
      }),
      new CRX({
        keyFile: path.join(process.env.HOME, `${pkg.name}.pem`),
        contentPath: 'dist',
        outputPath: path.resolve(bundle, 'chrome'),
        name: pkg.name
      })
    ])
  }
  return config
}

