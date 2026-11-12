#!/usr/bin/env bash
# Gitea online：Docker 内 Maven 构建 + JRE 镜像发布（不依赖宿主机 JDK）
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_DIR="${HYC_REMOTE_DIR:-/opt/hycbox}"
IMAGE="hycbox-server:online"
JAR_NAME="hyc-box-server-1.0.0.jar"
MAVEN_IMAGE="${HYC_MAVEN_IMAGE:-maven:3.9.9-eclipse-temurin-17}"

cd "${ROOT_DIR}"

echo "[ci-deploy] workspace=${ROOT_DIR}"
echo "[ci-deploy] docker=$(docker -v 2>&1)"

mkdir -p /root/.m2 "${REMOTE_DIR}/uploads" "${REMOTE_DIR}/logs" "${REMOTE_DIR}/data"

echo "[ci-deploy] mvn package via ${MAVEN_IMAGE} ..."
docker run --rm \
  -v "${ROOT_DIR}:/app" \
  -v /root/.m2:/root/.m2 \
  -w /app \
  -e MAVEN_OPTS="-Xms64m -Xmx512m" \
  "${MAVEN_IMAGE}" \
  mvn -B -DskipTests package

if [[ ! -f "target/${JAR_NAME}" ]]; then
  echo "[ci-deploy] ERROR: jar not found" >&2
  ls -la target || true
  exit 1
fi

echo "[ci-deploy] docker build ${IMAGE} ..."
docker build -t "${IMAGE}" .

# host 网络下 8080 只能有一个进程：先停 systemd，再起容器；失败则回退
if systemctl list-unit-files 2>/dev/null | grep -q '^hycbox.service'; then
  systemctl stop hycbox || true
fi

echo "[ci-deploy] docker compose up ..."
docker compose -f docker-compose.yml up -d --force-recreate --remove-orphans

sleep 5
docker ps --filter name=hycbox --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
docker logs --tail 40 hycbox || true

echo "[ci-deploy] health check..."
ok=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf "http://127.0.0.1:8080/api/health" >/tmp/hyc-health.json; then
    cat /tmp/hyc-health.json
    echo
    ok=1
    break
  fi
  sleep 3
done

if [[ "$ok" -ne 1 ]]; then
  echo "[ci-deploy] WARN: docker health failed, rollback to systemd jar" >&2
  docker logs --tail 80 hycbox || true
  docker stop hycbox || true
  docker rm hycbox || true
  systemctl start hycbox || true
  exit 1
fi

systemctl disable hycbox || true
echo "[ci-deploy] DONE (docker)"
exit 0
