const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const webpack = require('webpack');
const createTestCafe = require('testcafe');

async function main() {
  const output = path.resolve(__dirname, '../node_modules/.cache/nepal-calendar-preview');
  fs.mkdirSync(output, { recursive: true });
  const compiler = webpack({
    mode: 'development', context: path.resolve(__dirname, '..'), entry: './tests/fixtures/nepal-calendar.tsx',
    output: { path: output, filename: 'preview.js' }, devtool: false,
    resolve: { extensions: ['.tsx', '.ts', '.js'] },
    plugins: [new webpack.DefinePlugin({ __TMS_API_BASE_URL__: JSON.stringify('http://localhost:5187/api') })],
    module: { rules: [
      { test: /\.tsx?$/, exclude: /node_modules/, use: { loader: 'ts-loader', options: { transpileOnly: true, configFile: 'tsconfig.app.json' } } },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ] },
  });
  await new Promise((resolve, reject) => compiler.run((error, stats) => { compiler.close(() => {}); if (error || stats.hasErrors()) reject(error || new Error(stats.toString())); else resolve(); }));
  console.log('Calendar fixture compiled. Starting local server.');
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script>window.__clockTime=Date.parse('2026-09-05T03:15:00Z');Date.now=()=>window.__clockTime;</script><script src="/preview.js"></script></body></html>`;
  const server = http.createServer((req, res) => { if (req.url === '/preview.js') { res.setHeader('Content-Type', 'text/javascript'); fs.createReadStream(path.join(output, 'preview.js')).pipe(res); } else { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); } });
  await new Promise((resolve) => server.listen(5187, '127.0.0.1', resolve));
  console.log('Calendar fixture listening on port 5187. Starting TestCafe.');
  let cafe;
  let failures = 0;
  try {
    cafe = await createTestCafe('127.0.0.1', 5188, 5189);
    const browser = process.argv[2] || 'edge:headless';
    console.log(`Launching ${browser}.`);
    failures = await cafe.createRunner().src(path.join(__dirname, 'nepal-calendar-browser.js')).browsers(browser).screenshots({ path: path.join(output, 'screenshots'), takeOnFails: true }).run();
  } finally { if (cafe) await cafe.close(); server.close(); }
  process.exitCode = failures ? 1 : 0;
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
