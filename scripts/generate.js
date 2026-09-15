#!/usr/bin/env node
// generate.js —— 由 rules/custom.yaml 生成完整 Script.js
// 单一数据源：只改 YAML，脚本自动生成
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const YAML_FILE = path.join(REPO, 'rules', 'custom.yaml');
const OUT_FILE = path.join(REPO, 'scripts', 'Script.js');

// ── 极简 YAML 读取（只支持本文件用到的结构）──
function parseRulesYaml(text) {
  const out = { prepend: [], append: [], delete: [] };
  let section = null;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line || line.trimStart().startsWith('#')) continue;
    const m = line.match(/^(prepend|append|delete):\s*$/);
    if (m) { section = m[1]; continue; }
    if (section) {
      const item = line.match(/^\s*-\s*['"]?(.*?)['"]?\s*$/);
      if (item) out[section].push(item[1]);
    }
  }
  return out;
}

// ── 模板 ──
const HEADER = `// ============================================================
// ⚠️ 本文件由 scripts/generate.js 自动生成，请勿手改
// 单一数据源：rules/custom.yaml
// 生成命令：node scripts/generate.js
// ============================================================
`;

function jsArray(name, arr) {
  if (!arr.length) return `  ${name}: [],`;
  const lines = arr.map((r) => `    ${JSON.stringify(r)},`);
  return `  ${name}: [\n${lines.join('\n')}\n  ],`;
}

function main() {
  const rules = parseRulesYaml(fs.readFileSync(YAML_FILE, 'utf8'));

  const script = `${HEADER}
const RULES = {
${jsArray('prepend', rules.prepend)}
${jsArray('append', rules.append)}
${jsArray('delete', rules.delete)}
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

// ── 主入口 ──
function main(config, profileName) {
  const proxyGroup = resolveProxyGroup(config);
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

  console.log(\`[clash-rule] profile=\${profileName} proxyGroup=\${proxyGroup} prepend=\${prepend.length} append=\${append.length} delete=\${RULES.delete.length}\`);
  return config;
}
`;

  fs.writeFileSync(OUT_FILE, script);
  console.log(`✅ 已生成 ${OUT_FILE}`);
  console.log(`   prepend=${rules.prepend.length} append=${rules.append.length} delete=${rules.delete.length}`);
}

main();
