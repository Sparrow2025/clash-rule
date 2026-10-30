#!/usr/bin/env bash
# deploy.sh —— 单一数据源部署：
#   rules/custom.yaml  →  generate.js  →  Script.js  →  Clash Verge profiles
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
# 可通过 CV_DIR 覆盖；Linux 默认使用 XDG 配置目录。
if [ -z "${CV_DIR:-}" ]; then
  case "$(uname -s)" in
    Darwin) CV_DIR="$HOME/Library/Application Support/io.github.clash-verge-rev.clash-verge-rev" ;;
    Linux) CV_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/io.github.clash-verge-rev.clash-verge-rev" ;;
    *) echo '请设置 CV_DIR 为客户端配置目录，或按 README 手动部署'; exit 1 ;;
  esac
fi
PROFILES="$CV_DIR/profiles"

[ -d "$PROFILES" ] || { echo "❌ 找不到 Clash Verge profiles 目录: $PROFILES"; exit 1; }

echo "→ 从 rules/custom.yaml 生成 Script.js"
node "$REPO_DIR/scripts/generate.js"

echo "→ 部署到 Clash Verge"
if [ -f "$PROFILES/Script.js" ]; then
  BACKUP="$CV_DIR/clash-rule-backups/$(date +%Y%m%d-%H%M%S)-$$"
  mkdir -p "$BACKUP"
  cp "$PROFILES/Script.js" "$BACKUP/Script.js"
  echo "   原脚本备份: $BACKUP/Script.js"
fi
cp "$REPO_DIR/scripts/Script.js" "$PROFILES/Script.js"

echo
echo "✅ 部署完成。"
echo "   在 Clash Verge 里：右键当前订阅 → 重新启用（或点右上角 🔥），使脚本生效。"
