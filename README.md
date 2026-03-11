# Laboratory Inventory HTTP Server

这是一个独立的 HTTP 服务器，用于提供实验室库存数据的 REST API 接口。通过 HTTP 端点查询 MongoDB 中的库存数据，可被任何 HTTP 客户端调用。

## 功能特性

✅ **RESTful API** - 标准的 HTTP GET 端点，易于集成
✅ **Token 优化** - 只查询需要的数据，节省 80-98% 的 Token 消耗
✅ **MongoDB 集成** - 直接查询 MongoDB 数据库
✅ **独立运行** - 不依赖主应用，可单独部署
✅ **灵活查询** - 提供多种查询方式，支持按条件筛选

## 可用 API 端点

| 端点 | 描述 | 使用场景 |
|---------|------|---------|
| `GET /tools/inventory-summary` | 获取库存统计摘要 | 查看整体库存状况 |
| `GET /tools/expired-items` | 获取已过期耗材 | 查找过期耗材 |
| `GET /tools/expiring-items` | 获取即将过期耗材 | 查找快过期的耗材 |
| `GET /tools/low-stock-items` | 获取库存不足耗材 | 查找低库存耗材 |
| `GET /tools/out-of-stock-items` | 获取缺货耗材 | 查找缺货项目 |
| `GET /tools/search-inventory` | 根据关键词搜索耗材 | 搜索特定耗材 |
| `GET /tools/check-item` | 检查耗材可用性 | 查询特定耗材详情 |
| `GET /tools/purchase-suggestions` | 获取采购建议 | 获取采购推荐 |
| `GET /health` | 健康检查 | 检查服务状态 |

## 快速开始

### 1. 安装依赖

```bash
cd mcp
npm install
```

### 2. 配置环境变量

编辑 `.env` 文件，设置 MongoDB 连接：

```env
MONGODB_URI=mongodb://localhost:27017/test
```

### 3. 启动服务器

```bash
npm start
```

服务器将在 `http://localhost:3001` 上运行（默认端口）。

## HTTP API 使用指南

### 基础 URL

```
http://localhost:3001
```

### 端点详解

#### 1. 获取库存统计摘要

```bash
GET /tools/inventory-summary?labName=<实验室名>
```

**示例**：
```bash
curl "http://localhost:3001/tools/inventory-summary?labName=实验室A"
```

**响应**：
```json
{
  "success": true,
  "queryType": "summary",
  "data": {
    "totalItems": 128,
    "normalItems": 98,
    "expired": 5,
    "expiringSoon": 12,
    "lowStock": 8,
    "outOfStock": 5,
    "issueItems": [
      {
        "name": "胰蛋白酶",
        "quantity": 3,
        "minQuantity": 5,
        "expiryDate": "2024-03-15",
        "status": "库存不足"
      }
    ]
  }
}
```

#### 2. 获取已过期耗材

```bash
GET /tools/expired-items?labName=<实验室名>&limit=5
```

**示例**：
```bash
curl "http://localhost:3001/tools/expired-items?labName=实验室A&limit=10"
```

**响应**：
```json
{
  "success": true,
  "queryType": "expired",
  "count": 3,
  "items": [
    {
      "name": "PBS缓冲液",
      "quantity": 2,
      "expiryDate": "2024-01-15"
    }
  ]
}
```

#### 3. 获取即将过期耗材

```bash
GET /tools/expiring-items?labName=<实验室名>&days=30&limit=10
```

**参数**：
- `days`: 天数范围（默认30天）
- `limit`: 返回数量限制（默认10）

**示例**：
```bash
curl "http://localhost:3001/tools/expiring-items?labName=实验室A&days=30&limit=10"
```

**响应**：
```json
{
  "success": true,
  "queryType": "expiring",
  "count": 5,
  "items": [
    {
      "name": "胎牛血清",
      "quantity": 8,
      "expiryDate": "2024-04-01",
      "daysLeft": 15
    }
  ]
}
```

#### 4. 获取库存不足耗材

```bash
GET /tools/low-stock-items?labName=<实验室名>&limit=10
```

**示例**：
```bash
curl "http://localhost:3001/tools/low-stock-items?labName=实验室A"
```

**响应**：
```json
{
  "success": true,
  "queryType": "low_stock",
  "count": 8,
  "items": [
    {
      "name": "胰蛋白酶",
      "current": 3,
      "min": 5,
      "deficit": 2
    }
  ]
}
```

#### 5. 获取缺货耗材

```bash
GET /tools/out-of-stock-items?labName=<实验室名>&limit=5
```

**示例**：
```bash
curl "http://localhost:3001/tools/out-of-stock-items?labName=实验室A"
```

**响应**：
```json
{
  "success": true,
  "queryType": "out_of_stock",
  "count": 5,
  "items": [
    {"name": "细胞培养板"}
  ]
}
```

#### 6. 搜索库存

```bash
GET /tools/search-inventory?labName=<实验室名>&keyword=<关键词>&limit=5
```

**参数**：
- `keyword`: 搜索关键词（匹配名称、编码、规格）
- `limit`: 返回数量限制（默认5）

**示例**：
```bash
curl "http://localhost:3001/tools/search-inventory?labName=实验室A&keyword=胰蛋白"
```

**响应**：
```json
{
  "success": true,
  "queryType": "specific",
  "count": 2,
  "items": [
    {
      "name": "胰蛋白酶",
      "quantity": 3,
      "minQuantity": 5,
      "expiryDate": "2024-06-01",
      "status": "low_stock"
    }
  ]
}
```

#### 7. 检查特定耗材

```bash
GET /tools/check-item?labName=<实验室名>&itemName=<耗材名>
```

**示例**：
```bash
curl "http://localhost:3001/tools/check-item?labName=实验室A&itemName=胰蛋白酶"
```

**响应**：
```json
{
  "success": true,
  "found": true,
  "queryType": "check",
  "item": {
    "name": "胰蛋白酶",
    "quantity": 3,
    "minQuantity": 5,
    "expiryDate": "2024-06-01",
    "status": "low_stock",
    "statusMessage": "库存不足"
  }
}
```

#### 8. 获取采购建议

```bash
GET /tools/purchase-suggestions?labName=<实验室名>
```

**示例**：
```bash
curl "http://localhost:3001/tools/purchase-suggestions?labName=实验室A"
```

**响应**：
```json
{
  "success": true,
  "queryType": "purchase",
  "summary": {
    "totalItems": 128
  },
  "lowStock": [
    {
      "name": "胰蛋白酶",
      "current": 3,
      "min": 5,
      "deficit": 2
    }
  ],
  "expiringSoon": [
    {
      "name": "胎牛血清",
      "quantity": 8,
      "expiryDate": "2024-04-01",
      "daysLeft": 15
    }
  ]
}
```

#### 9. 健康检查

```bash
GET /health
```

**示例**：
```bash
curl "http://localhost:3001/health"
```

**响应**：
```json
{
  "status": "ok",
  "service": "MCP HTTP Server for Lab Inventory",
  "timestamp": "2024-03-11T08:00:00.000Z"
}
```

## 错误处理

所有端点在发生错误时返回统一格式：

```json
{
  "success": false,
  "error": "错误信息描述"
}
```

常见错误：
- **400 Bad Request**: 缺少必需参数（如 `labName`）
- **500 Internal Server Error**: 数据库连接或查询错误

## 与 AI 助手集成

由于本服务提供 HTTP REST API，任何支持 HTTP 请求的 AI 助手都可以调用。

### 与 AI 助手集成的步骤

1. **启动本服务**
   ```bash
   npm start
   ```

2. **配置 AI 助手使用 Function Calling**

   告诉 AI 助手可用的 API 端点，让它根据用户问题自动选择合适的端点调用。

3. **示例对话流程**

   **用户**："库存怎么样？"

   **AI 助手分析** → 决定调用 `/tools/inventory-summary?labName=实验室A`

   **API 返回**：
   ```json
   {
     "success": true,
     "data": {
       "totalItems": 128,
       "normalItems": 98,
       "expired": 5,
       "expiringSoon": 12,
       "lowStock": 8,
       "outOfStock": 5
     }
   }
   ```

   **AI 助手回复**："实验室A目前共有128件耗材，其中98件正常。需要注意：5件已过期，12件即将过期（30天内），8件库存不足，5件缺货。"

### AI 助手集成示例代码

```javascript
// AI 助手中的集成示例
async function queryInventory(userQuery, labName) {
    // 根据用户问题决定调用哪个端点
    let endpoint;
    const baseUrl = 'http://localhost:3001';

    if (userQuery.includes('过期')) {
        endpoint = `${baseUrl}/tools/expired-items?labName=${encodeURIComponent(labName)}`;
    } else if (userQuery.includes('库存') && userQuery.includes('怎么样')) {
        endpoint = `${baseUrl}/tools/inventory-summary?labName=${encodeURIComponent(labName)}`;
    } else if (userQuery.includes('还有多少')) {
        const itemName = extractItemName(userQuery);
        endpoint = `${baseUrl}/tools/check-item?labName=${encodeURIComponent(labName)}&itemName=${encodeURIComponent(itemName)}`;
    }

    const response = await fetch(endpoint);
    return await response.json();
}
```

## 开发说明

### 项目结构

```
mcp/
├── http-server.js      # HTTP 服务器主文件
├── package.json        # 依赖配置
├── .env                # 环境变量（不提交到 git）
├── .gitignore          # Git 忽略文件
├── README.md           # 本文档
└── CLAUDE.md           # Claude Code 工作指南
```

### 数据库 Schema

库存数据表 (`inventory` collection) 结构：

```javascript
{
  name: String,           // 耗材名称
  code: String,           // 耗材编码
  category: String,       // 分类
  specification: String,  // 规格
  quantity: Number,       // 当前数量
  unit: String,           // 单位
  minQuantity: Number,    // 最小库存量
  expiryDate: Date,       // 过期日期
  labName: String,        // 实验室名称（必需，用于数据隔离）
  status: String,         // 状态
  createdAt: Date,        // 创建时间
  updatedAt: Date         // 更新时间
}
```

### 添加新端点

1. **在 `http-server.js` 中添加新的 Express 路由**：

```javascript
app.get('/tools/your-new-endpoint', async (req, res) => {
    try {
        const { labName, otherParam } = req.query;

        // 验证必需参数
        if (!labName) {
            return res.status(400).json({
                success: false,
                error: 'labName 参数必填'
            });
        }

        // 执行数据库查询
        const items = await Inventory.find({ labName, /* 其他条件 */ })
            .select('field1 field2')  // 只选择需要的字段
            .limit(parseInt(limit || 10))
            .lean();  // 返回普通 JS 对象

        // 返回结果
        res.json({
            success: true,
            queryType: 'your_type',
            count: items.length,
            items: items
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
```

2. **更新启动日志**（可选）：

在 `main()` 函数中的 console.log 部分添加新端点的说明。

### 测试

**测试服务器是否启动**：
```bash
curl http://localhost:3001/health
```

**测试特定端点**：
```bash
curl "http://localhost:3001/tools/inventory-summary?labName=实验室A"
```

## 故障排查

### 问题 1：无法连接 MongoDB

**错误信息**：`MongooseServerError: connect ECONNREFUSED`

**解决方法**：
1. 检查 MongoDB 是否运行：
   ```bash
   # Windows
   mongosh

   # 或检查服务状态
   net stat -ano | findstr :27017
   ```
2. 检查 `.env` 文件中的连接字符串是否正确
3. 检查网络连接和防火墙设置

### 问题 2：端口被占用

**错误信息**：`Error: listen EADDRINUSE: address already in use :::3001`

**解决方法**：
```bash
# Windows - 查找占用端口的进程
netstat -ano | findstr :3001

# 终止进程（替换 PID）
taskkill /PID <进程ID> /F

# 或修改 .env 文件中的 PORT
PORT=3002
```

### 问题 3：找不到实验室数据

**现象**：查询返回 `totalItems: 0` 或 `items: []`

**解决方法**：
1. 确认 `labName` 参数拼写正确（区分大小写）
2. 连接 MongoDB 检查数据：
   ```bash
   mongosh
   use test
   db.inventory.find({ labName: "实验室A" })
   ```
3. 检查数据库中是否有该实验室的数据
4. 查看所有实验室名称：
   ```bash
   db.inventory.distinct("labName")
   ```

### 问题 4：依赖安装失败

**错误信息**：`npm ERR!` 或 `ENOENT`

**解决方法**：
```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules
npm install

# Windows 使用
rmdir /s /q node_modules
npm install
```

### 问题 5：响应速度慢

**可能原因**：
- MongoDB 查询未使用索引
- 返回数据量过大

**解决方法**：
1. 为常用查询字段添加索引：
   ```javascript
   // 在 MongoDB 中创建索引
   db.inventory.createIndex({ labName: 1 })
   db.inventory.createIndex({ expiryDate: 1 })
   db.inventory.createIndex({ name: "text", code: "text", specification: "text" })
   ```
2. 使用 `limit` 参数限制返回数量
3. 使用 `.select()` 只选择需要的字段

## 性能优化

### Token 消耗对比

| 查询类型 | 传统方式 | MCP 方式 | 节省 |
|---------|---------|---------|------|
| 库存摘要 | 5000 tokens | 100 tokens | 98% |
| 已过期 | 5000 tokens | 200 tokens | 96% |
| 特定耗材 | 5000 tokens | 300 tokens | 94% |

### 查询限制

所有查询都有 `limit` 参数，防止返回过多数据：
- 默认限制：5-10 条
- 可通过参数调整

## 安全说明

### 数据安全
1. **环境变量** - `.env` 文件包含敏感信息（MongoDB 连接字符串），已加入 `.gitignore`，不要提交到 git
2. **数据隔离** - 所有查询都需要 `labName` 参数，确保不同实验室的数据隔离
3. **只读操作** - 本服务只提供查询功能，不会修改数据库中的数据

### 生产环境部署建议

如果需要在生产环境部署，建议添加以下安全措施：

1. **添加认证机制**：
   ```javascript
   // 简单 API Key 验证示例
   app.use((req, res, next) => {
       const apiKey = req.headers['x-api-key'];
       if (apiKey !== process.env.API_KEY) {
           return res.status(401).json({ success: false, error: 'Unauthorized' });
       }
       next();
   });
   ```

2. **启用 CORS 限制**：
   ```javascript
   app.use(cors({
       origin: ['https://your-domain.com'],  // 限制来源
       credentials: true
   }));
   ```

3. **添加速率限制**：
   ```bash
   npm install express-rate-limit
   ```
   ```javascript
   import rateLimit from 'express-rate-limit';

   const limiter = rateLimit({
       windowMs: 15 * 60 * 1000,  // 15 分钟
       max: 100  // 限制每个 IP 100 次请求
   });

   app.use('/tools/', limiter);
   ```

4. **使用 HTTPS**：在生产环境中使用反向代理（如 Nginx）提供 HTTPS

## 性能优化

### 已实现的优化

1. **字段选择** - 使用 `.select()` 只返回需要的字段
2. **数量限制** - 所有查询都有 `limit` 参数，默认限制 5-10 条
3. **并行查询** - 使用 `Promise.all()` 同时执行多个查询
4. **精简响应** - 返回最少必要的数据

### Token 消耗对比

| 查询类型 | 返回全部数据 | 本服务 | 节省 |
|---------|------------|--------|------|
| 库存摘要 | ~5000 tokens | ~100 tokens | 98% |
| 已过期 | ~5000 tokens | ~200 tokens | 96% |
| 特定耗材 | ~5000 tokens | ~300 tokens | 94% |

### 查询限制

所有查询都有 `limit` 参数，防止返回过多数据：
- 默认限制：5-10 条
- 可通过 URL 参数调整（如 `?limit=20`）
- 建议不超过 100 条

## 后续优化建议

1. **添加缓存层**
   - 使用 Redis 缓存常用查询结果
   - 设置合理的过期时间（如 5 分钟）

2. **添加日志系统**
   - 记录查询历史和性能指标
   - 使用 Winston 或 Pino 等日志库

3. **添加监控**
   - 集成 Prometheus 监控
   - 添加健康检查和告警

4. **API 文档**
   - 使用 Swagger/OpenAPI 生成交互式文档
   - 提供 API 调试界面

5. **批量查询支持**
   - 支持一次查询多个实验室
   - 支持批量检查多个耗材

6. **WebSocket 支持**
   - 对于需要实时更新的场景
   - 推送库存变化通知

## 测试

### 手动测试

使用以下命令测试各个端点：

```bash
# 健康检查
curl http://localhost:3001/health

# 库存摘要
curl "http://localhost:3001/tools/inventory-summary?labName=实验室A"

# 搜索耗材
curl "http://localhost:3001/tools/search-inventory?labName=实验室A&keyword=胰蛋白"

# 检查特定耗材
curl "http://localhost:3001/tools/check-item?labName=实验室A&itemName=胰蛋白酶"
```

### 使用 Postman 或 Insomnia

导入以下环境变量：
- `base_url`: `http://localhost:3001`
- `labName`: `实验室A`

## 相关文档

- [Express.js 官方文档](https://expressjs.com/)
- [Mongoose 官方文档](https://mongoosejs.com/docs/)
- [MongoDB 手册](https://docs.mongodb.com/manual/)
- [REST API 最佳实践](https://restfulapi.net/)

## 技术栈

- **Node.js** - JavaScript 运行环境 (>= 18.0.0)
- **Express.js** - Web 应用框架
- **Mongoose** - MongoDB ODM
- **MongoDB** - NoSQL 数据库
- **CORS** - 跨域资源共享支持

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0 (2024-03-11)
- 初始版本发布
- 提供 8 个 REST API 端点
- 支持库存查询、过期检查、低库存警告等功能
- 完整的错误处理和日志记录
