# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a standalone MCP (Model Context Protocol) HTTP server for laboratory inventory management. It provides read-only REST API endpoints for querying MongoDB inventory data, designed to be consumed by AI assistants via HTTP requests.

**Architecture**: Single-file Express server ([http-server.js](http-server.js)) that wraps MongoDB queries in REST endpoints.

**Database**: MongoDB using Mongoose ODM. Collection name: `inventory`

**Port**: Default 3001 (configurable via `PORT` environment variable)

## Development Commands

```bash
# Install dependencies
npm install

# Start the server
npm start

# Server will be available at http://localhost:3001
```

## Environment Variables

Create a `.env` file in the project root:

```
MONGODB_URI=mongodb://localhost:27017/test
PORT=3001
```

**Important**: The `.env` file is gitignored and contains sensitive connection strings.

## Database Schema

The `inventory` collection uses this schema (defined in [http-server.js:9-24](http-server.js#L9-L24)):

```javascript
{
  name: String,           // Item name
  code: String,           // Item code
  category: String,       // Category classification
  specification: String,  // Specifications
  quantity: Number,       // Current quantity
  unit: String,           // Unit of measurement
  minQuantity: Number,    // Minimum quantity threshold
  expiryDate: Date,       // Expiration date
  labName: String,        // Laboratory name (required for data isolation)
  status: String,         // Status field
  createdAt: Date,
  updatedAt: Date
}
```

**Critical**: All queries require a `labName` parameter for data isolation between laboratories.

## API Endpoints

All endpoints are GET requests and return JSON responses. Query parameters are passed in the URL.

| Endpoint | Purpose | Required Params | Optional Params |
|----------|---------|-----------------|-----------------|
| `/tools/inventory-summary` | Overall inventory statistics | `labName` | - |
| `/tools/expired-items` | Get expired consumables | `labName` | `limit` (default: 5) |
| `/tools/expiring-items` | Get items expiring soon | `labName` | `days` (default: 30), `limit` (default: 10) |
| `/tools/low-stock-items` | Get items below minimum | `labName` | `limit` (default: 10) |
| `/tools/out-of-stock-items` | Get items with zero quantity | `labName` | `limit` (default: 5) |
| `/tools/search-inventory` | Search by keyword | `labName`, `keyword` | `limit` (default: 5) |
| `/tools/check-item` | Check specific item availability | `labName`, `itemName` | - |
| `/tools/purchase-suggestions` | Get purchasing recommendations | `labName` | - |
| `/health` | Health check | - | - |

## Response Format

All successful responses follow this structure:

```javascript
{
  success: true,
  queryType: '...',      // Type of query performed
  data: { ... },         // Or items: [...], count: N, etc.
  // Additional fields specific to endpoint
}
```

Error responses:

```javascript
{
  success: false,
  error: 'Error message'
}
```

## Key Implementation Details

### Token Optimization
All endpoints use `.select()` to limit returned fields and have configurable `limit` parameters to minimize response size and token consumption.

### Status Determination Logic
Item status is computed server-side ([http-server.js:326-336](http-server.js#L326-L336), [http-server.js:387-403](http-server.js#L387-L403)):
- `expired`: expiryDate < now
- `expiring_soon`: expiryDate within 30 days
- `out_of_stock`: quantity === 0
- `low_stock`: quantity <= minQuantity
- `normal`: everything else

### Date Calculations
- Expiration check: `expiryDate < now` (for expired)
- Upcoming expiration: `now <= expiryDate < (now + 30 days)` (default, configurable)
- Date comparisons use `new Date()` and millisecond arithmetic

### Parallel Queries
The inventory-summary endpoint uses `Promise.all()` to run multiple count queries in parallel ([http-server.js:52-73](http-server.js#L52-L73)).

## Adding New Endpoints

When adding new query endpoints:

1. Define the Express route with `app.get('/tools/your-endpoint', async (req, res) => {...})`
2. Validate `labName` parameter is present
3. Use `Inventory.find()` or `Inventory.countDocuments()` with appropriate query filters
4. Apply `.select()` to limit returned fields
5. Use `.limit()` to prevent excessive results
6. Return consistent response format with `success: true/false`
7. Include try-catch error handling

Example pattern ([http-server.js:134-172](http-server.js#L134-L172)):

```javascript
app.get('/tools/your-endpoint', async (req, res) => {
    try {
        const { labName, optionalParam } = req.query;

        if (!labName) {
            return res.status(400).json({ success: false, error: 'labName required' });
        }

        const items = await Inventory.find({ labName, /* your filters */ })
            .select('field1 field2')
            .limit(parseInt(optionalParam || 10))
            .lean();

        res.json({ success: true, data: items });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
```

## Testing the Server

```bash
# Health check
curl http://localhost:3001/health

# Get inventory summary
curl "http://localhost:3001/tools/inventory-summary?labName=实验室A"

# Search for items
curl "http://localhost:3001/tools/search-inventory?labName=实验室A&keyword=胰蛋白酶"
```

## Common Issues

- **Connection refused**: Ensure MongoDB is running (`mongosh` to test)
- **Empty results**: Check that `labName` matches database values exactly
- **Date parsing**: Dates are stored as ISO 8601 format in MongoDB
