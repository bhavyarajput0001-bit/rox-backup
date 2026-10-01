import {
  queryMemory,
  getMemoryStats,
  getMemory,
  addMemory,
} from "@/lib/memoryOrg";
import type { MemoryCategory } from "@/lib/memoryOrg";

export async function GET(request: Request) {
  const { pathname } = new URL(request.url);

  // GET /api/memory - stats and overview
  if (pathname === "/api/memory" || pathname === "/api/memory/") {
    const stats = await getMemoryStats();
    return Response.json(stats);
  }

  // GET /api/memory?query=&category=&limit=
  const url = new URL(request.url);
  const query = url.searchParams.get("query");
  const category = url.searchParams.get("category") as
    MemoryCategory | undefined;
  const limit = parseInt(url.searchParams.get("limit") ?? "10");

  if (query) {
    // Search memory
    const results = await queryMemory({ query, category, limit });
    return Response.json(results);
  }

  if (category) {
    // Get items by category
    const items = await getMemory({ category, limit });
    return Response.json({ items, count: items.length });
  }

  // Default: get recent items
  const items = await getMemory({ limit });
  const stats = await getMemoryStats();

  return Response.json({
    items,
    stats,
    categories: Object.entries(stats.index.categories)
      .filter(([, c]) => c > 0)
      .map(([cat]) => cat),
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !("content" in body)) {
    return Response.json({ error: "Missing 'content' field" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const content = String(b.content);
  const category = b.category as MemoryCategory | undefined;
  const tags = Array.isArray(b.tags) ? b.tags.slice(0, 15) : undefined;
  const context = b.context ? String(b.context) : undefined;
  const references = Array.isArray(b.references) ? b.references : undefined;

  const result = await addMemory({
    content,
    category,
    tags,
    context,
    references,
  });

  return Response.json({
    success: true,
    id: result.id,
    category: result.category,
    message: "Memory item added successfully",
  });
}
