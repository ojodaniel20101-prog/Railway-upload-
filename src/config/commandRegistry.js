/**
 * commandRegistry.js — Central registry for all WhatsApp bot commands.
 * v3.4 — Final update with full command list and categories.
 */

const commandRegistry = [
  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP MANAGEMENT — Moderation
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "kick",
    category: "group management",
    subCategory: "moderation",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "⚔️",
    description: "Removes a user from the group.",
    usage: ".kick @user | reply"
  },
  {
    name: "ban",
    category: "group management",
    subCategory: "moderation",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "🚫",
    description: "Bans a user from the group persistently.",
    usage: ".ban @user | reply | number"
  },
  {
    name: "unban",
    category: "group management",
    subCategory: "moderation",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "✅",
    description: "Removes a user from the group blacklist.",
    usage: ".unban @user | reply | number"
  },
  {
    name: "add",
    category: "group management",
    subCategory: "moderation",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "⚔️",
    description: "Adds a user to the group.",
    usage: ".add <number>"
  },
  {
    name: "promote",
    category: "group management",
    subCategory: "moderation",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "⚔️",
    description: "Promotes a user to admin.",
    usage: ".promote @user | reply"
  },
  {
    name: "demote",
    category: "group management",
    subCategory: "moderation",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "⚔️",
    description: "Demotes an admin to regular user.",
    usage: ".demote @user | reply"
  },
  {
    name: "warn",
    category: "group management",
    subCategory: "moderation",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "⚔️",
    description: "Warns a user (3 warnings = kick).",
    usage: ".warn @user | reply"
  },
  {
    name: "warnings",
    category: "group management",
    subCategory: "moderation",
    roleRequired: "user",
    groupOnly: true,
    emoji: "⚔️",
    description: "Checks warning count for a user.",
    usage: ".warnings @user | reply"
  },
  {
    name: "clearwarnings",
    category: "group management",
    subCategory: "moderation",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "⚔️",
    description: "Clears all warnings for a user.",
    usage: ".clearwarnings @user | reply"
  },
  {
    name: "mute",
    category: "group management",
    subCategory: "moderation",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "⚔️",
    description: "Mutes the group (admins only can send).",
    usage: ".mute"
  },
  {
    name: "unmute",
    category: "group management",
    subCategory: "moderation",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "⚔️",
    description: "Unmutes the group (all can send).",
    usage: ".unmute"
  },
  {
    name: "delete",
    category: "group management",
    subCategory: "moderation",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "⚔️",
    description: "Deletes a message (reply to it).",
    usage: ".delete (reply to message)"
  },
  {
    name: "mutemember",
    category: "group management",
    subCategory: "moderation",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "🔇",
    description: "Mutes a member in the group. Their messages will be automatically deleted.",
    usage: ".mutemember @user | reply | number"
  },
  {
    name: "unmutemember",
    category: "group management",
    subCategory: "moderation",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "🔊",
    description: "Unmutes a member in the group.",
    usage: ".unmutemember @user | reply | number"
  },
  {
    name: "tagall",
    category: "group management",
    subCategory: "moderation",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "⚔️",
    description: "Tags all participants.",
    usage: ".tagall [message]"
  },
  {
    name: "hidetag",
    category: "group management",
    subCategory: "moderation",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "⚔️",
    description: "Tags all participants silently.",
    usage: ".hidetag [message]"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP MANAGEMENT — Group Settings
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "setname",
    category: "group management",
    subCategory: "settings",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "⚙️",
    description: "Sets the group name.",
    usage: ".setname <new name>"
  },
  {
    name: "setdesc",
    category: "group management",
    subCategory: "settings",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "⚙️",
    description: "Sets the group description.",
    usage: ".setdesc <description>"
  },
  {
    name: "revoke",
    category: "group management",
    subCategory: "settings",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "⚙️",
    description: "Revokes the group invite link.",
    usage: ".revoke"
  },
  {
    name: "open",
    category: "group management",
    subCategory: "settings",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "⚙️",
    description: "Opens the group (all can send).",
    usage: ".open"
  },
  {
    name: "close",
    category: "group management",
    subCategory: "settings",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "⚙️",
    description: "Closes the group (admins only).",
    usage: ".close"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GROUP MANAGEMENT — Automation / Protection
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "antilink",
    category: "group management",
    subCategory: "protection",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "🤖",
    description: "Blocks all link types (HTTP, Telegram, social media, etc.).",
    usage: ".antilink on/off [warn/kick]"
  },
  {
    name: "antiinvite",
    category: "group management",
    subCategory: "protection",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "🤖",
    description: "Blocks WhatsApp group invite links.",
    usage: ".antiinvite on/off [warn/kick]"
  },
  {
    name: "antitag",
    category: "group management",
    subCategory: "protection",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "🤖",
    description: "Blocks mass @mentions (5+ at once).",
    usage: ".antitag on/off [warn/kick]"
  },
  {
    name: "antibadwords",
    category: "group management",
    subCategory: "protection",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "🤖",
    description: "Blocks messages with bad words.",
    usage: ".antibadwords on/off [warn/kick]"
  },
  {
    name: "antiflood",
    category: "group management",
    subCategory: "protection",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "🤖",
    description: "Blocks message flooding (5+ in 5s).",
    usage: ".antiflood on/off [warn/kick]"
  },
  {
    name: "antibot",
    category: "group management",
    subCategory: "protection",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "🤖",
    description: "AI-powered bot/spam detection.",
    usage: ".antibot off/detect/on/strict/status"
  },
  {
    name: "antihijack",
    category: "group management",
    subCategory: "protection",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "🛡️",
    description: "Protects the group from admin demotion attacks and hijack commands.",
    usage: ".antihijack on | .antihijack off | .antihijack status"
  },
  {
    name: "antipromote",
    category: "group management",
    subCategory: "protection",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "🤖",
    description: "Prevents unauthorized admin promotions.",
    usage: ".antipromote on/off [demote/kick]"
  },
  {
    name: "raid",
    description: "Toggle the raid shield (auto-detect coordinated join attacks)",
    category: "group management",
    subCategory: "protection",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "🛡️",
    usage: ".raid on | .raid off"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AI — Advanced AI Assistant Commands
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "think",
    category: "ai",
    subCategory: "reasoning",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🧠",
    description: "Deep thinking AI with reasoning steps.",
    usage: ".think <query>"
  },
  {
    name: "logic",
    category: "ai",
    subCategory: "reasoning",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🧠",
    description: "Logical and analytical problem solver.",
    usage: ".logic <query>"
  },
  {
    name: "gpt",
    category: "ai",
    subCategory: "conversation",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🤖",
    description: "Standard GPT-5 AI assistant.",
    usage: ".gpt <query>"
  },
  {
    name: "codeai",
    category: "ai",
    subCategory: "development",
    roleRequired: "user",
    groupOnly: false,
    emoji: "💻",
    description: "Coding and development assistance.",
    usage: ".codeai <query>"
  },
  {
    name: "chatx",
    category: "ai",
    subCategory: "creative",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Creative and conversational AI.",
    usage: ".chatx <query>"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AI — Image Generation
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "realistic",
    category: "ai",
    subCategory: "image",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🖼️",
    description: "Generate realistic photographic images.",
    usage: ".realistic <prompt>"
  },
  {
    name: "anime",
    category: "ai",
    subCategory: "image",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🖼️",
    description: "Generate anime-style images.",
    usage: ".anime <prompt>"
  },
  {
    name: "fantasy",
    category: "ai",
    subCategory: "image",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🖼️",
    description: "Generate fantasy artistic images.",
    usage: ".fantasy <prompt>"
  },
  {
    name: "cyberpunk",
    category: "ai",
    subCategory: "image",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🖼️",
    description: "Generate cyberpunk futuristic images.",
    usage: ".cyberpunk <prompt>"
  },
  {
    name: "watercolor",
    category: "ai",
    subCategory: "image",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🖼️",
    description: "Generate watercolor painting style images.",
    usage: ".watercolor <prompt>"
  },
  {
    name: "oil-painting",
    category: "ai",
    subCategory: "image",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🖼️",
    description: "Generate oil painting style images.",
    usage: ".oil-painting <prompt>"
  },
  {
    name: "pixel-art",
    category: "ai",
    subCategory: "image",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🖼️",
    description: "Generate pixel art style images.",
    usage: ".pixel-art <prompt>"
  },
  {
    name: "sketch",
    category: "ai",
    subCategory: "image",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🖼️",
    description: "Generate sketch drawing style images.",
    usage: ".sketch <prompt>"
  },
  {
    name: "cartoon",
    category: "ai",
    subCategory: "image",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🖼️",
    description: "Generate cartoon style images.",
    usage: ".cartoon <prompt>"
  },
  {
    name: "abstract",
    category: "ai",
    subCategory: "image",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🖼️",
    description: "Generate abstract art images.",
    usage: ".abstract <prompt>"
  },
  {
    name: "minimalist",
    category: "ai",
    subCategory: "image",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🖼️",
    description: "Generate minimalist style images.",
    usage: ".minimalist <prompt>"
  },
  {
    name: "surreal",
    category: "ai",
    subCategory: "image",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🖼️",
    description: "Generate surreal abstract images.",
    usage: ".surreal <prompt>"
  },
  {
    name: "vintage",
    category: "ai",
    subCategory: "image",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🖼️",
    description: "Generate vintage retro style images.",
    usage: ".vintage <prompt>"
  },
  {
    name: "steampunk",
    category: "ai",
    subCategory: "image",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🖼️",
    description: "Generate steampunk style images.",
    usage: ".steampunk <prompt>"
  },
  {
    name: "horror",
    category: "ai",
    subCategory: "image",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🖼️",
    description: "Generate horror dark style images.",
    usage: ".horror <prompt>"
  },
  {
    name: "sci-fi",
    category: "ai",
    subCategory: "image",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🖼️",
    description: "Generate science fiction style images.",
    usage: ".sci-fi <prompt>"
  },
  {
    name: "pop-art",
    category: "ai",
    subCategory: "image",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🖼️",
    description: "Generate pop art style images.",
    usage: ".pop-art <prompt>"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AI — Automation
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "aichat",
    category: "ai",
    subCategory: "automation",
    roleRequired: "owner",
    groupOnly: false,
    emoji: "🔥",
    description: "Toggles global AI chatbot mode (GPT-5 powered).",
    usage: ".aichat on/off"
  },
  {
    name: "voicemode",
    category: "ai",
    subCategory: "automation",
    roleRequired: "admin",
    groupOnly: false,
    emoji: "🎙️",
    description: "Make the AI reply with voice notes in the chosen language.",
    usage: ".voicemode <language|off> — e.g. .voicemode english"
  },
  {
    name: "autoreact",
    category: "ai",
    subCategory: "automation",
    roleRequired: "owner",
    groupOnly: false,
    emoji: "🔥",
    description: "Toggles AI-powered human-like reactions.",
    usage: ".autoreact on/off [mode]"
  },
  {
    name: "autotype",
    category: "ai",
    subCategory: "automation",
    roleRequired: "owner",
    groupOnly: false,
    emoji: "🔥",
    description: "Toggles human-like typing presence.",
    usage: ".autotype on/off"
  },
  {
    name: "autorecord",
    category: "ai",
    subCategory: "automation",
    roleRequired: "owner",
    groupOnly: false,
    emoji: "🔥",
    description: "Toggles human-like voice recording presence.",
    usage: ".autorecord on/off"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM — Owner-level system commands
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "stats",
    category: "system",
    subCategory: "info",
    roleRequired: "owner",
    groupOnly: false,
    emoji: "📊",
    description: "Displays system statistics.",
    usage: ".stats"
  },
  {
    name: "uptime",
    category: "system",
    subCategory: "info",
    roleRequired: "owner",
    groupOnly: false,
    emoji: "⏱",
    description: "Displays bot uptime.",
    usage: ".uptime"
  },
  {
    name: "logs",
    category: "system",
    subCategory: "info",
    roleRequired: "owner",
    groupOnly: false,
    emoji: "🧾",
    description: "Retrieves recent bot logs.",
    usage: ".logs"
  },
  {
    name: "system",
    category: "system",
    subCategory: "control",
    roleRequired: "owner",
    groupOnly: false,
    emoji: "🧬",
    description: "Executes a system shell command.",
    usage: ".system <command>"
  },
  {
    name: "mode",
    category: "system",
    subCategory: "control",
    roleRequired: "owner",
    groupOnly: false,
    emoji: "🎛️",
    description: "Sets bot mode (self/public).",
    usage: ".mode self/public"
  },
  {
    name: "broadcast",
    category: "system",
    subCategory: "control",
    roleRequired: "owner",
    groupOnly: false,
    emoji: "📢",
    description: "Broadcasts a message to all sessions.",
    usage: ".broadcast <message>"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERAL — Fun, utility, and info commands
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "menu",
    category: "general",
    subCategory: "info",
    roleRequired: "user",
    groupOnly: false,
    emoji: "ℹ️",
    description: "Displays the full command menu.",
    usage: ".menu"
  },
  {
    name: "help",
    category: "general",
    subCategory: "info",
    roleRequired: "user",
    groupOnly: false,
    emoji: "❓",
    description: "Shows help information.",
    usage: ".help"
  },
  {
    name: "ping",
    category: "general",
    subCategory: "utility",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🔧",
    description: "Checks bot response time.",
    usage: ".ping"
  },
  {
    name: "vv",
    category: "general",
    subCategory: "utility",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Downloads view-once media.",
    usage: ".vv (reply to view-once)"
  },
  {
    name: "vv2",
    category: "general",
    subCategory: "utility",
    roleRequired: "owner",
    groupOnly: false,
    emoji: "🎬",
    description: "Downloads view-once media and sends to owner DM.",
    usage: ".vv2 (reply to view-once)"
  },
  {
    name: "vv3",
    category: "general",
    subCategory: "utility",
    roleRequired: "owner",
    groupOnly: false,
    emoji: "🎬",
    description: "Toggle auto-capture of view-once messages in this chat.",
    usage: ".vv3 on/off"
  },
  {
    name: "ytmp4",
    category: "general",
    subCategory: "utility",
    roleRequired: "user",
    groupOnly: false,
    emoji: "📺",
    description: "Download YouTube video as MP4.",
    usage: ".ytmp4 <url>"
  },

  {
    name: "ytmp3",
    category: "general",
    subCategory: "utility",
    roleRequired: "user",
    groupOnly: false,
    emoji: "📺",
    description: "Download YouTube video as MP4.",
    usage: ".ytmp3 <url or search>"
  },
  {
    name: "tiktok",
    category: "general",
    subCategory: "utility",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Downloads TikTok video.",
    usage: ".tiktok <url>"
  },
  {
    name: "instagram",
    category: "general",
    subCategory: "utility",
    roleRequired: "user",
    groupOnly: false,
    emoji: "📸",
    description: "Downloads Instagram media.",
    usage: ".instagram <url>"
  },
  {
    name: "facebook",
    category: "general",
    subCategory: "utility",
    roleRequired: "user",
    groupOnly: false,
    emoji: "👥",
    description: "Downloads Facebook video.",
    usage: ".facebook <url>"
  },
  {
    name: "twitter",
    category: "general",
    subCategory: "utility",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🐦",
    description: "Downloads Twitter (X) media.",
    usage: ".twitter <url>"
  },
  {
    name: "joke",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎉",
    description: "Sends a random joke.",
    usage: ".joke"
  },
  {
    name: "quote",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎉",
    description: "Sends a random inspirational quote.",
    usage: ".quote"
  },
  {
    name: "8ball",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎉",
    description: "Ask the magic 8-ball a question.",
    usage: ".8ball <question>"
  },
  {
    name: "flip",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎉",
    description: "Flips a coin (heads or tails).",
    usage: ".flip"
  },
  {
    name: "roll",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎉",
    description: "Rolls a dice (1-6 or custom sides).",
    usage: ".roll [sides]"
  },
  {
    name: "ship",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: true,
    emoji: "🎉",
    description: "Calculates compatibility between two users.",
    usage: ".ship @user1 @user2"
  },
  {
    name: "roast",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎉",
    description: "Roasts a user (all in good fun!).",
    usage: ".roast @user | reply"
  },
  {
    name: "compliment",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎉",
    description: "Compliments a user.",
    usage: ".compliment @user | reply"
  },
  {
    name: "dare",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎉",
    description: "Gives a random dare challenge.",
    usage: ".dare"
  },
  {
    name: "truth",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎉",
    description: "Asks a random truth question.",
    usage: ".truth"
  },
  {
    name: "fact",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎉",
    description: "Shares a random interesting fact.",
    usage: ".fact"
  },
  {
    name: "rizz",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎉",
    description: "Generates a smooth pickup line.",
    usage: ".rizz"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ANIME — Random Anime GIF Commands
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "hug",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Get a random anime hug GIF.",
    usage: ".hug @user | reply"
  },
  {
    name: "slap",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Get a random anime slap GIF.",
    usage: ".slap @user | reply"
  },
  {
    name: "pat",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Get a random anime pat GIF.",
    usage: ".pat @user | reply"
  },
  {
    name: "cry",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Get a random anime cry GIF.",
    usage: ".cry"
  },
  {
    name: "kill",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Get a random anime kill GIF.",
    usage: ".kill @user | reply"
  },
  {
    name: "bite",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Get a random anime bite GIF.",
    usage: ".bite @user | reply"
  },
  {
    name: "yeet",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Get a random anime yeet GIF.",
    usage: ".yeet @user | reply"
  },
  {
    name: "bully",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Get a random anime bully GIF.",
    usage: ".bully @user | reply"
  },
  {
    name: "bonk",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Get a random anime bonk GIF.",
    usage: ".bonk @user | reply"
  },
  {
    name: "wink",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Get a random anime wink GIF.",
    usage: ".wink @user | reply"
  },
  {
    name: "poke",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Get a random anime poke GIF.",
    usage: ".poke @user | reply"
  },
  {
    name: "nom",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Get a random anime nom GIF.",
    usage: ".nom @user | reply"
  },
  {
    name: "smile",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Get a random anime smile GIF.",
    usage: ".smile"
  },
  {
    name: "wave",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Get a random anime wave GIF.",
    usage: ".wave @user | reply"
  },
  {
    name: "awoo",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Get a random anime awoo GIF.",
    usage: ".awoo"
  },
  {
    name: "blush",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Get a random anime blush GIF.",
    usage: ".blush"
  },
  {
    name: "smug",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Get a random anime smug GIF.",
    usage: ".smug"
  },
  {
    name: "glomp",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Get a random anime glomp GIF.",
    usage: ".glomp @user | reply"
  },
  {
    name: "happy",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Get a random anime happy GIF.",
    usage: ".happy"
  },
  {
    name: "dance",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Get a random anime dance GIF.",
    usage: ".dance"
  },
  {
    name: "cringe",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎬",
    description: "Get a random anime cringe GIF.",
    usage: ".cringe"
  },
  {
    name: "block",
    category: "moderation",
    subCategory: "owner",
    roleRequired: "owner",
    groupOnly: false,
    emoji: "🚫",
    description: "Blocks a user from interacting with the bot.",
    usage: ".block [number|mention]"
  },
  {
    name: "unblock",
    category: "moderation",
    subCategory: "owner",
    roleRequired: "owner",
    groupOnly: false,
    emoji: "🔓",
    description: "Unblocks a previously blocked user.",
    usage: ".unblock [number|mention]"
  },
  {
    name: "character",
    category: "general",
    subCategory: "fun",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎭",
    description: "Analyze a user's character based on their profile.",
    usage: ".character [@mention|reply]"
  },
  {
    name: "groupinfo",
    category: "group management",
    subCategory: "utility",
    roleRequired: "user",
    groupOnly: true,
    emoji: "🏢",
    description: "Get detailed information about the current group.",
    usage: ".groupinfo"
  },
  {
    name: "idch",
    category: "utility",
    subCategory: "tools",
    roleRequired: "user",
    groupOnly: false,
    emoji: "📢",
    description: "Get metadata for a WhatsApp Channel via link.",
    usage: ".idch [link]"
  },
  {
    name: "translate",
    category: "utility",
    subCategory: "tools",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🌐",
    description: "Translate text to a specific language.",
    usage: ".translate [lang_code] [text]"
  },
  {
    name: "imageblur",
    category: "media",
    subCategory: "editor",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Apply a blur effect to an image.",
    usage: ".imageblur [reply to image]"
  },
  {
    name: "sticker",
    category: "media",
    subCategory: "editor",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎨",
    description: "Convert an image or video to a sticker.",
    usage: ".sticker [reply to image/video]"
  },
  {
    name: "s",
    category: "media",
    subCategory: "sticker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🎨",
    description: "Convert image/video to a sticker (alias for .sticker).",
    usage: ".s [pack name] — reply to image/video"
  },
  {
    name: "toimg",
    category: "media",
    subCategory: "sticker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🖼️",
    description: "Convert a sticker or WebP to an image.",
    usage: ".toimg — reply to sticker"
  },
  {
    name: "calendar",
    category: "utility",
    subCategory: "tools",
    roleRequired: "user",
    groupOnly: false,
    emoji: "📅",
    description: "Show a calendar for the current or specified month.",
    usage: ".calendar [month] [year]"
  },
  {
    name: "qimgcreate",
    category: "ai",
    subCategory: "image",
    roleRequired: "owner",
    groupOnly: false,
    emoji: "🖼️",
    description: "Generate AI images using Qwen API.",
    usage: ".qimgcreate <prompt> [-size WxH]"
  },
  {
    name: "autostatus",
    category: "automation",
    subCategory: "status",
    roleRequired: "owner",
    groupOnly: false,
    emoji: "👁️",
    description: "Toggle auto-view and react for statuses.",
    usage: ".autostatus on/off"
  },
  {
    name: "welcome",
    category: "automation",
    subCategory: "group",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "👋",
    description: "Toggle professional welcome messages for new members.",
    usage: ".welcome on/off"
  },
  {
    name: "goodbye",
    category: "automation",
    subCategory: "group",
    roleRequired: "admin",
    groupOnly: true,
    emoji: "👋",
    description: "Toggle professional goodbye messages for members who leave.",
    usage: ".goodbye on/off"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT MAKER — Professional Text Effects
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "glitchtext",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Create digital glitch text effects.",
    usage: ".glitchtext <text>"
  },
  {
    name: "writetext",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Write text on wet glass effect.",
    usage: ".writetext <text>"
  },
  {
    name: "advancedglow",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Advanced glow text effects.",
    usage: ".advancedglow <text>"
  },
  {
    name: "typographytext",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Create typography text effect on pavement.",
    usage: ".typographytext <text>"
  },
  {
    name: "pixelglitch",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Create pixel glitch text effect.",
    usage: ".pixelglitch <text>"
  },
  {
    name: "neonglitch",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Create impressive neon glitch text effects.",
    usage: ".neonglitch <text>"
  },
  {
    name: "flagtext",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Nigeria 3D flag text effect.",
    usage: ".flagtext <text>"
  },
  {
    name: "flag3dtext",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "American flag 3D text effect.",
    usage: ".flag3dtext <text>"
  },
  {
    name: "deletingtext",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Create eraser deleting text effect.",
    usage: ".deletingtext <text>"
  },
  {
    name: "blackpinkstyle",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Blackpink style logo maker effect.",
    usage: ".blackpinkstyle <text>"
  },
  {
    name: "glowingtext",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Create glowing text effects.",
    usage: ".glowingtext <text>"
  },
  {
    name: "underwatertext",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "3D underwater text effect.",
    usage: ".underwatertext <text>"
  },
  {
    name: "logomaker",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Free bear logo maker.",
    usage: ".logomaker <text>"
  },
  {
    name: "cartoonstyle",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Create cartoon style graffiti text effect.",
    usage: ".cartoonstyle <text>"
  },
  {
    name: "papercutstyle",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Multicolor 3D paper cut style text effect.",
    usage: ".papercutstyle <text>"
  },
  {
    name: "watercolortext",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Create a watercolor text effect.",
    usage: ".watercolortext <text>"
  },
  {
    name: "effectclouds",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Write text effect clouds in the sky.",
    usage: ".effectclouds <text>"
  },
  {
    name: "blackpinklogo",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Create Blackpink logo online.",
    usage: ".blackpinklogo <text>"
  },
  {
    name: "gradienttext",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Create 3D gradient text effect.",
    usage: ".gradienttext <text>"
  },
  {
    name: "summerbeach",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Write in sand summer beach.",
    usage: ".summerbeach <text>"
  },
  {
    name: "luxurygold",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Create a luxury gold text effect.",
    usage: ".luxurygold <text>"
  },
  {
    name: "multicoloredneon",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Create multicolored neon light signatures.",
    usage: ".multicoloredneon <text>"
  },
  {
    name: "sandsummer",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Write in sand summer beach.",
    usage: ".sandsummer <text>"
  },
  {
    name: "galaxywallpaper",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Create galaxy wallpaper mobile.",
    usage: ".galaxywallpaper <text>"
  },
  {
    name: "style1917",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "1917 style text effect.",
    usage: ".style1917 <text>"
  },
  {
    name: "makingneon",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Making neon light text effect with galaxy style.",
    usage: ".makingneon <text>"
  },
  {
    name: "royaltext",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Royal text effect online.",
    usage: ".royaltext <text>"
  },
  {
    name: "freecreate",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Free create a 3D hologram text effect.",
    usage: ".freecreate <text>"
  },
  {
    name: "galaxystyle",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Create galaxy style free name logo.",
    usage: ".galaxystyle <text>"
  },
  {
    name: "lighteffects",
    category: "media",
    subCategory: "text maker",
    roleRequired: "user",
    groupOnly: false,
    emoji: "✨",
    description: "Create light effects green neon.",
    usage: ".lighteffects <text>"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOLS — URL Shortener
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "dagd",
    category: "utility",
    subCategory: "tools",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🔗",
    description: "Shorten URL using da.gd service.",
    usage: ".dagd <url> [custom_name]"
  },
  {
    name: "vgd",
    category: "utility",
    subCategory: "tools",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🔗",
    description: "Shorten URL using v.gd service.",
    usage: ".vgd <url> [custom_name]"
  },
  {
    name: "tinube",
    category: "utility",
    subCategory: "tools",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🔗",
    description: "Shorten URL using tinu.be service.",
    usage: ".tinube <url> [custom_name]"
  },
  {
    name: "spoome",
    category: "utility",
    subCategory: "tools",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🔗",
    description: "Shorten URL using Spoo.me service.",
    usage: ".spoome <url> [custom_name]"
  },
  {
    name: "spooemoji",
    category: "utility",
    subCategory: "tools",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🔗",
    description: "Shorten URL with emojis using Spoo.me.",
    usage: ".spooemoji <url> [emojis]"
  },
  {
    name: "randomshort",
    category: "utility",
    subCategory: "tools",
    roleRequired: "user",
    groupOnly: false,
    emoji: "🔗",
    description: "Shorten URL using random provider.",
    usage: ".randomshort <url> [custom_name]"
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NSFW — 18+ Content (requires .nsfw on in group)
  // ═══════════════════════════════════════════════════════════════════════════
  { name: "nsfwass",        category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random ass image/video.",        usage: ".nsfwass" },
  { name: "nsfw69",         category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random 69 image/video.",         usage: ".nsfw69" },
  { name: "nsfwpussy",      category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random pussy image/video.",      usage: ".nsfwpussy" },
  { name: "nsfwdick",       category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random dick image/video.",       usage: ".nsfwdick" },
  { name: "nsfwanal",       category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random anal image/video.",       usage: ".nsfwanal" },
  { name: "nsfwboobs",      category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random boobs image/video.",      usage: ".nsfwboobs" },
  { name: "nsfwbdsm",       category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random BDSM image/video.",       usage: ".nsfwbdsm" },
  { name: "nsfwblack",      category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random black porn image/video.", usage: ".nsfwblack" },
  { name: "nsfwbottomless", category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random bottomless image/video.", usage: ".nsfwbottomless" },
  { name: "nsfwcollared",   category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random collared image/video.",   usage: ".nsfwcollared" },
  { name: "nsfwcum",        category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random cum image/video.",        usage: ".nsfwcum" },
  { name: "nsfwcumsluts",   category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random cumsluts image/video.",   usage: ".nsfwcumsluts" },
  { name: "nsfwdp",         category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random DP image/video.",         usage: ".nsfwdp" },
  { name: "nsfwdom",        category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random domination image/video.", usage: ".nsfwdom" },
  { name: "nsfwextreme",    category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random extreme image/video.",    usage: ".nsfwextreme" },
  { name: "nsfwfeet",       category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random feet image/video.",       usage: ".nsfwfeet" },
  { name: "nsfwfinger",     category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random finger image/video.",     usage: ".nsfwfinger" },
  { name: "nsfwfuck",       category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random fuck image/video.",       usage: ".nsfwfuck" },
  { name: "nsfwfuta",       category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random futa image/video.",       usage: ".nsfwfuta" },
  { name: "nsfwgay",        category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random gay porn image/video.",   usage: ".nsfwgay" },
  { name: "nsfwgif",        category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random NSFW GIF.",               usage: ".nsfwgif" },
  { name: "nsfwgroup",      category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random group image/video.",      usage: ".nsfwgroup" },
  { name: "nsfwhentai",     category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random hentai image/video.",     usage: ".nsfwhentai" },
  { name: "nsfwkiss",       category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random kissing image/video.",    usage: ".nsfwkiss" },
  { name: "nsfwlick",       category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random licking image/video.",    usage: ".nsfwlick" },
  { name: "nsfwpegged",     category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random pegged image/video.",     usage: ".nsfwpegged" },
  { name: "nsfwphgif",      category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random PornHub GIF.",            usage: ".nsfwphgif" },
  { name: "nsfwpuffies",    category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random puffies image/video.",    usage: ".nsfwpuffies" },
  { name: "nsfwreal",       category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random real porn image/video.",  usage: ".nsfwreal" },
  { name: "nsfwsuck",       category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random sucking image/video.",    usage: ".nsfwsuck" },
  { name: "nsfwtattoo",     category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random tattoo image/video.",     usage: ".nsfwtattoo" },
  { name: "nsfwtiny",       category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random tiny porn image/video.",  usage: ".nsfwtiny" },
  { name: "nsfwtoys",       category: "nsfw", subCategory: "adult", roleRequired: "user", groupOnly: false, emoji: "🔞", description: "Random toys image/video.",       usage: ".nsfwtoys" },

  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM — Owner Tools
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "rgetfile",
    category: "system",
    subCategory: "owner",
    roleRequired: "owner",
    groupOnly: false,
    emoji: "📁",
    description: "Retrieve, zip, render, or search any file/folder from the bot server.",
    usage: ".rgetfile [-c|-z|-s|-h] <path|query>"
  },
  {
    name: "addcmd",
    category: "system",
    subCategory: "owner",
    roleRequired: "owner",
    groupOnly: false,
    emoji: "🛠️",
    description: "AI-powered: convert any code to ZENTRIX MD BY ZENTRIX TECH style and add it as a live command.",
    usage: ".addcmd <name> | .addcmd list | .addcmd remove <name>"
  }
];

export default commandRegistry;
