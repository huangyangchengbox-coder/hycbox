# 运行时镜像：流水线先 mvn package，再 docker build（省内存，避免在容器里跑 Maven）
FROM eclipse-temurin:17-jre-jammy

WORKDIR /app

ENV TZ=Asia/Shanghai \
    JAVA_OPTS="-Xms128m -Xmx384m" \
    LOG_PATH=/app/logs

RUN mkdir -p /app/uploads /app/logs

COPY target/hyc-box-server-1.0.0.jar /app/app.jar

EXPOSE 8080

# network_mode: host 时直连宿主机 MySQL 127.0.0.1:3306
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Dfile.encoding=UTF-8 -jar /app/app.jar"]
