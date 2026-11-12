#!/usr/bin/env bash
# 先关闭原有 hycbox，再启动（优先 Docker，失败回退 systemd）
# 用法：bash /opt/hycbox/start.sh
set -euo pipefail

REMOTE_DIR="${HYC_REMOTE_DIR:-/opt/hycbox}"
COMPOSE_DIR="${HYC_COMPOSE_DIR:-${REMOTE_DIR}/ci/hycBoxServer}"
HEALTH_URL="http://127.0.0.1:8080/api/health"

log() { echo "[start] $*"; }

stop_all() {
  log "关闭原有服务..."
  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx hycbox; then
    docker stop hycbox 2>/dev/null || true
    docker rm hycbox 2>/dev/null || true
    log "已停止 docker 容器 hycbox"
  fi
  if systemctl list-unit-files 2>/dev/null | grep -q '^hycbox.service'; then
    systemctl stop hycbox 2>/dev/null || true
    log "已停止 systemd hycbox"
  fi
}

start_docker() {
  if [[ ! -f "${COMPOSE_DIR}/docker-compose.yml" ]]; then
    log "未找到 ${COMPOSE_DIR}/docker-compose.yml"
    return 1
  fi
  if ! docker image inspect hycbox-server:online >/dev/null 2>&1; then
    log "缺少镜像 hycbox-server:online"
    return 1
  fi
  log "启动 docker compose..."
  cd "${COMPOSE_DIR}"
  docker compose -f docker-compose.yml up -d --remove-orphans
  return 0
}

start_systemd() {
  if ! systemctl list-unit-files 2>/dev/null | grep -q '^hycbox.service'; then
    log "无 systemd 单元，无法回退"
    return 1
  fi
  log "启动 systemd hycbox..."
  systemctl start hycbox
  return 0
}

wait_health() {
  log "健康检查 ${HEALTH_URL} ..."
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if curl -sf "${HEALTH_URL}" >/tmp/hyc-health.json 2>/dev/null; then
      cat /tmp/hyc-health.json
      echo
      log "启动成功"
      return 0
    fi
    sleep 2
  done
  log "健康检查未通过"
  return 1
}

main() {
  stop_all
  if start_docker; then
    sleep 3
    docker ps --filter name=hycbox --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}' || true
    wait_health
    # docker 跑通后避免 systemd 抢 8080
    systemctl disable hycbox 2>/dev/null || true
    exit 0
  fi
  if start_systemd; then
    sleep 3
    systemctl is-active hycbox || true
    wait_health
    exit 0
  fi
  log "启动失败：Docker 与 systemd 均不可用"
  exit 1
}

main "$@"
