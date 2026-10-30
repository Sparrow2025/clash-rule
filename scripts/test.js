const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = vm.createContext({ console: { log() {} } });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'Script.js'), 'utf8'), context);
const run = (config) => JSON.parse(JSON.stringify(context.main(config, 'test')));
const fixture = () => ({
  proxies: ['日本 A01', '日本 A02', '台湾 A01', '香港 A01', '美国 A01', '日本 限速5M', '日本 官网']
    .map((name) => ({ name, type: 'ss' })),
  'proxy-groups': [{ name: '🔰 手动选择', type: 'select', proxies: ['日本 A01'] }],
  rules: ['DOMAIN,mtalk.google.com,DIRECT', 'GEOIP,CN,DIRECT', 'MATCH,🔰 手动选择'],
  tun: { 'route-exclude-address': ['192.168.0.0/16'] },
});
const result = run(fixture());
const groups = result['proxy-groups'];
assert.deepEqual(groups.find((g) => g.name === '🌏 地区优先').proxies,
  ['🇯🇵 日本自动', '🇹🇼 台湾自动', '🇭🇰 香港自动']);
assert.equal(groups.find((g) => g.name === '🌏 地区优先').type, 'fallback');
assert.deepEqual(groups.find((g) => g.name === '🇯🇵 日本自动').proxies, ['日本 A01', '日本 A02']);
assert.equal(groups[0].proxies[0], '🌏 地区优先');
assert(result.rules.includes('DOMAIN-SUFFIX,github.com,🌏 地区优先'));
assert(!result.rules.some((r) => r.includes('mtalk.google.com')));
assert.equal(result.rules.at(-1), 'MATCH,🔰 手动选择');
assert.deepEqual(result.tun['route-exclude-address'],
  ['192.168.0.0/16', '100.64.0.0/10', 'fd7a:115c:a1e0::/48']);
const partial = fixture();
partial.proxies = [{ name: '香港 A01' }];
assert.deepEqual(run(partial)['proxy-groups'].at(-1).proxies, ['🇭🇰 香港自动']);
const empty = fixture();
empty.proxies = [{ name: '美国 A01' }];
assert.equal(run(empty)['proxy-groups'].length, 1);
assert(run(empty).rules.includes('DOMAIN-SUFFIX,github.com,🔰 手动选择'));
const provider = fixture();
provider.proxies = [];
provider['proxy-providers'] = { airport: { type: 'http' } };
assert.deepEqual(run(provider)['proxy-groups'].find((g) => g.type === 'url-test').use, ['airport']);
const conflict = fixture();
conflict['proxy-groups'].push({ name: '🌏 地区优先', type: 'select' });
assert.throws(() => run(conflict), /自动组名称与订阅重复/);
console.log('All tests passed');
