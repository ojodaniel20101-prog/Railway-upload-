/**
 * fun.js — Fun and entertainment commands for ZENTRIX MD BY ZENTRIX TECH.
 * Commands: joke, 8ball, flip, roll, quote, ship, roast, compliment, dare, truth, fact, rizz
 */

import { resolveTarget } from '../../utils/targetResolver.js';

// ── Data Arrays ──────────────────────────────────────────────────────────────

const JOKES = [
  "Why don't scientists trust atoms? Because they make up everything! 😂",
  "I told my wife she was drawing her eyebrows too high. She looked surprised. 😅",
  "Why don't skeletons fight each other? They don't have the guts. 💀",
  "I used to hate facial hair, but then it grew on me. 😄",
  "Why did the scarecrow win an award? Because he was outstanding in his field! 🌾",
  "I'm reading a book about anti-gravity. It's impossible to put down! 📚",
  "Did you hear about the mathematician who's afraid of negative numbers? He'll stop at nothing to avoid them! 🔢",
  "Why do cows wear bells? Because their horns don't work! 🐄",
  "I asked the librarian if they had books about paranoia. She whispered, 'They're right behind you!' 📖",
  "What do you call a fake noodle? An impasta! 🍝",
  "Why can't you give Elsa a balloon? Because she'll let it go! 🎈",
  "I would tell you a construction joke, but I'm still working on it. 🔨",
  "What do you call cheese that isn't yours? Nacho cheese! 🧀",
  "Why did the bicycle fall over? Because it was two-tired! 🚲",
  "I told my doctor I broke my arm in two places. He told me to stop going to those places! 💪",
  "What do you call a sleeping dinosaur? A dino-snore! 🦕",
  "Why did the golfer bring an extra pair of pants? In case he got a hole in one! ⛳",
  "What do you call a fish without eyes? A fsh! 🐟",
  "I'm on a seafood diet. I see food and I eat it! 🍔",
  "Why did the tomato turn red? Because it saw the salad dressing! 🥗"
];

const QUOTES = [
  "\"The only way to do great work is to love what you do.\" — Steve Jobs",
  "\"In the middle of every difficulty lies opportunity.\" — Albert Einstein",
  "\"It does not matter how slowly you go as long as you do not stop.\" — Confucius",
  "\"Life is what happens when you're busy making other plans.\" — John Lennon",
  "\"The future belongs to those who believe in the beauty of their dreams.\" — Eleanor Roosevelt",
  "\"It is during our darkest moments that we must focus to see the light.\" — Aristotle",
  "\"Spread love everywhere you go. Let no one ever come to you without leaving happier.\" — Mother Teresa",
  "\"When you reach the end of your rope, tie a knot in it and hang on.\" — Franklin D. Roosevelt",
  "\"Always remember that you are absolutely unique. Just like everyone else.\" — Margaret Mead",
  "\"Do not go where the path may lead, go instead where there is no path and leave a trail.\" — Ralph Waldo Emerson",
  "\"You will face many defeats in life, but never let yourself be defeated.\" — Maya Angelou",
  "\"The greatest glory in living lies not in never falling, but in rising every time we fall.\" — Nelson Mandela",
  "\"In the end, it's not the years in your life that count. It's the life in your years.\" — Abraham Lincoln",
  "\"Never let the fear of striking out keep you from playing the game.\" — Babe Ruth",
  "\"Life is either a daring adventure or nothing at all.\" — Helen Keller",
  "\"Many of life's failures are people who did not realize how close they were to success when they gave up.\" — Thomas A. Edison",
  "\"You have brains in your head. You have feet in your shoes. You can steer yourself any direction you choose.\" — Dr. Seuss",
  "\"If life were predictable it would cease to be life, and be without flavor.\" — Eleanor Roosevelt",
  "\"If you look at what you have in life, you'll always have more.\" — Oprah Winfrey",
  "\"If you set your goals ridiculously high and it's a failure, you will fail above everyone else's success.\" — James Cameron"
];

const EIGHTBALL_RESPONSES = [
  "🎱 It is certain.",
  "🎱 It is decidedly so.",
  "🎱 Without a doubt.",
  "🎱 Yes, definitely.",
  "🎱 You may rely on it.",
  "🎱 As I see it, yes.",
  "🎱 Most likely.",
  "🎱 Outlook good.",
  "🎱 Yes.",
  "🎱 Signs point to yes.",
  "🎱 Reply hazy, try again.",
  "🎱 Ask again later.",
  "🎱 Better not tell you now.",
  "🎱 Cannot predict now.",
  "🎱 Concentrate and ask again.",
  "🎱 Don't count on it.",
  "🎱 My reply is no.",
  "🎱 My sources say no.",
  "🎱 Outlook not so good.",
  "🎱 Very doubtful."
];

const ROASTS = [
  "You're not stupid, you just have bad luck thinking.",
  "I'd agree with you but then we'd both be wrong.",
  "You're like a cloud — when you disappear, it's a beautiful day! ☀️",
  "I'd roast you harder, but my mom said I'm not allowed to burn trash. 🗑️",
  "You're the reason they put instructions on shampoo bottles.",
  "I'd call you a tool, but even tools are useful.",
  "You have your entire life to be an idiot. Why not take today off?",
  "I've seen better arguments in a kindergarten class.",
  "You're not the dumbest person in the world, but you better hope they don't die.",
  "Somewhere out there, a tree is tirelessly producing oxygen for you. You owe it an apology.",
  "You're proof that evolution can go in reverse.",
  "If I had a dollar for every smart thing you said, I'd be broke.",
  "I'd insult you, but nature already did a great job.",
  "You're like a software update — whenever I see you, I think 'Not now.'",
  "I'd explain it to you, but I don't have any crayons with me."
];

const COMPLIMENTS = [
  "You light up every room you walk into! ✨",
  "Your smile could cure a bad day. 😊",
  "You have an incredible way of making people feel valued.",
  "You're one of the most genuine people I know.",
  "Your kindness is contagious — keep spreading it! 💖",
  "You have the rare ability to make everyone around you feel special.",
  "You're stronger than you think. 💪",
  "Your creativity is absolutely inspiring!",
  "You make the world a better place just by being in it. 🌍",
  "You have a heart of gold. 🥇",
  "The way you handle challenges is truly admirable.",
  "You're not just smart — you're wise.",
  "Your energy is absolutely magnetic. ⚡",
  "You have a gift for making complex things seem simple.",
  "You're exactly the kind of person this world needs more of."
];

const DARES = [
  "Send a voice note singing your favorite song! 🎤",
  "Change your profile picture to something funny for 1 hour! 😂",
  "Write a poem about the last person who texted you! 📝",
  "Send a message to your crush right now! 💌",
  "Do 20 push-ups and send a video as proof! 💪",
  "Send a selfie with the silliest face you can make! 🤪",
  "Text your mom 'I love you' right now! ❤️",
  "Speak in rhymes for the next 5 minutes in this chat! 🎵",
  "Send a voice note doing your best animal impression! 🐾",
  "Change your WhatsApp status to 'I love ZENTRIX MD BY ZENTRIX TECH Bot' for 30 minutes! ⚡",
  "Send a GIF that describes your current mood! 😄",
  "Write a short story in exactly 3 sentences! 📖",
  "Send a voice note saying 'I am the greatest' 3 times! 🏆",
  "Tag someone and tell them one thing you genuinely appreciate about them! 💙",
  "Send a message in a language you don't normally speak! 🌍"
];

const TRUTHS = [
  "What's the most embarrassing thing that's ever happened to you?",
  "What's a secret you've never told anyone?",
  "Who was your first crush?",
  "What's the biggest lie you've ever told?",
  "What's something you're afraid to admit you enjoy?",
  "Have you ever cheated on a test?",
  "What's the most childish thing you still do?",
  "What's your biggest regret?",
  "What's the weirdest dream you've ever had?",
  "What's something you've done that you're not proud of?",
  "Have you ever pretended to be sick to avoid something?",
  "What's the most embarrassing song on your playlist?",
  "What's a habit you have that you wish you could break?",
  "What's the most ridiculous thing you've ever believed?",
  "If you could change one thing about yourself, what would it be?"
];

const FACTS = [
  "🧠 The human brain can hold approximately 2.5 petabytes of information — that's about 3 million hours of TV!",
  "🐙 Octopuses have three hearts, blue blood, and can edit their own RNA.",
  "🌍 A day on Venus is longer than a year on Venus.",
  "🍯 Honey never spoils. Archaeologists have found 3,000-year-old honey in Egyptian tombs that was still edible.",
  "🦈 Sharks are older than trees. Sharks have existed for about 450 million years, while trees have only been around for about 350 million years.",
  "🌊 The Pacific Ocean is larger than all of Earth's landmasses combined.",
  "🐘 Elephants are the only animals that can't jump.",
  "⚡ A bolt of lightning is about 5 times hotter than the surface of the sun.",
  "🦋 Butterflies taste with their feet.",
  "🌙 The Moon is moving away from Earth at about 3.8 cm per year.",
  "🐌 A snail can sleep for 3 years.",
  "🦅 Eagles mate for life and can live up to 30 years in the wild.",
  "🧬 You share 50% of your DNA with a banana.",
  "🌡️ Hot water freezes faster than cold water — this is known as the Mpemba effect.",
  "🎵 Music can help plants grow faster.",
  "🐬 Dolphins sleep with one eye open.",
  "🌺 A group of flamingos is called a 'flamboyance'.",
  "🔬 There are more bacteria in your mouth than there are people on Earth.",
  "🌈 A rainbow is actually a full circle — we only see a semicircle from the ground.",
  "🦁 Lions can sleep up to 20 hours a day."
];

const RIZZ_LINES = [
  "Are you a magician? Because whenever I look at you, everyone else disappears. ✨",
  "Do you have a map? I keep getting lost in your eyes. 🗺️",
  "Is your name Google? Because you have everything I've been searching for. 🔍",
  "Are you a parking ticket? Because you've got 'fine' written all over you. 😏",
  "Do you believe in love at first text, or should I message you again? 💬",
  "Are you a camera? Because every time I look at you, I smile. 📸",
  "Is your name Wi-Fi? Because I'm feeling a connection. 📶",
  "Do you have a Band-Aid? I just scraped my knee falling for you. 🩹",
  "Are you a bank loan? Because you have my interest. 💰",
  "If you were a vegetable, you'd be a cute-cumber. 🥒",
  "Are you a star? Because your beauty lights up the darkest night. ⭐",
  "Do you like science? Because I've got great chemistry with you. ⚗️",
  "Are you a keyboard? Because you're just my type. ⌨️",
  "Is your name Spotify? Because I can see you in my future playlist. 🎵",
  "Are you a charger? Because I feel dead without you. 🔋"
];

// ── Helper ────────────────────────────────────────────────────────────────────

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Command Handlers ─────────────────────────────────────────────────────────

export const jokeCommand = {
  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, { text: `😂 *Random Joke*\n\n${randomFrom(JOKES)}` });
  }
};

export const quoteCommand = {
  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, { text: `💭 *Quote of the Moment*\n\n${randomFrom(QUOTES)}` });
  }
};

export const eightBallCommand = {
  execute: async ({ sock, msg, args }) => {
    const jid = msg.key.remoteJid;
    if (args.length === 0) {
      throw new Error('⚠️ Usage: .8ball <your question>');
    }
    const question = args.join(' ');
    const answer = randomFrom(EIGHTBALL_RESPONSES);
    await sock.sendMessage(jid, {
      text: `🎱 *Magic 8-Ball*\n\n❓ Question: ${question}\n\n${answer}`
    });
  }
};

export const flipCommand = {
  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;
    const result = Math.random() < 0.5 ? '🪙 *HEADS*' : '🪙 *TAILS*';
    await sock.sendMessage(jid, { text: `🪙 *Coin Flip*\n\nResult: ${result}` });
  }
};

export const rollCommand = {
  execute: async ({ sock, msg, args }) => {
    const jid = msg.key.remoteJid;
    const sides = parseInt(args[0]) || 6;
    if (sides < 2 || sides > 1000) {
      throw new Error('⚠️ Dice sides must be between 2 and 1000.');
    }
    const result = Math.floor(Math.random() * sides) + 1;
    await sock.sendMessage(jid, {
      text: `🎲 *Dice Roll* (d${sides})\n\nResult: *${result}*`
    });
  }
};

export const shipCommand = {
  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    if (mentions.length < 2) {
      throw new Error('⚠️ Usage: .ship @user1 @user2');
    }

    const user1 = mentions[0].split('@')[0];
    const user2 = mentions[1].split('@')[0];
    const score = Math.floor(Math.random() * 101);

    let emoji = '💔';
    let verdict = 'Not a match...';
    if (score >= 90) { emoji = '💘'; verdict = 'SOULMATES! 🌟'; }
    else if (score >= 75) { emoji = '❤️'; verdict = 'Perfect match!'; }
    else if (score >= 60) { emoji = '💕'; verdict = 'Great chemistry!'; }
    else if (score >= 45) { emoji = '💛'; verdict = 'Could work!'; }
    else if (score >= 30) { emoji = '🧡'; verdict = 'Needs effort.'; }
    else if (score >= 15) { emoji = '💙'; verdict = 'Just friends.'; }

    const bar = '█'.repeat(Math.floor(score / 10)) + '░'.repeat(10 - Math.floor(score / 10));

    await sock.sendMessage(jid, {
      text: `${emoji} *SHIP CALCULATOR* ${emoji}\n\n@${user1} 💞 @${user2}\n\n[${bar}] ${score}%\n\n${verdict}`,
      mentions: mentions.slice(0, 2)
    });
  }
};

export const roastCommand = {
  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg);

    const roast = randomFrom(ROASTS);
    if (target) {
      await sock.sendMessage(jid, {
        text: `🔥 *Roast for @${target.split('@')[0]}*\n\n${roast}\n\n_(All in good fun! 😄)_`,
        mentions: [target]
      });
    } else {
      await sock.sendMessage(jid, {
        text: `🔥 *Random Roast*\n\n${roast}\n\n_(All in good fun! 😄)_`
      });
    }
  }
};

export const complimentCommand = {
  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg);
    const sender = msg.key.participant || msg.key.remoteJid;

    const compliment = randomFrom(COMPLIMENTS);
    if (target) {
      await sock.sendMessage(jid, {
        text: `💖 *Compliment for @${target.split('@')[0]}*\n\n${compliment}`,
        mentions: [target]
      });
    } else {
      await sock.sendMessage(jid, {
        text: `💖 *Compliment for @${sender.split('@')[0]}*\n\n${compliment}`,
        mentions: [sender]
      });
    }
  }
};

export const dareCommand = {
  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, { text: `🎯 *DARE*\n\n${randomFrom(DARES)}` });
  }
};

export const truthCommand = {
  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, { text: `🤔 *TRUTH*\n\n${randomFrom(TRUTHS)}` });
  }
};

export const factCommand = {
  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, { text: `🧠 *Random Fact*\n\n${randomFrom(FACTS)}` });
  }
};

export const rizzCommand = {
  execute: async ({ sock, msg }) => {
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, { text: `😏 *Rizz Line*\n\n${randomFrom(RIZZ_LINES)}` });
  }
};
