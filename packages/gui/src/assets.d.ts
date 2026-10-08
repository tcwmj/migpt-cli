declare module '*.jpg' {
  const src: string
  export default src
}

// 构建期由 webpack DefinePlugin 注入（来源 packages/gui/package.json 的 version）
declare const __APP_VERSION__: string
