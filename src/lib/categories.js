import {
  Smartphone,
  Gamepad2,
  Shirt,
  Home,
  Flower2,
  Bike,
  Baby,
  BookOpen,
  Wrench,
  Palette,
  Sparkles,
  Puzzle,
  Package,
} from 'lucide-react';

export const CATEGORY_DEFINITIONS = [
  {
    id: 'Tech & Electronics',
    label: 'Tech & Electronics',
    shortLabel: 'Tech',
    icon: Smartphone,
    description: 'Phones, laptops, cameras, audio',
    keywords: [
      'phone', 'iphone', 'samsung', 'pixel', 'laptop', 'macbook', 'ipad', 'tablet',
      'camera', 'sony', 'canon', 'nikon', 'headphones', 'airpods', 'bose', 'speaker',
      'mic', 'microphone', 'audio', 'tv', 'monitor', 'keyboard', 'charger', 'cable',
      'apple', 'interface', 'focusrite', 'shure', 'rode', 'electronics',
    ],
  },
  {
    id: 'Gaming & Consoles',
    label: 'Gaming & Consoles',
    shortLabel: 'Gaming',
    icon: Gamepad2,
    description: 'PlayStation, Xbox, Switch, games',
    keywords: [
      'nintendo', 'switch', 'playstation', 'ps5', 'ps4', 'ps3', 'xbox', 'controller',
      'gameboy', 'pokemon', 'zelda', 'mario', 'console', 'game', 'gaming', 'steam',
      'joycon', 'ds', 'gamecube', 'retro', 'oled',
    ],
  },
  {
    id: 'Clothing & Fashion',
    label: 'Clothing & Fashion',
    shortLabel: 'Clothing',
    icon: Shirt,
    description: 'Mens, womens, shoes, jackets, bags',
    keywords: [
      'shirt', 't-shirt', 'jacket', 'coat', 'hoodie', 'sweater', 'dress', 'jeans',
      'trousers', 'pants', 'shoes', 'boots', 'sneakers', 'trainers', 'nike', 'adidas',
      'patagonia', 'north face', 'zara', 'bag', 'backpack', 'watch', 'hat', 'scarf',
      'sunglasses', 'clothing', 'apparel', 'wear',
    ],
  },
  {
    id: 'Home & Living',
    label: 'Home & Living',
    shortLabel: 'Home',
    icon: Home,
    description: 'Furniture, kitchen, decor, coffee',
    keywords: [
      'table', 'chair', 'sofa', 'couch', 'desk', 'lamp', 'light', 'rug', 'curtains',
      'pan', 'pot', 'skillet', 'kitchen', 'blender', 'toaster', 'kettle', 'coffee',
      'espresso', 'nespresso', 'fellow', 'stagg', 'chemex', 'aeropress', 'casserole',
      'creuset', 'bed', 'pillow', 'clock', 'mirror', 'vase', 'mug', 'anglepoise',
      'furniture', 'decor', 'kitchenaid', 'appliance', 'lodge',
    ],
  },
  {
    id: 'Garden & Plants',
    label: 'Garden & Plants',
    shortLabel: 'Garden',
    icon: Flower2,
    description: 'Houseplants, pots, garden tools, patio',
    keywords: [
      'plant', 'houseplant', 'monstera', 'pothos', 'succulent', 'cactus', 'pot',
      'planter', 'garden', 'lawn', 'mower', 'hose', 'seeds', 'compost', 'patio',
      'greenhouse', 'flower', 'gardening', 'outdoor plant',
    ],
  },
  {
    id: 'Sports & Fitness',
    label: 'Sports & Fitness',
    shortLabel: 'Sports',
    icon: Bike,
    description: 'Bikes, gym, weights, yoga, camping',
    keywords: [
      'bike', 'bicycle', 'cycling', 'helmet', 'weights', 'dumbbell', 'barbell',
      'kettlebell', 'gym', 'fitness', 'yoga', 'mat', 'treadmill', 'running',
      'tennis', 'racket', 'babolat', 'wilson', 'football', 'ball', 'golf',
      'tent', 'sleeping bag', 'camping', 'hiking', 'backpack', 'rapha', 'sports',
    ],
  },
  {
    id: 'Kids & Baby',
    label: 'Kids & Baby',
    shortLabel: 'Kids',
    icon: Baby,
    description: 'Prams, nursery, baby gear, toddler toys',
    keywords: [
      'baby', 'pram', 'stroller', 'buggy', 'cot', 'crib', 'car seat', 'nursery',
      'highchair', 'toddler', 'nappy', 'carrier', 'infant', 'maternity', 'kids',
      'playset',
    ],
  },
  {
    id: 'Books & Media',
    label: 'Books & Media',
    shortLabel: 'Books',
    icon: BookOpen,
    description: 'Books, vinyl records, CDs, comics',
    keywords: [
      'book', 'novel', 'paperback', 'hardcover', 'biography', 'history', 'comic',
      'manga', 'vinyl', 'record', 'album', 'lp', 'cd', 'dvd', 'turntable',
      'audiobook', 'reading', 'books',
    ],
  },
  {
    id: 'Tools & DIY',
    label: 'Tools & DIY',
    shortLabel: 'Tools',
    icon: Wrench,
    description: 'Power tools, hand tools, hardware',
    keywords: [
      'tool', 'drill', 'saw', 'hammer', 'wrench', 'spanner', 'dewalt', 'makita',
      'bosch', 'milwaukee', 'dremel', 'stanley', 'kreg', 'plane', 'sander',
      'ladder', 'hardware', 'workbench', 'toolbox', 'screws', 'driver', 'tools',
      'rotary', 'plier', 'pliers',
    ],
  },
  {
    id: 'Hobbies & Crafts',
    label: 'Hobbies & Crafts',
    shortLabel: 'Hobbies',
    icon: Palette,
    description: 'Instruments, guitars, art & craft supplies',
    keywords: [
      'guitar', 'fender', 'gibson', 'taylor', 'squier', 'ukulele', 'piano',
      'keyboard', 'synth', 'synthesizer', 'korg', 'roland', 'arturia', 'akai',
      'pedal', 'amp', 'amplifier', 'drum', 'craft', 'art', 'paint', 'easel',
      'pottery', 'music', 'sewing', 'knitting', 'canvas', 'sketchbook',
    ],
  },
  {
    id: 'Collectibles',
    label: 'Collectibles',
    shortLabel: 'Collectibles',
    icon: Sparkles,
    description: 'Pokémon cards, rare coins, retro memorabilia & mad treasures',
    keywords: [
      'pokemon', 'pokemon card', 'pokemon cards', 'charizard', 'pikachu', 'tcg',
      'trading card', 'trading cards', 'magic the gathering', 'mtg', 'yugioh', 'yu-gi-oh',
      'sports card', 'sports cards', 'panini', 'topps', 'match attax', 'collectible',
      'collectibles', 'vintage', 'memorabilia', 'signed', 'autograph', 'coin', 'coins',
      'banknote', 'stamp', 'stamps', 'rare', 'limited edition', 'graded', 'psa',
      'bgs', 'cgc', 'retro', 'antique', 'antiques', 'first edition', 'booster',
      'binder', 'slab', 'mad stuff', 'treasure', 'medal',
    ],
  },
  {
    id: 'Toys & Games',
    label: 'Toys & Games',
    shortLabel: 'Toys',
    icon: Puzzle,
    description: 'Board games, Lego, puzzles, action figures & dolls',
    keywords: [
      'toy', 'toys', 'lego', 'puzzle', 'puzzles', 'figure', 'action figure',
      'doll', 'dolls', 'funko', 'pop', 'teddies', 'teddy', 'plush', 'barbie',
      'nerf', 'playmobil', 'hot wheels', 'board game', 'catan', 'monopoly',
      'wingspan', 'gloomhaven', 'pandemic', 'everdell', 'warhammer', 'miniatures',
      'ticket to ride', 'terraforming mars', 'boardgame',
    ],
  },
  {
    id: 'Other',
    label: 'Other',
    shortLabel: 'Other',
    icon: Package,
    description: 'Unique items, bundles & miscellaneous treasures',
    keywords: [
      'other', 'misc', 'miscellaneous', 'random', 'bundle', 'various', 'job lot',
    ],
  },
];

export const CATEGORY_NAMES = CATEGORY_DEFINITIONS.map((c) => c.label);

/**
 * Suggests a category based on the title of an item using word-boundary matching.
 */
export function suggestCategory(title) {
  if (!title || typeof title !== 'string') return null;
  const lower = title.toLowerCase();

  // Score each category based on keyword matches
  let bestCategory = null;
  let highestScore = 0;

  for (const cat of CATEGORY_DEFINITIONS) {
    let score = 0;
    for (const kw of cat.keywords) {
      if (lower.includes(kw)) {
        // Longer matching keywords carry higher confidence
        score += kw.length >= 5 ? 3 : 1;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestCategory = cat.label;
    }
  }

  return highestScore > 0 ? bestCategory : null;
}

/**
 * Normalizes legacy category names into new definitions if needed.
 */
export function normalizeCategory(name) {
  if (!name) return 'Other';
  const map = {
    Electronics: 'Tech & Electronics',
    Clothing: 'Clothing & Fashion',
    Home: 'Home & Living',
    'Home & Garden': 'Home & Living',
    Books: 'Books & Media',
    Sports: 'Sports & Fitness',
    Tools: 'Tools & DIY',
    'Toys & Games': 'Toys & Games',
    Toys: 'Toys & Games',
    Music: 'Hobbies & Crafts',
    'Hobbies & Crafts': 'Hobbies & Crafts',
    'Hobbies & Collectibles': 'Collectibles',
    Hobbies: 'Hobbies & Crafts',
    Collectibles: 'Collectibles',
    Other: 'Other',
  };
  return map[name] || name;
}

/**
 * Retrieves the icon component for a category name.
 */
export function getCategoryIcon(name) {
  const norm = normalizeCategory(name);
  const found = CATEGORY_DEFINITIONS.find((c) => c.label === norm || c.id === norm);
  return found?.icon || Palette;
}
