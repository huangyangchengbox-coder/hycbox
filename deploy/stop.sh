#!/usr/bin/env bash
# 关闭 hycbox（Docker 容器 + systemd）
# 用法：bash /opt/hycbox/stop.sh
set -euo pipefail

log() { echo "[stop] $*"; }

log "关闭原有服务..."
if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx hycbox; then
  docker stop hycbox 2>/dev/null || true
  docker rm hycbox 2>/dev/null || true
  log "已停止 docker 容器 hycbox"
else
  log "无 docker 容器 hycbox"
fi

if systemctl list-unit-files 2>/dev/null | grep -q '^hycbox.service'; then
  systemctl stop hycbox 2>/dev/null || true
  log "已停止 systemd hycbox"
else
  log "无 systemd 单元 hycbox"
fi

log "完成"
