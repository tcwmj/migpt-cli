// CSS 副作用导入的类型声明：webpack 经 css-loader/MiniCssExtract 处理，
// tsc（NodeNext）只需知道模块存在即可，不消费任何导出。
declare module '*.css'
declare module 'normalize.css'
