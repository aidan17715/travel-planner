const kw = (words: string[], emoji: string): [RegExp, string] => [new RegExp(`\\b(?:${words.join('|')})(?:s|es)?\\b`, 'i'), emoji]

// Checked in order, so more specific entries come first
const RULES: [RegExp, string][] = [
  kw(['ramen', 'noodle', 'udon', 'soba', 'pho'], '🍜'),
  kw(['sushi', 'sashimi', 'omakase'], '🍣'),
  kw(['pizza', 'pizzeria'], '🍕'),
  kw(['burger'], '🍔'),
  kw(['bbq', 'barbecue', 'yakiniku', 'steak', 'grill'], '🥩'),
  kw(['curry'], '🍛'),
  kw(['dessert', 'ice cream', 'gelato', 'cake', 'pastry', 'patisserie'], '🍰'),
  kw(['bakery', 'croissant', 'bread'], '🥐'),
  kw(['coffee', 'cafe', 'tea', 'matcha'], '☕'),
  kw(['cocktail', 'wine', 'winery', 'rooftop bar'], '🍷'),
  kw(['bar', 'pub', 'beer', 'brewery', 'drinks', 'izakaya'], '🍺'),
  kw(['restaurant', 'dinner', 'lunch', 'breakfast', 'brunch', 'eat', 'food', 'dining', 'buffet', 'street food', 'foodie', 'meal', 'bistro', 'eatery', 'hawker'], '🍽️'),
  kw(['temple', 'wat', 'pagoda'], '🛕'),
  kw(['shrine', 'torii'], '⛩️'),
  kw(['church', 'cathedral', 'basilica', 'chapel'], '⛪'),
  kw(['mosque'], '🕌'),
  kw(['museum', 'exhibit', 'exhibition', 'history'], '🏛️'),
  kw(['gallery', 'art'], '🎨'),
  kw(['castle', 'palace', 'fort'], '🏰'),
  kw(['tower', 'skytree', 'observation', 'observatory', 'skyline', 'viewpoint', 'lookout'], '🗼'),
  kw(['sunrise', 'sunset'], '🌅'),
  kw(['snorkel', 'snorkelling', 'snorkeling', 'scuba', 'dive', 'diving'], '🤿'),
  kw(['surf', 'surfing'], '🏄'),
  kw(['swim', 'swimming', 'pool'], '🏊'),
  kw(['beach', 'seaside', 'coast'], '🏖️'),
  kw(['island'], '🏝️'),
  kw(['ski', 'skiing', 'snowboard', 'snow'], '⛷️'),
  kw(['hike', 'hiking', 'trek', 'trekking', 'trail', 'mountain', 'summit', 'climb'], '🥾'),
  kw(['bike', 'biking', 'cycle', 'cycling'], '🚴'),
  kw(['zoo', 'safari', 'wildlife'], '🦁'),
  kw(['aquarium'], '🐠'),
  kw(['theme park', 'disneyland', 'disney', 'universal studios', 'amusement', 'rollercoaster'], '🎢'),
  kw(['onsen', 'hot spring'], '♨️'),
  kw(['spa', 'massage'], '💆'),
  kw(['garden', 'botanic', 'botanical', 'blossom', 'sakura'], '🌸'),
  kw(['park', 'forest', 'nature'], '🌳'),
  kw(['waterfall', 'lake', 'river'], '🏞️'),
  kw(['shopping', 'shop', 'mall', 'market', 'bazaar', 'souvenir', 'outlet', 'boutique'], '🛍️'),
  kw(['concert', 'music', 'live band', 'karaoke'], '🎵'),
  kw(['show', 'theatre', 'theater', 'musical', 'opera', 'ballet', 'kabuki'], '🎭'),
  kw(['cinema', 'movie', 'film'], '🎬'),
  kw(['nightclub', 'club', 'party'], '🪩'),
  kw(['festival', 'parade', 'fireworks', 'carnival'], '🎉'),
  kw(['cruise', 'boat', 'ferry', 'sailing', 'yacht'], '⛴️'),
  kw(['train', 'shinkansen', 'metro', 'subway', 'railway'], '🚆'),
  kw(['bus'], '🚌'),
  kw(['taxi', 'uber', 'grab', 'transfer'], '🚕'),
  kw(['car rental', 'drive', 'road trip'], '🚗'),
  kw(['flight', 'airport'], '✈️'),
  kw(['golf'], '⛳'),
  kw(['photo', 'photoshoot', 'photography'], '📸'),
  kw(['tour', 'sightseeing', 'walking tour', 'guided'], '🧭'),
  kw(['check-in', 'check in', 'check-out', 'check out', 'hotel'], '🏨'),
  kw(['rest', 'relax', 'free time', 'nap'], '😌'),
]

export const DEFAULT_EMOJI = '📍'

// Picks an emoji from the activity title first, then the location
export function activityEmoji(title: string, location = ''): string {
  for (const raw of [title, location]) {
    // Strip accents so "café" matches "cafe"
    const text = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    for (const [re, emoji] of RULES) if (re.test(text)) return emoji
  }
  return DEFAULT_EMOJI
}
