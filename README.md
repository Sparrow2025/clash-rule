# clash-rule

个人 Clash Verge Rev 规则集 —— **订阅无关**，换机场不用改。

## 架构

```
clash-rule/
├── rules/            # 规则集（YAML，按分类组织）
├── scripts/          # 全局扩展脚本（注入规则 + 建标准组）
└── docs/             # 说明
```

## 三层扩展机制（Clash Verge Rev）

| 层级 | 文件 | 作用范围 |
|---|---|---|
| **全局** | `Merge.yaml` + `Script.js` | 所有 profile ✅ |
| 链式 | `<uid>.yaml` | 绑定某订阅 |
| 自身 | `<uid>.yaml` | 绑定某订阅 |

**本仓库使用「全局 Script.js」**——它是唯一支持 `prepend` + `append` + `delete` 三种操作的订阅无关机制。

## 快速部署

```bash
./scripts/deploy.sh
```

把 `rules/*.yaml` 和 `scripts/Script.js` 同步到 Clash Verge 的 profiles 目录。

## 设计原则

1. **规则只写标准组名**：`PROXY` / `DIRECT` / `REJECT`（Mihomo 内置别名），不写机场私有组名
2. **规则集纯数据**：YAML 描述「什么域名怎么走」，脚本负责注入实现
3. **可版本化**：每次改动 git commit，可回滚

## 验证

部署后在 Clash Verge 里重新启用订阅，然后：

```bash
# 看脚本是否执行
tail -20 ~/Library/Application\ Support/io.github.clash-verge-rev.clash-verge-rev/logs/*.log | grep clash-rule

# 看生效规则（前 15 条应含你的规则）
python3 -c "
import yaml,os
p=os.path.expanduser('~/Library/Application Support/io.github.clash-verge-rev.clash-verge-rev/clash-verge.yaml')
d=yaml.safe_load(open(p))
[print(' ',r) for r in d.get('rules',[])[:15]]
"
```

## 改规则流程

1. 改 `rules/custom.yaml`
2. 同步到 `scripts/Script.js` 里的 `RULES` 常量（或跑 `deploy.sh`）
3. `git commit && git push`
4. Clash Verge 里重新启用订阅
