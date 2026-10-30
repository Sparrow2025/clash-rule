// ============================================================
// ⚠️ 本文件由 scripts/generate.js 自动生成，请勿手改
// 数据源：rules/custom.yaml + rules/auto-proxy.json
// 生成命令：node scripts/generate.js
// ============================================================

const AUTO_PROXY = {
  "name": "🌏 地区优先",
  "url": "https://www.gstatic.com/generate_204",
  "interval": 180,
  "timeout": 5000,
  "tolerance": 50,
  "exclude": "官网|剩余|到期|套餐|流量|限速\\s*5\\s*M",
  "regions": [
    {
      "name": "🇯🇵 日本自动",
      "filter": "日本|东京|大阪|🇯🇵|Japan|\\bJP\\b"
    },
    {
      "name": "🇹🇼 台湾自动",
      "filter": "台湾|台灣|台北|🇹🇼|Taiwan|\\bTW\\b"
    },
    {
      "name": "🇭🇰 香港自动",
      "filter": "香港|🇭🇰|Hong Kong|\\bHK\\b"
    }
  ]
};
const RULES = {
  prepend: [
    "DOMAIN,clash-rule-active.local,DIRECT",
    "DOMAIN-SUFFIX,gying.org,PROXY",
    "DOMAIN-SUFFIX,torrentdownloads.pro,PROXY",
    "DOMAIN-SUFFIX,torrentdownload.info,PROXY",
    "DOMAIN-SUFFIX,extratorrent.st,PROXY",
    "DOMAIN-SUFFIX,1337x.to,PROXY",
    "DOMAIN-SUFFIX,iTorrents.org,PROXY",
    "DOMAIN-SUFFIX,captcha-delivery.com,PROXY",
    "DOMAIN-SUFFIX,github.com,PROXY",
    "DOMAIN-SUFFIX,openai.com,PROXY",
    "DOMAIN-SUFFIX,chatgpt.com,PROXY",
    "DOMAIN-SUFFIX,fonts.googleapis.com,DIRECT",
    "DOMAIN-SUFFIX,fonts.gstatic.com,DIRECT",
    "DOMAIN-SUFFIX,dl.google.com,DIRECT",
    "DOMAIN-SUFFIX,update.googleapis.com,DIRECT",
    "DOMAIN-SUFFIX,clientservices.googleapis.com,DIRECT",
    "DOMAIN-SUFFIX,connectivitycheck.gstatic.com,DIRECT",
    "DOMAIN-SUFFIX,appspot.com,DIRECT",
    "DOMAIN-SUFFIX,google.com,PROXY",
    "DOMAIN-SUFFIX,googleapis.com,PROXY",
    "DOMAIN-SUFFIX,gstatic.com,PROXY",
    "DOMAIN-SUFFIX,googlevideo.com,PROXY",
    "DOMAIN-SUFFIX,withgoogle.com,PROXY",
  ],
  append: [],
  delete: [
    "mtalk.google.com",
    "googletraveladservices.com",
  ],
};

// ── 标准组名解析：把规则里的 PROXY 占位符映射到订阅实际组名 ──
function resolveProxyGroup(config) {
  const groups = config['proxy-groups'] || [];
  const names = groups.map((g) => g.name);
  const preferred = [
    '🔰 手动选择', '🚀 节点选择', 'PROXY',
    '♻️ 自动选择', '选择节点', '节点选择',
  ];
  for (const p of preferred) if (names.includes(p)) return p;
  let best = null;
  for (const g of groups) {
    if (g.type !== 'select') continue;
    if (!best || (g.proxies || []).length > (best.proxies || []).length) best = g;
  }
  return best ? best.name : 'PROXY';
}

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

// ── 主入口 ──
function main(config, profileName) {
  const proxyGroup = installAutoProxy(config);
  const subst = (rule) => {
    const parts = rule.split(',');
    const last = parts[parts.length - 1].trim();
    // 只翻译 PROXY 占位符；DIRECT/REJECT 是 Mihomo 内置关键字，原样保留
    if (last === 'PROXY') {
      parts[parts.length - 1] = proxyGroup;
      return parts.join(',');
    }
    return rule;
  };

  // 1) 删除订阅中的指定规则（按域名模糊匹配，忽略目标组名差异）
  if (config.rules && RULES.delete.length) {
    config.rules = config.rules.filter((r) => {
      const parts = r.split(',');
      const type = (parts[0] || '').trim().toUpperCase();
      let domain = '';
      if (type === 'DOMAIN' || type === 'DOMAIN-SUFFIX' || type === 'DOMAIN-KEYWORD') {
        domain = (parts[1] || '').trim();
      }
      return !RULES.delete.some((d) => domain === d);
    });
  }

  // 2) 前置 + 后置（后置要插在 MATCH 之前）
  const prepend = RULES.prepend.map(subst);
  const append = RULES.append.map(subst);
  if (config.rules) {
    const idx = config.rules.findIndex((r) => r.startsWith('MATCH'));
    if (idx >= 0) config.rules.splice(idx, 0, ...append);
    else config.rules.push(...append);
    config.rules = [...prepend, ...config.rules];
  } else {
    config.rules = [...prepend, ...append, 'MATCH,' + proxyGroup];
  }

  // 保留现有本机脚本的 Tailscale TUN 绕行设置。
  config.tun = config.tun || {};
  config.tun['route-exclude-address'] = Array.from(new Set([
    ...(config.tun['route-exclude-address'] || []),
    '100.64.0.0/10', 'fd7a:115c:a1e0::/48',
  ]));
  console.log(`[clash-rule] profile=${profileName} proxyGroup=${proxyGroup} prepend=${prepend.length} append=${append.length} delete=${RULES.delete.length}`);
  return config;
}
