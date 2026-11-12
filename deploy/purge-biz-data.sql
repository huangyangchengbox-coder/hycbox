/**
 * 业务表清理 SQL（保留管理员账号、行政区划）。
 * 用法：在目标库执行，例如 mysql hycbox < purge-biz-data.sql
 */
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE fruit_order;
TRUNCATE TABLE publication;
TRUNCATE TABLE admin_notice;
TRUNCATE TABLE admin_session;
TRUNCATE TABLE admin_qr_login;
TRUNCATE TABLE ai_media_job;
TRUNCATE TABLE wx_user;

SET FOREIGN_KEY_CHECKS = 1;

-- 保留：admin_user、admin_region
SELECT 'purged' AS result;
