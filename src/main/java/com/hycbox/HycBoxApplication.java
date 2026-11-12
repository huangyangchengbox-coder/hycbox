package com.hycbox;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@Slf4j
@SpringBootApplication
public class HycBoxApplication {

    public static void main(String[] args) {
        SpringApplication.run(HycBoxApplication.class, args);
        log.info("hyc-box-server 启动完成，日志目录: ./logs （按天滚动，保留 3 天）");
    }
}
