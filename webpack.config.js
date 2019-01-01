const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
module.exports = (env, argv) => {
  const dist = path.resolve(__dirname,  argv.mode === 'production' ? 'dist' : 'dev')
  const filename = 'index.js'
  const sassFiles = [
    './src/assets/sass/style.sass'
  ]
  const styleFilenames = sassFiles.map(file => path.basename(file, '.sass') + '.css')
  return {
    entry: ['./src/index.js', ...sassFiles],
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
            content.content_scripts[0].js = [filename]
            content.content_scripts[0].css = styleFilenames
            return JSON.stringify(content)
          }
        }
      ]),
      new MiniCssExtractPlugin({
        filename: 'style.css'
      })
    ]
  }
}

