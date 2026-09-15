#!/usr/bin/env bash
# deploy.sh —— 单一数据源部署：
#   rules/custom.yaml  →  generate.js  →  Script.js  →  Clash Verge profiles
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CV_DIR="$HOME/Library/Application Support/io.github.clash-verge-rev.clash-verge-rev"
PROFILES="$CV_DIR/profiles"

[ -d "$PROFILES" ] || { echo "❌ 找不到 Clash Verge profiles 目录: $PROFILES"; exit 1; }

echo "→ 从 rules/custom.yaml 生成 Script.js"
node "$REPO_DIR/scripts/generate.js"

echo "→ 部署到 Clash Verge"
cp "$REPO_DIR/scripts/Script.js" "$PROFILES/Script.js"

echo
echo "✅ 部署完成。"
echo "   在 Clash Verge 里：右键当前订阅 → 重新启用（或点右上角 🔥），使脚本生效。"
