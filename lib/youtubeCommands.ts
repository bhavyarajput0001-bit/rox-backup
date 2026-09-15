/**
 * Local YouTube automation commands — runs against FreeLLM locally.
 * No YouTube API, no OAuth, no internet required (just local FreeLLM).
 *
 * Each command generates content (scripts, titles, descriptions, tags, etc.)
 * by calling the local FreeLLM endpoint at localhost:31415.
 */

export type LocalYTCommand =
  | { command: "yt_script"; topic: string; style?: string; length?: string }
  | { command: "yt_title"; topic: string }
  | { command: "yt_description"; topic: string }
  | { command: "yt_tags"; topic: string }
  | { command: "yt_seo"; topic: string }
  | { command: "yt_thumbnail"; topic: string }
  | { command: "yt_ideas"; niche?: string }
  | { command: "yt_calendar"; niche: string; count?: number }
  | { command: "yt_hook"; topic: string }
  | { command: "yt_chapters"; topic: string; duration?: string }
  | { command: "yt_hashtags"; topic: string }
  | { command: "yt_caption"; topic: string; platform?: string }
  | { command: "yt_outline"; topic: string }
  | { command: "yt_research"; topic: string }
  | { command: "yt_compete"; topic: string }
  | { command: "yt_plan"; niche: string; count?: number }
  | { command: "yt_help" };

type YTResult = { reply: string; ok: boolean };

const FREELLM_URL =
  (process.env.FREELLM_BASE_URL || "http://127.0.0.1:31415") +
  "/chat/completions";
const FREELLM_KEY = process.env.FREELLM_API_KEY || "";

async function askLLM(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const res = await fetch(FREELLM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FREELLM_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.FREELLM_MODEL || "auto",
      temperature: 0.7,
      max_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`FreeLLM returned ${res.status}`);
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content?.trim() || "";
}

// ── Command handlers ──────────────────────────────────────────────

async function ytScript(
  topic: string,
  style?: string,
  length?: string,
): Promise<YTResult> {
  const styleNote = style ? ` Use a ${style} style.` : "";
  const lengthNote = length ? ` Target length: ${length}.` : "";
  const reply = await askLLM(
    "You are a professional YouTube script writer. Write engaging, well-structured video scripts with hooks, narrative flow, and CTAs. Be concise but thorough.",
    `Write a complete YouTube video script about "${topic}".${styleNote}${lengthNote} Include: opening hook (first 5 seconds), intro, main content sections with timestamps, key points, and a strong call-to-action ending.`,
  );
  return { ok: true, reply };
}

async function ytTitle(topic: string): Promise<YTResult> {
  const reply = await askLLM(
    "You are a YouTube title optimization expert. Generate titles that are click-worthy, SEO-friendly, and under 60 characters. Use power words, numbers, and curiosity gaps.",
    `Generate 10 optimized YouTube video titles for a video about "${topic}". Each title should be under 60 characters, include relevant keywords, and use proven title formulas (how-to, list, question, etc). Number each title.`,
  );
  return { ok: true, reply };
}

async function ytDescription(topic: string): Promise<YTResult> {
  const reply = await askLLM(
    "You are a YouTube SEO expert. Write descriptions that rank in YouTube search. Include relevant keywords naturally, timestamps, and engagement hooks.",
    `Write a complete YouTube video description for a video about "${topic}". Include: first 2-3 lines (shown before "Show more"), timestamped sections, relevant keywords naturally placed, social links section, and a subscribe CTA. Make it SEO-optimized but natural.`,
  );
  return { ok: true, reply };
}

async function ytTags(topic: string): Promise<YTResult> {
  const reply = await askLLM(
    "You are a YouTube SEO tag specialist. Generate tags that maximize discoverability. Include short-tail, long-tail, and trending tags.",
    `Generate 30 optimized YouTube tags for a video about "${topic}". Include: primary keyword tags, long-tail variations, related topics, trending tags, and misspellings people commonly search. Format as a comma-separated list with the most important tags first.`,
  );
  return { ok: true, reply };
}

async function ytSEO(topic: string): Promise<YTResult> {
  const reply = await askLLM(
    "You are a YouTube SEO expert. Generate complete SEO packages: title, description, tags, and hashtags all optimized for maximum reach.",
    `Create a complete YouTube SEO package for a video about "${topic}". Include:\n\n1. TITLE (5 variations, under 60 chars each)\n2. DESCRIPTION (first 3 lines + full SEO description with timestamps and keywords)\n3. TAGS (30 tags, comma-separated, ranked by importance)\n4. HASHTAGS (10 hashtags for the description)\n5. THUMBNAIL TEXT (3 short text overlays for the thumbnail)\n\nMake everything SEO-optimized and click-worthy.`,
  );
  return { ok: true, reply };
}

async function ytThumbnail(topic: string): Promise<YTResult> {
  const reply = await askLLM(
    "You are a YouTube thumbnail designer and CTR optimization expert. Describe visual concepts that drive clicks.",
    `Design 3 thumbnail concepts for a YouTube video about "${topic}". For each concept include:\n1. Main visual element\n2. Text overlay (3-5 words, large and bold)\n3. Color scheme\n4. Expression/emotion to convey\n5. Layout description\n\nFocus on high-CTR design principles: contrast, faces, text hierarchy, curiosity.`,
  );
  return { ok: true, reply };
}

async function ytIdeas(niche?: string): Promise<YTResult> {
  const nicheNote = niche ? ` in the "${niche}" niche` : "";
  const reply = await askLLM(
    "You are a YouTube content strategist. Generate viral content ideas based on trends, search demand, and audience engagement patterns.",
    `Generate 15 YouTube video ideas${nicheNote}. For each idea include:\n- Title concept\n- Why it would perform (search volume, trending, engagement potential)\n- Target audience\n- Video format (tutorial, list, story, review, etc)\n- Estimated difficulty (easy/medium/hard)\n\nFocus on a mix of evergreen and trending topics.`,
  );
  return { ok: true, reply };
}

async function ytCalendar(niche: string, count?: number): Promise<YTResult> {
  const videoCount = count || 12;
  const reply = await askLLM(
    "You are a YouTube content calendar planner. Create strategic publishing schedules that balance evergreen and trending content.",
    `Create a ${videoCount}-week YouTube content calendar for the "${niche}" niche. For each week include:\n- Video topic and title\n- Content format (tutorial, list, review, story)\n- Target publish day\n- SEO focus keywords\n- Cross-promotion strategy\n\nBalance: 40% evergreen, 30% trending, 20% series, 10% experimental.`,
  );
  return { ok: true, reply };
}

async function ytHook(topic: string): Promise<YTResult> {
  const reply = await askLLM(
    "You are a YouTube hook expert. The first 5 seconds determine if viewers stay. Write hooks that create immediate engagement.",
    `Write 10 different opening hooks for a YouTube video about "${topic}". Each hook should:\n1. Be under 15 words\n2. Create curiosity or surprise\n3. Use proven hook patterns (question, bold claim, story start, controversy, pattern interrupt)\n\nLabel each hook with its pattern type and explain why it works.`,
  );
  return { ok: true, reply };
}

async function ytChapters(topic: string, duration?: string): Promise<YTResult> {
  const dur = duration || "10 minutes";
  const reply = await askLLM(
    "You are a YouTube chapter/timestamp optimizer. Chapters improve watch time, SEO, and user experience.",
    `Create optimized YouTube chapters for a ${dur} video about "${topic}". Include:\n- Timestamp for each chapter (starting at 00:00)\n- Descriptive chapter title with keywords\n- Brief content note for each section\n- Optimal chapter count (5-8 chapters)\n\nMake sure the first chapter is click-worthy and chapters flow naturally.`,
  );
  return { ok: true, reply };
}

async function ytHashtags(topic: string): Promise<YTResult> {
  const reply = await askLLM(
    "You are a YouTube hashtag strategist. Hashtags boost discoverability but must be used strategically.",
    `Generate 15 YouTube hashtags for a video about "${topic}". Include:\n- 3 branded/channel hashtags\n- 5 primary topic hashtags (high volume)\n- 4 long-tail hashtags (low competition)\n- 3 trending hashtags (current trends)\n\nFormat: #hashtag (each on new line). Rank by importance. Explain why each category matters.`,
  );
  return { ok: true, reply };
}

async function ytCaption(topic: string, platform?: string): Promise<YTResult> {
  const plat = platform || "Instagram";
  const reply = await askLLM(
    "You are a social media caption writer. Write captions that drive engagement and cross-promote YouTube content.",
    `Write 3 social media captions for ${plat} to promote a YouTube video about "${topic}". Each caption should:\n1. Be platform-optimized (character limit, hashtag count, tone)\n2. Include a hook in the first line\n3. Drive viewers to the YouTube video\n4. Include relevant emojis\n5. Have a clear CTA\n\nLabel each as Version A, B, C with different tones (professional, casual, provocative).`,
  );
  return { ok: true, reply };
}

async function ytOutline(topic: string): Promise<YTResult> {
  const reply = await askLLM(
    "You are a YouTube content planner. Create detailed video outlines that ensure comprehensive coverage and viewer retention.",
    `Create a detailed video outline for "${topic}". Include:\n1. Video title options (3)\n2. Target audience\n3. Key message/takeaway\n4. Opening hook\n5. Section-by-section outline with:\n   - Main point\n   - Supporting details\n   - Visual/B-roll suggestions\n   - Transition to next section\n6. Closing CTA\n7. Suggested end screen elements\n8. Related video ideas for the series`,
  );
  return { ok: true, reply };
}

async function ytResearch(topic: string): Promise<YTResult> {
  const reply = await askLLM(
    "You are a YouTube research analyst. Analyze topics for content opportunities, audience intent, and competitive angles.",
    `Research the YouTube topic "${topic}" and provide:\n1. Audience Intent: What are viewers actually looking for?\n2. Content Gap: What's missing from existing videos on this topic?\n3. Angle Opportunities: 3 unique angles to stand out\n4. Search Volume Indicators: Related searches people make\n5. Difficulty Assessment: How competitive is this topic?\n6. Monetization Potential: What ads/sponsors fit this content?\n7. Cross-platform Potential: Where else can this content live?\n8. Evergreen vs Trending: How long will this content be relevant?\n\nBe specific and actionable.`,
  );
  return { ok: true, reply };
}

async function ytCompete(topic: string): Promise<YTResult> {
  const reply = await askLLM(
    "You are a YouTube competitive analyst. Study the competitive landscape to find opportunities.",
    `Analyze the YouTube competitive landscape for "${topic}". Provide:\n1. Top 5 competitor content types (what works)\n2. Common title patterns used\n3. Average video lengths that perform\n4. Thumbnail trends\n5. What competitors are doing WRONG (gaps)\n6. Your differentiation strategy\n7. Suggested content mix to compete\n8. Quick wins you can implement immediately\n\nFocus on actionable competitive intelligence.`,
  );
  return { ok: true, reply };
}

async function ytPlan(niche: string, count?: number): Promise<YTResult> {
  const videoCount = count || 10;
  const reply = await askLLM(
    "You are a YouTube channel growth strategist. Create comprehensive content plans that balance growth, engagement, and monetization.",
    `Create a complete ${videoCount}-video content plan for a "${niche}" YouTube channel. For each video include:\n1. Title (SEO optimized)\n2. Video format and style\n3. Target length\n4. Hook concept\n5. Key talking points\n6. SEO keywords\n7. Thumbnail concept\n8. Expected difficulty\n9. Growth potential (low/medium/high)\n10. Why this video fits the channel\n\nOrganize by priority: first 3 videos for channel launch, next 3 for momentum, last 4 for growth.`,
  );
  return { ok: true, reply };
}

// ── Command router ────────────────────────────────────────────────

export async function runLocalYTCommand(
  cmd: LocalYTCommand,
): Promise<YTResult> {
  try {
    switch (cmd.command) {
      case "yt_script":
        return await ytScript(cmd.topic, cmd.style, cmd.length);
      case "yt_title":
        return await ytTitle(cmd.topic);
      case "yt_description":
        return await ytDescription(cmd.topic);
      case "yt_tags":
        return await ytTags(cmd.topic);
      case "yt_seo":
        return await ytSEO(cmd.topic);
      case "yt_thumbnail":
        return await ytThumbnail(cmd.topic);
      case "yt_ideas":
        return await ytIdeas(cmd.niche);
      case "yt_calendar":
        return await ytCalendar(cmd.niche, cmd.count);
      case "yt_hook":
        return await ytHook(cmd.topic);
      case "yt_chapters":
        return await ytChapters(cmd.topic, cmd.duration);
      case "yt_hashtags":
        return await ytHashtags(cmd.topic);
      case "yt_caption":
        return await ytCaption(cmd.topic, cmd.platform);
      case "yt_outline":
        return await ytOutline(cmd.topic);
      case "yt_research":
        return await ytResearch(cmd.topic);
      case "yt_compete":
        return await ytCompete(cmd.topic);
      case "yt_plan":
        return await ytPlan(cmd.niche, cmd.count);
      case "yt_help":
        return {
          ok: true,
          reply: [
            "YouTube Local Commands (no API needed):",
            "",
            "  yt script <topic>           — Generate a video script",
            "  yt title <topic>            — Generate 10 optimized titles",
            "  yt description <topic>      — Generate SEO description",
            "  yt tags <topic>             — Generate 30 SEO tags",
            "  yt seo <topic>              — Full SEO package (title+desc+tags+hashtags)",
            "  yt thumbnail <topic>        — Design 3 thumbnail concepts",
            "  yt ideas [niche]            — Generate 15 content ideas",
            "  yt calendar <niche>         — Create content calendar",
            "  yt hook <topic>             — Generate 10 video hooks",
            "  yt chapters <topic>         — Generate chapter timestamps",
            "  yt hashtags <topic>         — Generate hashtags",
            "  yt caption <topic>          — Social media captions",
            "  yt outline <topic>          — Detailed video outline",
            "  yt research <topic>         — Research topic angles",
            "  yt compete <topic>          — Competitive analysis",
            "  yt plan <niche>             — Full content plan",
            "",
            "All commands run locally via FreeLLM. No internet or YouTube API needed.",
          ].join("\n"),
        };
      default:
        return { ok: false, reply: "Unknown local YouTube command." };
    }
  } catch (error) {
    return {
      ok: false,
      reply: `Command failed: ${error instanceof Error ? error.message : "unknown error"}. Is FreeLLM running on localhost:31415?`,
    };
  }
}
