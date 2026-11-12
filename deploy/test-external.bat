@echo off
set BASE=https://hychyr.top/api

echo === 1. Health ===
curl -s %BASE%/health
echo.

echo === 2. Create Publication ===
curl -s -X POST %BASE%/publications -H "Content-Type: application/json" -d "{\"title\":\"新鲜苹果\",\"imageUrl\":\"\",\"totalBags\":15}"
echo.

echo === 3. List Publications ===
curl -s %BASE%/publications
echo.

echo === 4. Create Order ===
curl -s -X POST %BASE%/orders -H "Content-Type: application/json" -d "{\"publicationId\":\"REPLACE_PUB\",\"userId\":\"user_demo\",\"userName\":\"张先生\",\"roomId\":\"phase1_2_1_1501\",\"quantity\":2}"
echo.
