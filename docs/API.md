# CelitePro API Documentation

## Endpoints

### POST /api/render

Submit a render request.

**Request:**
```json
{
  "templateId": "uuid",
  "parameters": {
    "title": "My Video",
    "color": "#6366f1"
  }
}
```

**Response:**
```json
{
  "jobId": "uuid",
  "previewUrl": "https://...",
  "downloadUrl": "https://..."
}
```

**Error Response:**
```json
{
  "error": "Error message"
}
```

### GET /api/render?id=xxx

Check render job status.

**Response:**
```json
{
  "id": "uuid",
  "status": "pending" | "processing" | "completed" | "failed",
  "previewUrl": "https://...",
  "downloadUrl": "https://..."
}
```

## Plainly API Integration

### Configuration

Set the `PLAINLY_API_KEY` environment variable:

```env
PLAINLY_API_KEY=your_api_key_here
```

### Available Functions

**lib/plainly.ts:**

| Function | Description |
|----------|-------------|
| `listRenderableItems()` | List all projects |
| `renderTemplate(projectId, params)` | Submit render |
| `checkRenderStatus(renderId)` | Check status |
| `waitForRender(renderId, maxAttempts, interval)` | Poll until complete |
| `deleteProject(projectId)` | Delete project (cleanup) |

### Render Workflow

1. Upload template ZIP to Plainly
2. Submit render with parameters
3. Poll for completion (max 5 min)
4. Return preview/download URLs
5. Auto-delete from Plainly after 60 seconds

### MCP Server

Plainly MCP server is configured in `mcp_config.json`:

```json
{
  "plainly": {
    "command": "npx",
    "args": ["-y", "@plainly-videos/mcp-server@latest"],
    "env": {
      "PLAINLY_API_KEY": "your_api_key"
    }
  }
}
```

**Available MCP Tools:**
- `list_renderable_items`
- `get_renderable_items_details`
- `render_item`
- `check_render_status`

## Supabase Integration

### Configuration

```env
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_SECRET=your_service_key
SUPABASE_PROJECT_ID=your_project_id
```

### Database Functions

**lib/supabase.ts:**

| Function | Description |
|----------|-------------|
| `getTemplates()` | Fetch all templates |
| `getTemplateBySlug(slug)` | Fetch single template |
| `createRenderJob(templateId, params)` | Create render job |
| `updateRenderJob(id, updates)` | Update job status |
