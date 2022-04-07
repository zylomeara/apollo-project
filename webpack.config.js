const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
	devtool: 'source-map',
	mode: 'development',
	entry: './src/index.tsx',
	output: {
		filename: 'main.js',
		path: path.resolve(__dirname, 'dist'),
		clean: true,
		publicPath: "/"
	},
	devServer: {
		hot: true,
		port: 3000,
		proxy: {
			'/graphql': {
				target: process.env.URL_PROJECT,
				pathRewrite: {'/graphql': ''},
				secure: false,
				changeOrigin: true,
			},
		},
	},
	plugins: [
		new webpack.EnvironmentPlugin(['URL_PROJECT']),
		new HtmlWebpackPlugin({
			template: path.resolve(__dirname, "public/index.html"),
		}),
	],
	resolve: {
		extensions: ['.ts', '.tsx', '.js', '.jsx', '.css']
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
			{
				test: /\.(png|jpe?g|gif)$/i,
				use: [
					{
						loader: 'file-loader',
						options: {
							name: 'img/[name].[ext]'
						}
					},
				],
			},
			{
				test: /\.css$/,
				use: [
					{loader: "style-loader"},
					{loader: "css-loader"}
				]
			}
		]
	}
};
