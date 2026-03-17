import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

// MongoDB 连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

// 定义 Schema（与后端保持一致）
const inventorySchema = new mongoose.Schema({
    name: String,
    code: String,
    category: String,
    specification: String,
    quantity: Number,
    unit: String,
    minQuantity: Number,
    expiryDate: Date,
    location: String,  // 存放位置
    supplier: String,  // 供应商
    labName: String,
    labName: String,
    status: String,
    createdAt: Date,
    updatedAt: Date
}, {
    collection: 'inventory'
});

const Inventory = mongoose.model('Inventory', inventorySchema);

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

/**
 * 工具 1: 获取库存统计摘要
 */
app.get('/tools/inventory-summary', async (req, res) => {
    try {
        const { labName } = req.query;

        if (!labName) {
            return res.status(400).json({
                success: false,
                error: 'labName 参数必填'
            });
        }

        const now = new Date();
        const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const [totalItems, totalExpired, totalExpiringSoon, totalLowStock, totalOutOfStock] = await Promise.all([
            Inventory.countDocuments({ labName }),
            Inventory.countDocuments({
                labName,
                expiryDate: { $lt: now },
                quantity: { $gt: 0 }
            }),
            Inventory.countDocuments({
                labName,
                expiryDate: { $gte: now, $lt: thirtyDaysLater },
                quantity: { $gt: 0 }
            }),
            Inventory.countDocuments({
                labName,
                $expr: { $lte: ['$quantity', '$minQuantity'] },
                quantity: { $gt: 0 }
            }),
            Inventory.countDocuments({
                labName,
                quantity: 0
            })
        ]);

        // 如果有问题（过期、低库存、缺货），查询具体的耗材列表（最多3项）
        const hasIssues = totalExpired > 0 || totalLowStock > 0 || totalOutOfStock > 0;
        let issueItems = [];

        if (hasIssues) {
            const items = await Inventory.find({
                labName,
                $or: [
                    { expiryDate: { $lt: now }, quantity: { $gt: 0 } }, // 已过期
                    { expiryDate: { $gte: now, $lt: thirtyDaysLater }, quantity: { $gt: 0 } }, // 即将过期
                    { $expr: { $lte: ['$quantity', '$minQuantity'] }, quantity: { $gt: 0 } }, // 库存不足
                    { quantity: 0 } // 缺货
                ]
            })
            .select('name quantity minQuantity expiryDate')
            .limit(3)
            .lean();

            issueItems = items.map(item => {
                let status = '正常';
                if (item.expiryDate && item.expiryDate < now) status = '已过期';
                else if (item.quantity === 0) status = '缺货';
                else if (item.quantity <= item.minQuantity) status = '库存不足';
                else if (item.expiryDate && item.expiryDate < thirtyDaysLater) status = '即将过期';

                return {
                    name: item.name,
                    quantity: item.quantity,
                    minQuantity: item.minQuantity,
                    expiryDate: item.expiryDate ? item.expiryDate.toISOString().split('T')[0] : null,
                    status
                };
            });
        }

        res.json({
            success: true,
            queryType: 'summary',
            data: {
                totalItems,
                normalItems: Math.max(0, totalItems - totalExpired - totalExpiringSoon - totalLowStock - totalOutOfStock),
                expired: totalExpired,
                expiringSoon: totalExpiringSoon,
                lowStock: totalLowStock,
                outOfStock: totalOutOfStock,
                issueItems: issueItems
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 工具 2: 获取已过期耗材
 */
app.get('/tools/expired-items', async (req, res) => {
    try {
        const { labName, limit = 5 } = req.query;

        if (!labName) {
            return res.status(400).json({
                success: false,
                error: 'labName 参数必填'
            });
        }

        const now = new Date();
        const items = await Inventory.find({
            labName,
            expiryDate: { $lt: now },
            quantity: { $gt: 0 }
        })
        .select('name quantity expiryDate')
        .sort({ expiryDate: 1 })
        .limit(parseInt(limit))
        .lean();

        res.json({
            success: true,
            queryType: 'expired',
            count: items.length,
            items: items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                expiryDate: item.expiryDate ? item.expiryDate.toISOString().split('T')[0] : null
            }))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 工具 3: 获取即将过期耗材
 */
app.get('/tools/expiring-items', async (req, res) => {
    try {
        const { labName, days = 30, limit = 10 } = req.query;

        if (!labName) {
            return res.status(400).json({
                success: false,
                error: 'labName 参数必填'
            });
        }

        const now = new Date();
        const futureDate = new Date(now.getTime() + parseInt(days) * 24 * 60 * 60 * 1000);

        const items = await Inventory.find({
            labName,
            expiryDate: { $gte: now, $lt: futureDate },
            quantity: { $gt: 0 }
        })
        .select('name quantity expiryDate')
        .sort({ expiryDate: 1 })
        .limit(parseInt(limit))
        .lean();

        res.json({
            success: true,
            queryType: 'expiring',
            count: items.length,
            items: items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                expiryDate: item.expiryDate ? item.expiryDate.toISOString().split('T')[0] : null,
                daysLeft: Math.ceil((item.expiryDate - now) / (1000 * 60 * 60 * 24))
            }))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 工具 4: 获取库存不足耗材
 */
app.get('/tools/low-stock-items', async (req, res) => {
    try {
        const { labName, limit = 10 } = req.query;

        if (!labName) {
            return res.status(400).json({
                success: false,
                error: 'labName 参数必填'
            });
        }

        const items = await Inventory.find({
            labName,
            $expr: { $lte: ['$quantity', '$minQuantity'] },
            quantity: { $gt: 0 }
        })
        .select('name quantity minQuantity')
        .sort({ quantity: 1 })
        .limit(parseInt(limit))
        .lean();

        res.json({
            success: true,
            queryType: 'low_stock',
            count: items.length,
            items: items.map(item => ({
                name: item.name,
                current: item.quantity,
                min: item.minQuantity,
                deficit: item.minQuantity - item.quantity
            }))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 工具 5: 获取缺货耗材
 */
app.get('/tools/out-of-stock-items', async (req, res) => {
    try {
        const { labName, limit = 5 } = req.query;

        if (!labName) {
            return res.status(400).json({
                success: false,
                error: 'labName 参数必填'
            });
        }

        const items = await Inventory.find({
            labName,
            quantity: 0
        })
        .select('name')
        .limit(parseInt(limit))
        .lean();

        res.json({
            success: true,
            queryType: 'out_of_stock',
            count: items.length,
            items: items.map(item => ({ name: item.name }))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 工具 6: 搜索特定耗材
 */
app.get('/tools/search-inventory', async (req, res) => {
    try {
        const { labName, keyword, limit = 5 } = req.query;

        if (!labName || !keyword) {
            return res.status(400).json({
                success: false,
                error: 'labName 和 keyword 参数必填'
            });
        }

        const regex = new RegExp(keyword, 'i');
        const items = await Inventory.find({
            labName,
            $or: [
                { name: regex },
                { code: regex },
                { specification: regex }
            ]
        })
        .select('name quantity minQuantity expiryDate location unit')
        .limit(parseInt(limit))
        .lean();

        const now = new Date();
        res.json({
            success: true,
            queryType: 'specific',
            count: items.length,
            items: items.map(item => {
                let status = 'normal';
                if (item.expiryDate && item.expiryDate < now) status = 'expired';
                else if (item.quantity === 0) status = 'out_of_stock';
                else if (item.quantity <= item.minQuantity) status = 'low_stock';

                return {
                    name: item.name,
                    quantity: item.quantity,
                    minQuantity: item.minQuantity,
                    expiryDate: item.expiryDate ? item.expiryDate.toISOString().split('T')[0] : null,
                    location: item.location || '未设置存放位置',  // ✅ 添加存放位置
                    unit: item.unit || '',
                    status
                };
            })
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 工具 7: 检查耗材可用性
 */
app.get('/tools/check-item', async (req, res) => {
    try {
        const { labName, itemName } = req.query;

        if (!labName || !itemName) {
            return res.status(400).json({
                success: false,
                error: 'labName 和 itemName 参数必填'
            });
        }

        const regex = new RegExp(itemName, 'i');
        const items = await Inventory.find({
            labName,
            name: regex
        })
        .select('name quantity minQuantity expiryDate location unit')
        .lean();

        if (items.length === 0) {
            return res.json({
                success: true,
                found: false,
                message: `未找到耗材 "${itemName}"`
            });
        }

        const item = items[0];
        const now = new Date();

        let status = 'normal';
        let statusMessage = '库存正常';

        if (item.expiryDate && item.expiryDate < now) {
            status = 'expired';
            statusMessage = '已过期';
        } else if (item.expiryDate && item.expiryDate < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
            status = 'expiring_soon';
            const daysLeft = Math.ceil((item.expiryDate - now) / (1000 * 60 * 60 * 24));
            statusMessage = `即将过期（${daysLeft}天后）`;
        } else if (item.quantity === 0) {
            status = 'out_of_stock';
            statusMessage = '缺货';
        } else if (item.quantity <= item.minQuantity) {
            status = 'low_stock';
            statusMessage = '库存不足';
        }

        res.json({
            success: true,
            found: true,
            queryType: 'check',
            item: {
                name: item.name,
                quantity: item.quantity,
                minQuantity: item.minQuantity,
                expiryDate: item.expiryDate ? item.expiryDate.toISOString().split('T')[0] : null,
                location: item.location || '未设置存放位置',  // ✅ 添加存放位置
                unit: item.unit || '',
                status,
                statusMessage
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 工具 8: 获取采购建议
 */
app.get('/tools/purchase-suggestions', async (req, res) => {
    try {
        const { labName } = req.query;

        if (!labName) {
            return res.status(400).json({
                success: false,
                error: 'labName 参数必填'
            });
        }

        const now = new Date();
        const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const [summary, lowStock, expiringSoon] = await Promise.all([
            Inventory.countDocuments({ labName }),
            Inventory.find({
                labName,
                $expr: { $lte: ['$quantity', '$minQuantity'] },
                quantity: { $gt: 0 }
            })
            .select('name quantity minQuantity')
            .sort({ quantity: 1 })
            .limit(10)
            .lean(),
            Inventory.find({
                labName,
                expiryDate: { $gte: now, $lt: thirtyDaysLater },
                quantity: { $gt: 0 }
            })
            .select('name quantity expiryDate')
            .sort({ expiryDate: 1 })
            .limit(5)
            .lean()
        ]);

        res.json({
            success: true,
            queryType: 'purchase',
            summary: {
                totalItems: summary
            },
            lowStock: lowStock.map(item => ({
                name: item.name,
                current: item.quantity,
                min: item.minQuantity,
                deficit: item.minQuantity - item.quantity
            })),
            expiringSoon: expiringSoon.map(item => ({
                name: item.name,
                quantity: item.quantity,
                expiryDate: item.expiryDate ? item.expiryDate.toISOString().split('T')[0] : null,
                daysLeft: Math.ceil((item.expiryDate - now) / (1000 * 60 * 60 * 24))
            }))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * 健康检查
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'MCP HTTP Server for Lab Inventory',
        timestamp: new Date().toISOString()
    });
});

/**
 * 启动服务器
 */
async function main() {
    // 连接 MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 启动服务器
    app.listen(PORT, () => {
        console.log(`🚀 MCP HTTP Server running on http://localhost:${PORT}`);
        console.log(`📚 API Documentation:`);
        console.log(`   GET  /tools/inventory-summary?labName=<实验室名>`);
        console.log(`   GET  /tools/expired-items?labName=<实验室名>&limit=5`);
        console.log(`   GET  /tools/expiring-items?labName=<实验室名>&days=30`);
        console.log(`   GET  /tools/low-stock-items?labName=<实验室名>`);
        console.log(`   GET  /tools/out-of-stock-items?labName=<实验室名>`);
        console.log(`   GET  /tools/search-inventory?labName=<实验室名>&keyword=<关键词>`);
        console.log(`   GET  /tools/check-item?labName=<实验室名>&itemName=<耗材名>`);
        console.log(`   GET  /tools/purchase-suggestions?labName=<实验室名>`);
        console.log(`\n✨ Ready to serve requests!`);
    });
}

main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
