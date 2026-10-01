# Rox Quick Commands Reference

**83 pre-built commands** that Rox can execute instantly without going through the LLM.

## 📱 App Launchers (18 commands)

```
open youtube          → https://www.youtube.com
open spotify          → Launch Spotify app
open terminal         → Open Terminal
open vscode           → code .
open notes            → Apple Notes
open safari           → Safari browser
open chrome           → Google Chrome
open slack            → Slack
open discord          → Discord
open calculator       → Calculator app
open maps             → Google Maps
open photos           → Photos app
open finder           → Finder
open calendar         → Calendar app
open messages         → Messages app
open mail             → Mail app
open facetime         → FaceTime
open system preferences → System Settings
open lock screen      → Lock the screen
open sleep            → Put Mac to sleep
open screensaver      → Start screensaver
```

## 🎬 YouTube Commands (13 commands)

```
yt status             → Check agent status
yt jobs               → List active jobs
yt dashboard          → Open dashboard
yt generate <topic>   → Generate video
yt title <topic>      → Generate title
yt script <topic>     → Generate script
yt ideas              → Get content ideas
yt analytics          → View analytics
yt hashtags <topic>   → Generate hashtags
yt chapters <topic>   → Generate chapters
yt hook <topic>       → Generate hook
yt calendar           → Show content calendar
yt compete <channel>  → Analyze competitors
```

## 🔍 Search & Info (4 commands)

```
search for React tips → Web search via Exa
news                  → Latest tech headlines
weather in London     → Weather via wttr.in
time                  → Current time & date
```

## 🎵 Spotify Commands (10 commands)

```
spotify play          → Resume playback
spotify pause         → Pause playback
spotify next          → Skip track
spotify prev          → Previous track
spotify volume 50     → Set volume (0-100%)
spotify shuffle on    → Toggle shuffle
spotify repeat one    → Set repeat mode
spotify now           → Current track info
spotify search indie  → Search Spotify
spotify queue         → Show queue
```

## 💻 System Commands (12 commands)

```
status                → Check Rox status
help                  → Show all commands
?                     → Show help
screenshot            → Take screenshot
clipboard             → Show clipboard content
disk space            → Check storage
memory usage          → Check RAM
cpu info              → CPU model
battery               → Battery level
whoami                → Current user
hostname              → Computer name
grep search for react → Search files
```

## 🛠️ Development Commands (7 commands)

```
npm run dev           → Check dev server
npm run build         → Build project
npm install           → Install dependencies
git status            → Git status
git log               → Recent commits
git diff              → Changes summary
graft build           → Build Graft graph
multi agent status    → Show agent stats
memory status         → Show memory count
rox rewire            → Re-wire repos
rox rebuild memory    → Rebuild memory index
```

## 📁 File Commands (4 commands)

```
ls in /Users/...      → List directory
read /path/file.txt   → Read file
create file named x   → Create file
grep search pattern   → Search file contents
```

## 🚫 Safety Commands (2 commands)

```
restart mac           → Returns safety warning
shutdown mac          → Returns safety warning
```

## How It Works

1. User types a command
2. Rox matches it against 83 pre-built patterns
3. Executes instantly (no LLM call = sub-second response)
4. Result is logged to memory for future recall

## Adding New Commands

Edit `lib/quickCommands.ts` and add a new entry:

```ts
{
  name: "command_name",
  pattern: /^pattern$/i,
  description: "What it does",
  execute: async (args) => {
    // Return { ok: boolean, reply: string }
  },
}
```
