# Rox Memory System Documentation

## Overview
Rox uses a structured memory system with categorized recall for better context awareness.

## Directory Structure
```
.rox-data/
├── memory.json           # Raw transcript of conversations
├── memory_items.json     # Organized memory items (structured)
├── memory_index.json     # Search index with tags and categories
├── lessons.json          # Learning lessons from tasks
├── agents/               # Multi-agent department data
│   ├── departments.json  # Department stats and config
│   ├── task_results.json # Task execution history
│   ├── rewiring_log.json # Performance analysis log
│   ├── content/lessons.json
│   ├── code/lessons.json
│   ├── media/lessons.json
│   ├── research/lessons.json
│   └── youtube/lessons.json
└── memory/               # New task tracking
    └── new_task.json
```

## Memory Categories
| Category | Description |
|----------|-------------|
| `youtube` | YouTube automation, titles, scripts, videos |
| `content` | Writing, blogging, copy, emails |
| `code` | File operations, shell commands, development |
| `media` | Image, audio, video generation |
| `research` | Web search, analysis, information gathering |
| `general` | Time, calculations, status, help |
| `skills` | Tools, learning, self-improvement |
| `preferences` | User preferences and settings |

## API Endpoints

### GET /api/memory
Returns memory overview with stats.
```json
{
  "totalItems": 37,
  "categories": { "youtube": 22, "general": 10, ... },
  "recentActivity": [...]
}
```

### GET /api/memory?query=coffee
Search memory by keywords.
```json
{
  "items": [...],
  "total": 5
}
```

### GET /api/memory?category=youtube
Get all items in a category.
```json
{
  "items": [...],
  "count": 22
}
```

### POST /api/memory
Add new memory item.
```json
{
  "content": "User asked about coffee habits",
  "category": "youtube",
  "tags": ["coffee", "morning", "habits"],
  "context": "YouTube title generation"
}
```

## How It Works

1. **Migration**: Old lessons.json and memory.json are migrated into structured items
2. **Indexing**: Each item gets tags, category, and confidence score
3. **Search**: Keyword matching with tag overlap scoring
4. **Recall**: Cross-department recall finds related memories

## Auto-Sync
Memory is synced every 30 minutes via cron job to git backup.
