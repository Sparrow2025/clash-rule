# clash-rule

个人 Clash Verge Rev 全局扩展：订阅无关的地区自动切换与自定义分流。
**仓库不保存订阅链接、节点凭据或完整客户端配置。**

## 自动策略

- **日本 → 台湾 → 香港**，地区之间使用 `fallback`，按优先级选择可用地区，恢复后优先回到靠前地区。
- 地区内部使用 `url-test` 选低延迟节点，检测间隔 180 秒，切换容差 50ms。
- 地区依据节点名称匹配，不是出口 IP 定位。无匹配节点的地区会跳过。
- 排除官网、套餐等提示项及标注“限速 5M”的节点。
- 测的是 HTTP 可达性/响应延迟，不是下载带宽，也不保证 AI、流媒体解锁。
- 检测与切换并非即时；已有连接不会无缝迁移，可能需要重连。

### 首次使用（重要）

部署后在 Clash Verge Rev 重新启用当前订阅，使全局脚本重新执行。
在代理页面将原来的主选择组（例如 **🔰 手动选择**）切换为 **🌏 地区优先**。
客户端会记住原有选择，脚本不会强制覆盖这个选择。

自定义规则中的 `PROXY` 占位符由脚本映射到“🌏 地区优先”；
`PROXY` 不是 Mihomo 内置出站，`DIRECT` / `REJECT` 才是。
原订阅规则与其他业务策略组保留，若业务组手选了某个具体节点，请改为跟随主选择组。

## 换电脑 / 部署

1. 安装 Clash Verge Rev，导入自己的订阅；安装 Git 和 Node.js。
2. 克隆仓库：
   ```bash
   git clone git@github.com:Sparrow2025/clash-rule.git
   cd clash-rule
   ```
   新电脑需要配置 GitHub SSH 密钥；公开仓库也可通过 HTTPS 克隆。
3. macOS / Linux：
   ```bash
   bash scripts/deploy.sh
   ```
   脚本会生成全局 `Script.js`，备份原脚本，再部署。备份在客户端配置目录的
   `clash-rule-backups/` 下，不会提交到 Git。可设置 `CV_DIR` 指定配置目录：
   ```bash
   CV_DIR="/path/to/client/config" bash scripts/deploy.sh
   ```
   Linux 默认尝试 `$XDG_CONFIG_HOME/io.github.clash-verge-rev.clash-verge-rev`
   （未设置 XDG 时用 `~/.config`）。不同安装方式请以客户端“打开配置目录”为准。
4. Windows：执行 `node scripts/generate.js`，在客户端打开配置目录，
   备份 `profiles/Script.js`，将仓库的 `scripts/Script.js` 复制到该位置。
5. 重新启用订阅，并按“首次使用”选择“🌏 地区优先”。如果看不到组，检查全局扩展脚本是否启用。

**不要复制整份客户端配置到仓库。** 换电脑仅同步策略，订阅单独导入；
每台电脑首次需要自行选中“🌏 地区优先”。

## 文件与维护

| 文件 | 作用 |
|---|---|
| `rules/auto-proxy.json` | 地区优先级、名称匹配、检测间隔和排除条件 |
| `rules/custom.yaml` | 自定义分流数据，保留已有规则 |
| `scripts/auto-proxy.template.js` | 自动组生成逻辑 |
| `scripts/generate.js` | 生成独立的全局脚本，不依赖客户端加载外部文件 |
| `scripts/Script.js` | 生成产物，不手工修改 |

`custom.yaml` 仅支持简单的 prepend/append/delete 字符串列表，不是通用 YAML 解析器。
`delete` 按 DOMAIN / DOMAIN-SUFFIX / DOMAIN-KEYWORD 的域名字段精确匹配。
已有 Google 直连规则沿用原仓库设置，不保证任何网络均可直连，可按需修改。
全局脚本保留本机原有 Tailscale 网段 TUN 绕行设置，并合并其他已有排除项。

```bash
# 修改规则后
node scripts/generate.js
node scripts/test.js
bash scripts/deploy.sh
# 客户端重新启用订阅

git add rules scripts README.md
git commit -m "Update proxy policy"
git push
```

其他电脑更新：`git pull --ff-only`，然后重新部署、重新启用订阅。
Git 更新不会自动修改正在运行的客户端。

回滚：从备份还原 `profiles/Script.js` 并重新启用订阅；
或在 Git 中恢复旧版本后重新生成、部署。

## 注意事项

- 使用全局 Script.js，对全部订阅生效；已有其他全局脚本逻辑应先合并，避免被覆盖。
- 支持静态节点和 `proxy-providers`。provider 的节点在运行时加载，无法提前跳过空地区，
  更换订阅后请检查地区组是否有匹配节点。
- 自动组名与订阅组名冲突时脚本报错，应在 JSON 中改名。
- 不更改系统代理、TUN 开关或管理员权限。
