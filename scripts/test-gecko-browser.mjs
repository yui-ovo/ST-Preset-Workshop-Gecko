process.env.PMM_TEST_GECKO='1';
process.env.PMM_BROWSER_ENGINE='firefox';
await import('./test-shared-favorites-browser.mjs');
