#!/usr/bin/env bash
# deploy.sh —— 把本仓库的规则同步到 Clash Verge profiles 目录
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CV_DIR="$HOME/Library/Application Support/io.github.clash-verge-rev.clash-verge-rev"
PROFILES="$CV_DIR/profiles"

[ -d "$PROFILES" ] || { echo "❌ 找不到 Clash Verge profiles 目录: $PROFILES"; exit 1; }

echo "→ 部署全局 Script.js"
cp "$REPO_DIR/scripts/Script.js" "$PROFILES/Script.js"

echo "→ 部署规则集（备份到 repo 的 rules/）"
mkdir -p "$REPO_DIR/rules"
[ -f "$PROFILES/custom-rules.yaml" ] && cp "$PROFILES/custom-rules.yaml" "$REPO_DIR/rules/custom.yaml.bak" || true

echo
echo "✅ 部署完成。"
echo "   在 Clash Verge 里：右键当前订阅 → 重新启用（或点右上角 🔥），使脚本生效。"
