// ============================================================
// Clash Verge Rev —— 全局扩展脚本
// 作用：把 rules/*.yaml 里的规则注入任何订阅，并保证组名订阅无关
// ============================================================
// 部署：复制到 Clash Verge profiles/Script.js（全局脚本，对所有订阅生效）
// ============================================================

// ── 内联规则集（deploy.sh 会把 rules/custom.yaml 同步到这里）──
const RULES = {
  prepend: [
    // ── BT / 下载站 ──
    'DOMAIN-SUFFIX,gying.org,PROXY',
    'DOMAIN-SUFFIX,torrentdownloads.pro,PROXY',
    'DOMAIN-SUFFIX,torrentdownload.info,PROXY',
    'DOMAIN-SUFFIX,extratorrent.st,PROXY',
    'DOMAIN-SUFFIX,1337x.to,PROXY',
    'DOMAIN-SUFFIX,iTorrents.org,PROXY',

    // ── 反爬 / 验证码服务 ──
    'DOMAIN-SUFFIX,captcha-delivery.com,PROXY',

    // ── GitHub ──
    'DOMAIN-SUFFIX,github.com,PROXY',

    // ── AI 服务 ──
    'DOMAIN-SUFFIX,openai.com,PROXY',
    'DOMAIN-SUFFIX,chatgpt.com,PROXY',

    // ── Google ──
    'DOMAIN-SUFFIX,google.com,PROXY',
    'DOMAIN-SUFFIX,googleapis.com,PROXY',
  ],
  append: [],
  // delete 只写域名，不写目标组名 → 换订阅也不会失配
  delete: [
    'dl.google.com',
    'mtalk.google.com',
    'googletraveladservices.com',
  ],
};

// ── 标准组名规格：PROXY 组自动适配当前订阅 ──
// 优先复用订阅里已有的「手动选择」类分组，找不到就用第一个 select 组
function resolveProxyGroup(config) {
  const groups = config['proxy-groups'] || [];
  const names = groups.map((g) => g.name);

  // 1. 优先匹配常见的手动选择组名
  const preferred = ['🔰 手动选择', '🚀 节点选择', 'PROXY', '♻️ 自动选择', '选择节点'];
  for (const p of preferred) {
    if (names.includes(p)) return p;
  }

  // 2. 退而求其次：第一个 select 类型且成员最多的组
  let best = null;
  for (const g of groups) {
    if (g.type !== 'select') continue;
    const n = (g.proxies || []).length;
    if (!best || n > (best.proxies || []).length) best = g;
  }
  if (best) return best.name;

  // 3. 兜底：订阅里没有可用组
  return 'PROXY';
}

// ── 主入口 ──
function main(config, profileName) {
  const proxyGroup = resolveProxyGroup(config);

  // 把规则里的 PROXY 占位符换成实际组名
  const subst = (rule) => {
    // 只替换规则最后一段的目标（PROXY / DIRECT / REJECT 为 Mihomo 内置关键字，保持不变）
    const parts = rule.split(',');
    const last = parts[parts.length - 1].trim();
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
      // 取规则里表示域名的部分（DOMAIN/DOMAIN-SUFFIX 的第二段）
      const type = (parts[0] || '').trim().toUpperCase();
      let domain = '';
      if (type === 'DOMAIN' || type === 'DOMAIN-SUFFIX' || type === 'DOMAIN-KEYWORD') {
        domain = (parts[1] || '').trim();
      }
      return !RULES.delete.some((d) => domain === d);
    });
  }

  // 2) 前置 + 后置
  const prepend = RULES.prepend.map(subst);
  const append = RULES.append.map(subst);

  if (config.rules) {
    // append 要插在 MATCH 之前
    const matchIdx = config.rules.findIndex((r) => r.startsWith('MATCH'));
    if (matchIdx >= 0) {
      config.rules.splice(matchIdx, 0, ...append);
    } else {
      config.rules.push(...append);
    }
    config.rules = [...prepend, ...config.rules];
  } else {
    config.rules = [...prepend, ...append, 'MATCH,' + proxyGroup];
  }

  console.log(`[clash-rule] profile=${profileName} proxyGroup=${proxyGroup} prepend=${prepend.length} append=${append.length} delete=${RULES.delete.length}`);
  return config;
}
