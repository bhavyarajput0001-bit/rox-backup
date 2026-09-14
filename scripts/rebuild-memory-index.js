const fs = require("fs").promises;
const path = require("path");

const DATA_DIR = path.join(process.cwd(), ".rox-data");
const MEMORY_ITEMS_PATH = path.join(DATA_DIR, "memory_items.json");
const MEMORY_INDEX_PATH = path.join(DATA_DIR, "memory_index.json");

async function loadJSON(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function rebuildIndex() {
  let items = [];
  try {
    const raw = await fs.readFile(MEMORY_ITEMS_PATH, "utf8");
    items = JSON.parse(raw);
  } catch {
    // No items yet
  }
  
  const categories = {};
  const tags = {};
  
  for (const item of items) {
    categories[item.category] = (categories[item.category] ?? 0) + 1;
    for (const tag of item.tags) {
      tags[tag] = (tags[tag] ?? 0) + 1;
    }
  }
  
  const index = {
    version: "1.0",
    lastUpdated: new Date().toISOString(),
    totalItems: items.length,
    categories,
    tags,
  };
  
  await fs.writeFile(MEMORY_INDEX_PATH, JSON.stringify(index, null, 2));
  return index;
}

rebuildIndex().then((index) => {
  console.log("✅ Index rebuilt:");
  console.log(`   Total items: ${index.totalItems}`);
  console.log(`   Categories: ${Object.entries(index.categories).filter(([, c]) => c > 0).map(([k]) => k).join(", ") || "none"}`);
  console.log(`   Top tags: ${Object.entries(index.tags).sort(([, a], [, b]) => b - a).slice(0, 10).map(([t]) => t).join(", ") || "none"}`);
});
