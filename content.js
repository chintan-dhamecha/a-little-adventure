/*
  ============================================================================
  content.js — EVERYTHING you need to personalise this game lives here.
  ----------------------------------------------------------------------------
  game.js NEVER contains hardcoded photos, questions or text — it just reads
  this file. That means you can replace every placeholder below with your
  real content and nothing else needs to change.

  See README.md for:
   - the exact photo spec (JPEG, ~1600px long edge, under 400KB)
   - how to test locally and deploy for free

  Quick orientation:
   1. `herName` and the passcode are already set below.
   2. Replace the placeholder photo paths in `level1`, `level3`, `puzzle`
      with your own images in assets/level1, assets/level3, assets/puzzle.
   3. Everything else (questions, reasons, messages) is already filled in —
      edit freely any time.
  ============================================================================
*/

/* ---------------------------------------------------------------------------
   Tiny helper: turns plain text into a short, non-reversible-looking hash.
   This is COSMETIC ONLY (per the brief, not real security) — it just means
   the real passcode doesn't sit as plain, readable text in the page DOM.
   The actual comparison in game.js normalises input the same way
   (trimmed + lowercased) before hashing, so she can type any case/spacing.
--------------------------------------------------------------------------- */
function normalisePasscode(str) {
  return String(str || '').trim().toLowerCase();
}
function simpleHash(str) {
  let hash = 5381;
  const s = normalisePasscode(str);
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash + s.charCodeAt(i)) | 0; // djb2
  }
  return (hash >>> 0).toString(36);
}
// Expose for game.js (keeps the hashing logic in one place).
window.GameHash = { simpleHash, normalisePasscode };

// --- THE REAL PASSCODE ------------------------------------------------------
// Change the word in quotes to change the passcode, then leave the rest —
// it gets hashed automatically below.
const PASSCODE_PLAINTEXT = 'PETU';
// ---------------------------------------------------------------------------

const GAME_CONTENT = {
  // ------------------------------------------------------------------------
  // BASICS
  // ------------------------------------------------------------------------
  herName: 'Sonali',

  // The hash of PASSCODE_PLAINTEXT above — don't edit this line directly,
  // just change PASSCODE_PLAINTEXT.
  passcodeHash: simpleHash(PASSCODE_PLAINTEXT),

  // Shown after 2 wrong guesses, then a second hint after 4 wrong guesses.
  passcodeHints: [
    "Hint 1: it's something I call you! 💕",
    "Hint 2: four letters, all caps, and it's basically your official nickname at this point 🐷",
  ],

  // ------------------------------------------------------------------------
  // LEVEL 1 — Guess the place (3 rounds)
  // ------------------------------------------------------------------------
  level1: {
    rounds: [
      {
        id: 'bangalore-palace',
        photo: 'assets/level1/bangalore_palace_4.jpg',
        options: ['Bangalore Palace', 'Bangalore Fort', 'MG Road', 'Sakleshpur'],
        answerIndex: 0,
        slideshow: [
          { src: 'assets/level1/bangalore_palace_1.jpg', caption: 'First outing in Bangalore' },
          { src: 'assets/level1/bangalore_palace_2.jpg', caption: 'Exploring places and each other.' },
          { src: 'assets/level1/bangalore_palace_3.jpg' },
          { src: 'assets/level1/bangalore_palace_4.jpg' },
          { src: 'assets/level1/bangalore_palace_5.jpg' },
          { src: 'assets/level1/bangalore_palace_6.jpg' },
        ],
      },
      {
        id: 'sakleshpur',
        photo: 'assets/level1/sakleshpur_1.jpg',
        options: ['Bangalore Palace', 'Bangalore Fort', 'Bali', 'Sakleshpur'],
        answerIndex: 3,
        slideshow: [
          { src: 'assets/level1/sakleshpur_1.jpg', caption: 'The rain, the wind, the fog with me and you!!' },
          { src: 'assets/level1/sakleshpur_2.jpg' },
          { src: 'assets/level1/sakleshpur_3.jpg' },
          { src: 'assets/level1/sakleshpur_4.jpg' },
          { src: 'assets/level1/sakleshpur_5.jpg' },
          { src: 'assets/level1/sakleshpur_6.jpg' },
          { src: 'assets/level1/sakleshpur_7.jpg' },
          { src: 'assets/level1/sakleshpur_8.jpg' },
          { src: 'assets/level1/sakleshpur_9.jpg' },
          { src: 'assets/level1/sakleshpur_10.jpg' },
          { src: 'assets/level1/sakleshpur_11.jpg' },
          { src: 'assets/level1/sakleshpur_12.jpg' },
          { src: 'assets/level1/sakleshpur_13.jpg' },
        ],
      },
      {
        id: 'bali',
        photo: 'assets/level1/bali_1.jpg',
        options: ['Mumbai', 'Coorg', 'Sakleshpur', 'Bali'],
        answerIndex: 3,
        slideshow: [
          { src: 'assets/level1/bali_1.jpg', caption: 'Scooty rides visiting temples and markets!!' },
          { src: 'assets/level1/bali_2.jpg' },
          { src: 'assets/level1/bali_3.jpg' },
          { src: 'assets/level1/bali_4.jpg' },
          { src: 'assets/level1/bali_5.jpg' },
        ],
      },
    ],
  },

  // ------------------------------------------------------------------------
  // LEVEL 2 — Favourite things (5 questions)
  // Questions marked `anyCorrect: true` accept WHATEVER she picks as
  // correct (no wrong answer) — used for the ones where the real answer
  // wasn't pinned down. Give it a real `answerIndex` instead any time you
  // want a question to actually be guessable.
  // ------------------------------------------------------------------------
  level2: {
    questions: [
      {
        question: "What's your favourite food?",
        options: ['Biryani', 'Pasta', 'Pani Puri', 'Dosa'],
        anyCorrect: true,
      },
      {
        question: "What's your favourite colour?",
        options: ['Pink', 'Purple', 'Blue', 'Yellow'],
        answerIndex: 0,
      },
      {
        question: "What's your favourite dessert?",
        options: ['Gulab Jamun', 'Ice Cream', 'Chocolate Cake', 'Rasmalai'],
        anyCorrect: true,
      },
      {
        question: "What's your favourite travel destination?",
        options: ['Paris', 'Dubai', 'Manali', 'Kedarnath'],
        anyCorrect: true,
      },
      {
        question: "What's the best way to spend a Sunday together?",
        options: ['Sleeping in', 'A long brunch', 'A movie marathon', 'A long drive'],
        anyCorrect: true,
      },
    ],
  },

  // ------------------------------------------------------------------------
  // LEVEL 3 — What are you wearing? (3 rounds)
  // Each option is a swatch: { name, hex }. The photo is shown in greyscale
  // first (via CSS filter) and animates to colour on the correct guess.
  // ------------------------------------------------------------------------
  level3: {
    rounds: [
      {
        photo: 'assets/level3/temple_pink.jpg',
        caption: 'Temple visit, wishing for health and wealth together.',
        options: [
          { name: 'Pink', hex: '#e75d8a' },
          { name: 'Red', hex: '#c23b3b' },
          { name: 'Green', hex: '#3fae6a' },
          { name: 'Peach', hex: '#f2b088' },
        ],
        answerIndex: 0,
      },
      {
        photo: 'assets/level3/wedding_green.jpg',
        caption: "A friend's wedding — you, of course, stole the show.",
        options: [
          { name: 'Blue', hex: '#3b6bc2' },
          { name: 'Green', hex: '#3fae6a' },
          { name: 'Pink', hex: '#e75d8a' },
          { name: 'Magenta', hex: '#c23b9e' },
        ],
        answerIndex: 1,
      },
      {
        photo: 'assets/level3/trip_blue.jpg',
        caption: 'Just a trip — no big occasion, just us.',
        options: [
          { name: 'Purple', hex: '#8e6fae' },
          { name: 'Pink', hex: '#e75d8a' },
          { name: 'Maroon', hex: '#7c1f37' },
          { name: 'Blue', hex: '#3b6bc2' },
        ],
        answerIndex: 3,
      },
    ],
  },

  // ------------------------------------------------------------------------
  // LEVEL 4 — Reasons I love you
  // reasonsToCollect must be <= reasons.length (extra reasons just add
  // variety — the game randomly samples each playthrough). Edit freely,
  // add more, or remove — the game adapts to however many you leave here.
  // ------------------------------------------------------------------------
  reasonsToCollect: 15,
  reasons: [
    'The way you handle our expenses like a total pro.',
    'How patiently you handle my anger, even when I don’t deserve it.',
    'How beautifully you treat my family as your own.',
    'How quickly you’ve made yourself at home with my family.',
    'The way you tease me relentlessly — and I love every bit of it.',
    'Your smile. Just... your smile.',
    'How adorably upset you get when your makeup won’t cooperate.',
    'The way you pose for every single photo like a pro.',
    'How confidently you ride your scooty.',
    'How determined you are about your career.',
    'How you juggle work and house chores without missing a beat.',
    'How you never complain about doing the house chores.',
    'How you complain about the smallest things — and somehow it’s endearing.',
    'How you always come find me when I’m mad, instead of letting it sit.',
    'The way you get mad — dramatic and adorable at once.',
    'How you take your time to finally tell me what’s really bothering you.',
    'The way you walk when you think no one’s watching.',
    'How you drift off into your own thoughts mid-meal.',
    'The way you look incredible in literally any outfit.',
    'The way you do your hair, every single time.',
    'How you understand exactly what I mean in one shot, every time.',
    'How you go right back to being completely yourself the moment I step away.',
    'How enthusiastic you get about anything coming up, big or small.',
    'How anxious you get about things before they even happen.',
    'How hard change is for you — and how real that struggle is.',
    'How much you want to handle change better, even when it’s hard.',
    'How much you miss home.',
    'How much you miss your family.',
    'How you never complain that we haven’t done the “normal” things married couples do yet.',
    'How mad you get if I don’t call.',
    'How you jump in to help with anything happening around the house.',
    'How you cook for me, every time, with so much love.',
  ],

  // ------------------------------------------------------------------------
  // LEVEL 5 — The puzzle
  // gridCols x gridRows = total pieces. prePlacedCount of them are already
  // sitting on the board when she arrives; the rest are filled using the
  // puzzle pieces she earned during Levels 1 & 3 (first-come, first-placed).
  // `photo` is currently a generated diamond-heart graphic (ties into the
  // gift clue below) instead of a real photo — swap it for a photo of the
  // two of you any time if you'd rather, same aspect ratio (3:2) works best.
  // ------------------------------------------------------------------------
  puzzle: {
    photo: 'assets/puzzle/diamond_heart.svg?v=2',
    gridCols: 3,
    gridRows: 2,
    prePlacedCount: 0,
  },

  // ------------------------------------------------------------------------
  // FINALE
  // ------------------------------------------------------------------------
  finalMessage:
    "Happy Birthday, my love! ❤️🥹\n\nSometimes I wonder what I did right in life to deserve someone like you. You are not just my wife; you are my happiness, my peace, my strength, and the person who makes even an ordinary day feel special. No matter how difficult life gets, knowing that I have you by my side makes everything feel a little easier.\n\nBecause loving you was never just about finding someone to share my life with. It was about finding the person with whom I want to share every little thing that life has left for me.\n\nએક સુંદર ગુજરાતી શાયરી તારા માટે:\n\n“લાખો ચહેરાઓમાં એક તું ગમી ગઈ,\nમારી ખાલી જિંદગીમાં ખુશી બની ગઈ.\nમાંગ્યું નહોતું મેં કંઈ ખાસ ઈશ્વર પાસે,\nપણ તું મળી ને મારી દરેક પ્રાર્થના પૂરી થઈ ગઈ.” ❤️\n\nI dont know what is written for us in the future, but I know that whatever is destined, it will feel 1000 times better with you by my side. Any sorts of ups or downs that come in our journey, we will face it as one, we will enjoy it as one, and I will always thank god for bringing you into my life. I hope all our dreams come true, I desire to love the fullest with you, go on every exciting trip, adventure, help you face your fears, you help me face mine. Thank you for being a part of my life. Happiest Birthday to you.\n\nLove — Chintan",

  // Played from the "See video" button under the birthday message.
  finaleVideo: 'assets/video/sakleshpur.mp4',

  giftClue:
    "💎❤️ “A sparkling heart that hugs your ears, guess your gift!”",
  giftHint:
    "Think sparkly. Think a pair. Think — something you'll put on before we go out next... your ears are about to get very lucky.",
};

// Top-level `const` in a classic script does NOT attach to `window` — export
// explicitly so game.js can read it as `window.GAME_CONTENT`.
window.GAME_CONTENT = GAME_CONTENT;
