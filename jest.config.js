/** @type {import('jest').Config} */
const config = {
  rootDir: './',
  // 覆盖率相关设置
  collectCoverage: true,
  // 缓存/产物统一收纳到根 .cache/（见根 .gitignore）
  coverageDirectory: '.cache/coverage',
  cacheDirectory: '.cache/jest',
  // 设为 false 才能正常显示 console.log，见 https://stackoverflow.com/a/53684761
  verbose: false,
  // 完全重置所有 mock 函数，详细说明见 https://github.com/lmk123/blog/issues/114
  clearMocks: true,
  transformIgnorePatterns: [
    // 为了确保 jest 将这些 esm 模块传给 transformer，需要将这些模块“反”排除
    'node_modules/(?!(nanoid|node-fetch|lodash-es|date-fns|data-uri-to-buffer|fetch-blob|formdata-polyfill)/)',
  ],

  // babel 配置内联在此（原根 babel.config.js 仅服务 jest，独立成根级文件易被
  // 其它 babel 使用者误加载；内联后根目录少一个易误解的配置文件）
  transform: {
    '^.+\\.[jt]sx?$': [
      'babel-jest',
      {
        configFile: false,
        babelrc: false,
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          ['@babel/preset-react', { runtime: 'automatic' }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },

  // TS 源码以 ESM 风格书写，相对导入带 .js 后缀（NodeNext 约定），
  // 但 jest 默认解析器不会把 .js 映射回 .ts，这里去掉后缀再交给解析器
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // 设置 monorepo
  projects: [
    {
      displayName: 'packages/options',
      testMatch: ['<rootDir>/packages/options/src/**/*.test.{ts,tsx}'],
    },
    {
      displayName: 'packages/server',
      testMatch: ['<rootDir>/packages/server/src/**/*.test.{ts,tsx}'],
    },
  ],
}

// 虽然 jest 的文档上说 “Jest will copy the root-level configuration options to each individual child configuration during the test run”，
// 但实际使用中发现，下方的配置项需要明确添加后才能生效
const keys = [
  'clearMocks',
  'cacheDirectory',
  'transformIgnorePatterns',
  'moduleNameMapper',
  'transform',
]
config.projects.forEach((p) => {
  keys.forEach((key) => {
    if (p[key] == null && config[key] != null) {
      p[key] = config[key]
    }
  })
})

module.exports = config
