const KEYWORD_EMOJI_MAP = {
  color: {
    red: ['🔴'], blue: ['🔵'], green: ['🟢'], yellow: ['🟡'], orange: ['🟠'],
    purple: ['🟣'], pink: ['💗'], black: ['⚫'], white: ['⚪'], brown: ['🟤'],
    gold: ['🏆'], silver: ['🥈'], rainbow: ['🌈'],
  },
  animal: {
    dog: ['🐕'], puppy: ['🐶'], cat: ['🐱'], kitten: ['🐱'], horse: ['🐴'],
    unicorn: ['🦄'], rabbit: ['🐰'], bunny: ['🐰'], bear: ['🐻'], lion: ['🦁'],
    tiger: ['🐯'], elephant: ['🐘'], dolphin: ['🐬'], whale: ['🐳'],
    bird: ['🐦'], owl: ['🦉'], penguin: ['🐧'], fish: ['🐟'], shark: ['🦈'],
    butterfly: ['🦋'], dinosaur: ['🦕'], dragon: ['🐉'], monkey: ['🐵'],
    panda: ['🐼'], fox: ['🦊'], wolf: ['🐺'], turtle: ['🐢'], frog: ['🐸'],
  },
  food: {
    pizza: ['🍕'], burger: ['🍔'], hamburger: ['🍔'], taco: ['🌮'],
    spaghetti: ['🍝'], pasta: ['🍝'], noodle: ['🍜'], sushi: ['🍣'],
    chicken: ['🍗'], steak: ['🥩'], hotdog: ['🌭'], fries: ['🍟'],
    'ice cream': ['🍦'], cake: ['🎂'], cookie: ['🍪'], chocolate: ['🍫'],
    candy: ['🍬'], donut: ['🍩'], pancake: ['🥞'], waffle: ['🧇'],
    apple: ['🍎'], banana: ['🍌'], strawberry: ['🍓'], watermelon: ['🍉'],
    mac: ['🧀'], cheese: ['🧀'], soup: ['🍲'], salad: ['🥗'],
  },
  song: {
    music: ['🎵'], song: ['🎶'], sing: ['🎤'], dance: ['💃'],
    rock: ['🎸'], piano: ['🎹'], drum: ['🥁'],
  },
  book: {
    book: ['📖'], story: ['📚'], read: ['📖'], fairy: ['🧚'],
    magic: ['✨'], adventure: ['🗺️'], comic: ['💥'],
  },
  activity: {
    swim: ['🏊'], soccer: ['⚽'], football: ['🏈'], basketball: ['🏀'],
    baseball: ['⚾'], tennis: ['🎾'], dance: ['💃'], bike: ['🚲'],
    ride: ['🚲'], draw: ['🎨'], paint: ['🎨'], art: ['🎨'],
    sing: ['🎤'], game: ['🎮'], 'video game': ['🎮'], lego: ['🧱'],
    play: ['🎮'], run: ['🏃'], skate: ['⛸️'], gymnastics: ['🤸'],
    cook: ['👩‍🍳'], bake: ['🧁'],
  },
  movie: {
    movie: ['🎬'], film: ['🎬'], cartoon: ['📺'], disney: ['🏰'],
    superhero: ['🦸'], 'star wars': ['⭐'], princess: ['👸'],
  },
  tvshow: {
    show: ['📺'], cartoon: ['📺'], anime: ['📺'],
  },
  restaurant: {
    mcdonalds: ['🍔'], chick: ['🐔'], pizza: ['🍕'], subway: ['🥪'],
    taco: ['🌮'], chinese: ['🥡'], mexican: ['🌮'], italian: ['🍕'],
    japanese: ['🍣'], thai: ['🍜'], indian: ['🍛'],
  },
};

const COLOR_MAP = {
  red: '#EF4444', blue: '#3B82F6', green: '#22C55E', yellow: '#EAB308',
  orange: '#F97316', purple: '#A855F7', pink: '#EC4899', black: '#1F2937',
  white: '#F9FAFB', brown: '#92400E', gold: '#D97706', silver: '#9CA3AF',
  rainbow: '#EC4899',
};

export function enrichAnswer(answerText, enrichmentType) {
  if (!answerText || !enrichmentType) return null;

  const map = KEYWORD_EMOJI_MAP[enrichmentType];
  if (!map) return null;

  const lower = answerText.toLowerCase();
  const emojis = [];
  let colorTag = null;

  for (const [keyword, emojiArray] of Object.entries(map)) {
    if (lower.includes(keyword)) {
      emojis.push(...emojiArray);
      if (enrichmentType === 'color' && COLOR_MAP[keyword]) {
        colorTag = COLOR_MAP[keyword];
      }
    }
  }

  if (emojis.length === 0) return null;

  // Deduplicate emojis
  const unique = [...new Set(emojis)];
  return { emojis: unique, colorTag };
}

export function enrichInterview(answers, questions) {
  const enrichment = {};

  for (const q of questions) {
    if (!q.enrichable || !q.enrichmentType) continue;
    const answer = answers[q.id];
    if (!answer?.text) continue;

    const result = enrichAnswer(answer.text, q.enrichmentType);
    if (result) {
      enrichment[q.id] = result;
    }
  }

  return enrichment;
}
