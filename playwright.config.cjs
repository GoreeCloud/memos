const {defineConfig,devices}=require('@playwright/test');

module.exports=defineConfig({
  testDir:'./browser-tests',
  timeout:30000,
  expect:{timeout:10000},
  retries:0,
  workers:process.env.CI?1:undefined,
  reporter:process.env.CI?'list':'line',
  projects:[
    {name:'chromium',use:{...devices['Desktop Chrome']}},
    {name:'firefox',use:{...devices['Desktop Firefox']}}
  ],
  use:{
    baseURL:'http://127.0.0.1:8767',
    trace:'off',screenshot:'off',video:'off'
  },
  webServer:[
    {
      command:'python3 -m http.server 8767 --bind 127.0.0.1 --directory web',
      url:'http://127.0.0.1:8767/index.html',
      reuseExistingServer:false,
      timeout:30000
    },
    {
      command:'python3 browser-tests/private_fixture_server.py',
      url:'http://127.0.0.1:8768/index.html',
      reuseExistingServer:false,
      timeout:30000
    }
  ]
});
