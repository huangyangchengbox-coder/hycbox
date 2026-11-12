package com.hycbox.storage;

import java.io.IOException;
import java.io.InputStream;

/**
 * 文件存储抽象：本地盘 / SeaweedFS 等可替换实现，便于水平扩容。
 */
public interface FileStorage {

    /**
     * 保存文件并返回可公网访问的 URL。
     *
     * @param objectKey   对象名（含扩展名，不含路径分隔）
     * @param data        文件流
     * @param size        字节数
     * @param contentType MIME，可为 null
     */
    String store(String objectKey, InputStream data, long size, String contentType) throws IOException;
}
