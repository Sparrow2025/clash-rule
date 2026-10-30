// 地区内 url-test，地区间 fallback；只读取订阅节点，不包含订阅凭据。
function installAutoProxy(config) {
  const groups = config['proxy-groups'] || [];
  const originalMain = resolveProxyGroup(config);
  const names = new Set(groups.map((g) => g.name));
  const reserved = [AUTO_PROXY.name, ...AUTO_PROXY.regions.map((r) => r.name)];
  if (reserved.some((name) => names.has(name))) {
    throw new Error('[clash-rule] 自动组名称与订阅重复，请修改 rules/auto-proxy.json');
  }
  const proxies = config.proxies || [];
  const providers = Object.keys(config['proxy-providers'] || {});
  const excluded = new RegExp(AUTO_PROXY.exclude, 'i');
  const generated = [];
  for (const region of AUTO_PROXY.regions) {
    const matcher = new RegExp(region.filter, 'i');
    const members = proxies.map((p) => p.name)
      .filter((name) => matcher.test(name) && !excluded.test(name));
    // provider 内容由内核加载，无法在扩展脚本中提前检查是否为空。
    if (!members.length && !providers.length) continue;
    generated.push({
      name: region.name,
      type: 'url-test',
      proxies: members,
      ...(providers.length ? { use: providers } : {}),
      filter: '(?i)' + region.filter,
      'exclude-filter': '(?i)' + AUTO_PROXY.exclude,
      url: AUTO_PROXY.url,
      interval: AUTO_PROXY.interval,
      timeout: AUTO_PROXY.timeout,
      tolerance: AUTO_PROXY.tolerance,
      lazy: false,
    });
  }
  if (!generated.length) {
    console.log('[clash-rule] 没有匹配的地区节点，保留原订阅策略');
    return originalMain;
  }
  const priority = {
    name: AUTO_PROXY.name,
    type: 'fallback',
    proxies: generated.map((g) => g.name),
    url: AUTO_PROXY.url,
    interval: AUTO_PROXY.interval,
    timeout: AUTO_PROXY.timeout,
    lazy: false,
  };
  // 原订阅规则不改；其主选择组增加一个入口，用户首次需手动选中。
  const mainGroup = groups.find((g) => g.name === originalMain && g.type === 'select');
  if (mainGroup) mainGroup.proxies = [priority.name, ...(mainGroup.proxies || [])];
  config['proxy-groups'] = [...groups, ...generated, priority];
  return priority.name;
}
