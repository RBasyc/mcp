# MCP Server for Laboratory Inventory Management System

这是一个独立的 MCP (Model Context Protocol) 服务器，用于让 AI 智能查询实验室库存数据。

## 功能特性

✅ **智能查询工具** - AI 根据用户问题自主选择合适的查询工具
✅ **Token 优化** - 只查询需要的数据，节省 80-98% 的 Token 消耗
✅ **标准化接口** - 符合 MCP 协议，可与 Claude Desktop 等客户端集成
✅ **独立运行** - 不依赖主应用，可单独部署

## 可用工具

| 工具名称 | 描述 | 使用场景 |
|---------|------|---------|
| `get_inventory_summary` | 获取库存统计摘要 | 用户询问整体库存状况 |
| `get_expired_items` | 获取已过期耗材 | 用户询问过期耗材 |
| `get_expiring_items` | 获取即将过期耗材 | 用户询问快过期的耗材 |
| `get_low_stock_items` | 获取库存不足耗材 | 用户询问库存不足 |
| `search_inventory` | 根据关键词搜索耗材 | 用户询问特定耗材 |
| `check_item_availability` | 检查耗材可用性 | 用户问某耗材有多少 |
| `get_inventory_by_category` | 按分类获取耗材 | 用户询问某类耗材 |

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

服务器将在 stdio 上运行，等待 MCP 客户端连接。

## 与 Claude Desktop 集成

### 配置步骤

1. **找到 Claude Desktop 配置文件**

   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`

2. **添加 MCP 服务器配置**

   ```json
   {
     "mcpServers": {
       "lab-inventory": {
         "command": "node",
         "args": ["C:\\Users\\Basyc\\Desktop\\project-no3_taro\\mcp\\mcp-server.js"],
         "env": {
           "MONGODB_URI": "mongodb://localhost:27017/test"
         }
       }
     }
   }
   ```

3. **重启 Claude Desktop**

4. **验证连接**

   在 Claude Desktop 中启动新对话，询问：
   - "查看库存摘要"
   - "有哪些已过期的耗材？"

## 使用示例

### 示例 1：查询库存摘要

**用户**："库存怎么样？"

**Claude 会调用**：`get_inventory_summary(labName="实验室A")`

**返回结果**：
```json
{
  "success": true,
  "summary": {
    "totalItems": 128,
    "normalItems": 98,
    "expired": 5,
    "expiringSoon": 12,
    "lowStock": 8,
    "outOfStock": 5
  }
}
```

### 示例 2：查询特定耗材

**用户**："胰蛋白酶还有多少？"

**Claude 会调用**：`check_item_availability(labName="实验室A", itemName="胰蛋白酶")`

**返回结果**：
```json
{
  "success": true,
  "found": true,
  "item": {
    "name": "胰蛋白酶",
    "quantity": 3,
    "minQuantity": 5,
    "status": "low_stock",
    "statusMessage": "库存不足"
  }
}
```

## 开发说明

### 项目结构

```
mcp/
├── mcp-server.js      # MCP 服务器主文件
├── package.json       # 依赖配置
├── .env               # 环境变量（不提交到 git）
├── .gitignore         # Git 忽略文件
└── README.md          # 本文档
```

### 添加新工具

1. **在 `mcp-server.js` 中添加工具定义**：

```javascript
const tools = [
  {
    name: 'your_new_tool',
    description: '工具描述',
    inputSchema: {
      type: 'object',
      properties: {
        param1: {
          type: 'string',
          description: '参数描述'
        }
      },
      required: ['param1']
    }
  }
];
```

2. **添加工具处理逻辑**：

```javascript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'your_new_tool':
      result = await yourNewTool(args.param1);
      break;
    // ...
  }
});
```

3. **实现工具函数**：

```javascript
async function yourNewTool(param1) {
  // 实现逻辑
  return {
    success: true,
    data: {...}
  };
}
```

## 故障排查

### 问题 1：无法连接 MongoDB

**错误信息**：`MongooseServerError: connect ECONNREFUSED`

**解决方法**：
1. 检查 MongoDB 是否运行：`mongosh`
2. 检查连接字符串是否正确
3. 检查网络连接

### 问题 2：找不到实验室数据

**错误信息**：`totalItems: 0`

**解决方法**：
1. 确认 `labName` 参数正确
2. 检查数据库中是否有该实验室的数据
3. 查询全部数据：`db.inventories.find({})`

### 问题 3：Claude Desktop 无法连接 MCP 服务器

**错误信息**：Claude Desktop 中看不到 MCP 工具

**解决方法**：
1. 检查配置文件路径是否正确
2. 检查 JSON 格式是否正确
3. 检查文件路径是否使用绝对路径
4. 查看 Claude Desktop 日志

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

1. **环境变量** - `.env` 文件包含敏感信息，不要提交到 git
2. **数据隔离** - 所有查询都需要 `labName` 参数，确保数据隔离
3. **只读操作** - MCP 服务器只提供查询功能，不修改数据

## 后续优化建议

1. **添加缓存** - 对常用查询结果进行缓存
2. **添加认证** - 如果需要，可以添加 API Key 认证
3. **添加日志** - 记录查询历史，便于调试
4. **支持流式响应** - 大数据量时使用流式返回

## 相关文档

- [MCP 协议规范](https://modelcontextprotocol.io/)
- [Claude Desktop 文档](https://claude.ai/claude-desktop)
- [项目主文档](../AI_CHAT_OPTIMIZATION_SUMMARY.md)

## 许可证

MIT
