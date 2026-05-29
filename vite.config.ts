test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/test/setup.ts',
  exclude: ['**/node_modules/**', '**/dist/**', '**/functions/**', '**/.{idea,git,cache,output,temp}/**'],
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html'],
    exclude: [
      'node_modules/',
      'src/test/',
      '**/*.d.ts',
      '**/*.config.*',
      'functions/**',
    ],
  },
},