// taxonomy.js — Universal Consumer Taxonomy (200+ items)
// CO2 values are kg saved vs. buying new (LCA averages)

export const TAXONOMY = [
  // ─── Electronics ──────────────────────────────────────────────────────────
  { category: 'Electronics', label: 'Smartphone',              co2: 70  },
  { category: 'Electronics', label: 'iPhone',                  co2: 70  },
  { category: 'Electronics', label: 'Android Phone',           co2: 65  },
  { category: 'Electronics', label: 'Laptop',                  co2: 340 },
  { category: 'Electronics', label: 'MacBook',                 co2: 340 },
  { category: 'Electronics', label: 'Gaming Laptop',           co2: 400 },
  { category: 'Electronics', label: 'Desktop PC',              co2: 500 },
  { category: 'Electronics', label: 'Tablet',                  co2: 110 },
  { category: 'Electronics', label: 'iPad',                    co2: 110 },
  { category: 'Electronics', label: 'E-Reader',                co2: 30  },
  { category: 'Electronics', label: 'Smart Watch',             co2: 35  },
  { category: 'Electronics', label: 'Fitness Tracker',         co2: 20  },
  { category: 'Electronics', label: 'Gaming Console',          co2: 160 },
  { category: 'Electronics', label: 'PlayStation',             co2: 160 },
  { category: 'Electronics', label: 'Xbox',                    co2: 160 },
  { category: 'Electronics', label: 'Nintendo Switch',         co2: 85  },
  { category: 'Electronics', label: 'VR Headset',              co2: 120 },
  { category: 'Electronics', label: 'Digital Camera',          co2: 80  },
  { category: 'Electronics', label: 'DSLR Camera',             co2: 130 },
  { category: 'Electronics', label: 'Action Camera',           co2: 40  },
  { category: 'Electronics', label: 'Drone',                   co2: 55  },
  { category: 'Electronics', label: 'Headphones',              co2: 20  },
  { category: 'Electronics', label: 'Wireless Earbuds',        co2: 15  },
  { category: 'Electronics', label: 'Bluetooth Speaker',       co2: 18  },
  { category: 'Electronics', label: 'Soundbar',                co2: 45  },
  { category: 'Electronics', label: 'Monitor',                 co2: 300 },
  { category: 'Electronics', label: 'TV',                      co2: 400 },
  { category: 'Electronics', label: 'Smart TV',                co2: 450 },
  { category: 'Electronics', label: 'Projector',               co2: 150 },
  { category: 'Electronics', label: 'Router',                  co2: 30  },
  { category: 'Electronics', label: 'Smart Home Hub',          co2: 25  },
  { category: 'Electronics', label: 'External Hard Drive',     co2: 40  },
  { category: 'Electronics', label: 'SSD Drive',               co2: 20  },
  { category: 'Electronics', label: 'Graphics Card (GPU)',     co2: 200 },
  { category: 'Electronics', label: 'Mechanical Keyboard',     co2: 30  },
  { category: 'Electronics', label: 'Gaming Mouse',            co2: 15  },
  { category: 'Electronics', label: 'Webcam',                  co2: 20  },
  { category: 'Electronics', label: 'Microphone',              co2: 25  },
  { category: 'Electronics', label: 'Portable Charger',        co2: 10  },
  { category: 'Electronics', label: 'Electric Toothbrush',     co2: 12  },

  // ─── Fashion & Apparel ────────────────────────────────────────────────────
  { category: 'Fashion', label: 'Jeans',                       co2: 33  },
  { category: 'Fashion', label: 'Chinos',                      co2: 20  },
  { category: 'Fashion', label: 'Joggers',                     co2: 15  },
  { category: 'Fashion', label: 'T-shirt',                     co2: 7   },
  { category: 'Fashion', label: 'Shirt',                       co2: 9   },
  { category: 'Fashion', label: 'Blouse',                      co2: 8   },
  { category: 'Fashion', label: 'Dress',                       co2: 16  },
  { category: 'Fashion', label: 'Hoodie',                      co2: 22  },
  { category: 'Fashion', label: 'Sweater',                     co2: 20  },
  { category: 'Fashion', label: 'Jacket',                      co2: 40  },
  { category: 'Fashion', label: 'Designer Jacket',             co2: 50  },
  { category: 'Fashion', label: 'Leather Jacket',              co2: 55  },
  { category: 'Fashion', label: 'Winter Coat',                 co2: 60  },
  { category: 'Fashion', label: 'Suit',                        co2: 45  },
  { category: 'Fashion', label: 'Blazer',                      co2: 30  },
  { category: 'Fashion', label: 'Skirt',                       co2: 12  },
  { category: 'Fashion', label: 'Sneakers',                    co2: 14  },
  { category: 'Fashion', label: 'Trainers',                    co2: 14  },
  { category: 'Fashion', label: 'Boots',                       co2: 22  },
  { category: 'Fashion', label: 'Heels',                       co2: 18  },
  { category: 'Fashion', label: 'Sandals',                     co2: 10  },
  { category: 'Fashion', label: 'Loafers',                     co2: 16  },
  { category: 'Fashion', label: 'Handbag',                     co2: 28  },
  { category: 'Fashion', label: 'Backpack',                    co2: 25  },
  { category: 'Fashion', label: 'Tote Bag',                    co2: 8   },
  { category: 'Fashion', label: 'Designer Bag',                co2: 40  },
  { category: 'Fashion', label: 'Sunglasses',                  co2: 5   },
  { category: 'Fashion', label: 'Watch',                       co2: 20  },
  { category: 'Fashion', label: 'Luxury Watch',                co2: 80  },
  { category: 'Fashion', label: 'Scarf',                       co2: 6   },
  { category: 'Fashion', label: 'Beanie',                      co2: 4   },
  { category: 'Fashion', label: 'Puffer Jacket',               co2: 35  },
  { category: 'Fashion', label: 'Swimwear',                    co2: 8   },
  { category: 'Fashion', label: 'Activewear Set',              co2: 18  },

  // ─── Home & Garden ────────────────────────────────────────────────────────
  { category: 'Home', label: 'Sofa',                           co2: 340 },
  { category: 'Home', label: '2-Seater Sofa',                  co2: 220 },
  { category: 'Home', label: '3-Seater Sofa',                  co2: 340 },
  { category: 'Home', label: 'Armchair',                       co2: 120 },
  { category: 'Home', label: 'Dining Table',                   co2: 150 },
  { category: 'Home', label: 'Coffee Table',                   co2: 80  },
  { category: 'Home', label: 'Side Table',                     co2: 40  },
  { category: 'Home', label: 'Bedside Table',                  co2: 40  },
  { category: 'Home', label: 'Desk',                           co2: 140 },
  { category: 'Home', label: 'Standing Desk',                  co2: 180 },
  { category: 'Home', label: 'Ergonomic Chair',                co2: 120 },
  { category: 'Home', label: 'Office Chair',                   co2: 100 },
  { category: 'Home', label: 'Gaming Chair',                   co2: 110 },
  { category: 'Home', label: 'Bookshelf',                      co2: 90  },
  { category: 'Home', label: 'Wardrobe',                       co2: 200 },
  { category: 'Home', label: 'Chest of Drawers',               co2: 110 },
  { category: 'Home', label: 'Bed Frame',                      co2: 180 },
  { category: 'Home', label: 'Mattress',                       co2: 200 },
  { category: 'Home', label: 'Lamp',                           co2: 15  },
  { category: 'Home', label: 'Floor Lamp',                     co2: 25  },
  { category: 'Home', label: 'Ceiling Light',                  co2: 20  },
  { category: 'Home', label: 'Mirror',                         co2: 30  },
  { category: 'Home', label: 'Rug',                            co2: 40  },
  { category: 'Home', label: 'Curtains',                       co2: 30  },
  { category: 'Home', label: 'Shelving Unit',                  co2: 60  },
  { category: 'Home', label: 'TV Stand',                       co2: 70  },
  { category: 'Home', label: 'Garden Chair',                   co2: 30  },
  { category: 'Home', label: 'Garden Table',                   co2: 60  },
  { category: 'Home', label: 'BBQ Grill',                      co2: 55  },
  { category: 'Home', label: 'Plant Pot',                      co2: 5   },

  // ─── Kitchen & Appliances ─────────────────────────────────────────────────
  { category: 'Appliances', label: 'Coffee Machine',           co2: 50  },
  { category: 'Appliances', label: 'Espresso Machine',         co2: 70  },
  { category: 'Appliances', label: 'Air Fryer',                co2: 40  },
  { category: 'Appliances', label: 'Microwave',                co2: 80  },
  { category: 'Appliances', label: 'Blender',                  co2: 30  },
  { category: 'Appliances', label: 'Food Processor',           co2: 40  },
  { category: 'Appliances', label: 'Stand Mixer',              co2: 60  },
  { category: 'Appliances', label: 'Toaster',                  co2: 15  },
  { category: 'Appliances', label: 'Kettle',                   co2: 10  },
  { category: 'Appliances', label: 'Vacuum Cleaner',           co2: 65  },
  { category: 'Appliances', label: 'Robot Vacuum',             co2: 80  },
  { category: 'Appliances', label: 'Steam Iron',               co2: 20  },
  { category: 'Appliances', label: 'Washing Machine',          co2: 400 },
  { category: 'Appliances', label: 'Tumble Dryer',             co2: 300 },
  { category: 'Appliances', label: 'Dishwasher',               co2: 350 },
  { category: 'Appliances', label: 'Fridge',                   co2: 350 },
  { category: 'Appliances', label: 'Fridge Freezer',           co2: 450 },
  { category: 'Appliances', label: 'Air Purifier',             co2: 50  },
  { category: 'Appliances', label: 'Dehumidifier',             co2: 60  },
  { category: 'Appliances', label: 'Fan',                      co2: 20  },
  { category: 'Appliances', label: 'Portable Heater',          co2: 35  },

  // ─── Sports & Outdoors ────────────────────────────────────────────────────
  { category: 'Sports', label: 'Road Bike',                    co2: 190 },
  { category: 'Sports', label: 'Mountain Bike',                co2: 200 },
  { category: 'Sports', label: 'Electric Bike',                co2: 180 },
  { category: 'Sports', label: 'Folding Bike',                 co2: 160 },
  { category: 'Sports', label: 'Electric Scooter',             co2: 100 },
  { category: 'Sports', label: 'Skateboard',                   co2: 15  },
  { category: 'Sports', label: 'Longboard',                    co2: 20  },
  { category: 'Sports', label: 'Surfboard',                    co2: 40  },
  { category: 'Sports', label: 'Snowboard',                    co2: 35  },
  { category: 'Sports', label: 'Ski Set',                      co2: 50  },
  { category: 'Sports', label: 'Yoga Mat',                     co2: 6   },
  { category: 'Sports', label: 'Dumbbells',                    co2: 25  },
  { category: 'Sports', label: 'Kettlebell',                   co2: 15  },
  { category: 'Sports', label: 'Barbell Set',                  co2: 70  },
  { category: 'Sports', label: 'Pull-up Bar',                  co2: 12  },
  { category: 'Sports', label: 'Treadmill',                    co2: 300 },
  { category: 'Sports', label: 'Exercise Bike',                co2: 150 },
  { category: 'Sports', label: 'Rowing Machine',               co2: 180 },
  { category: 'Sports', label: 'Tent',                         co2: 35  },
  { category: 'Sports', label: 'Sleeping Bag',                 co2: 18  },
  { category: 'Sports', label: 'Backpacking Rucksack',         co2: 20  },
  { category: 'Sports', label: 'Hiking Boots',                 co2: 22  },
  { category: 'Sports', label: 'Golf Clubs',                   co2: 80  },
  { category: 'Sports', label: 'Tennis Racket',                co2: 15  },
  { category: 'Sports', label: 'Football',                     co2: 5   },
  { category: 'Sports', label: 'Basketball',                   co2: 7   },
  { category: 'Sports', label: 'Boxing Gloves',                co2: 12  },
  { category: 'Sports', label: 'Climbing Harness',             co2: 10  },
  { category: 'Sports', label: 'Kayak',                        co2: 120 },
  { category: 'Sports', label: 'SUP Board',                    co2: 80  },

  // ─── Music & Instruments ──────────────────────────────────────────────────
  { category: 'Music', label: 'Acoustic Guitar',               co2: 55  },
  { category: 'Music', label: 'Electric Guitar',               co2: 65  },
  { category: 'Music', label: 'Bass Guitar',                   co2: 60  },
  { category: 'Music', label: 'Classical Guitar',              co2: 50  },
  { category: 'Music', label: 'Ukulele',                       co2: 12  },
  { category: 'Music', label: 'Piano / Keyboard',              co2: 150 },
  { category: 'Music', label: 'Digital Piano',                 co2: 120 },
  { category: 'Music', label: 'Drum Kit',                      co2: 200 },
  { category: 'Music', label: 'Electronic Drum Pad',           co2: 80  },
  { category: 'Music', label: 'Violin',                        co2: 40  },
  { category: 'Music', label: 'Saxophone',                     co2: 80  },
  { category: 'Music', label: 'Trumpet',                       co2: 50  },
  { category: 'Music', label: 'DJ Controller',                 co2: 90  },
  { category: 'Music', label: 'Audio Interface',               co2: 30  },
  { category: 'Music', label: 'Studio Monitor Speakers',       co2: 60  },
  { category: 'Music', label: 'MIDI Keyboard',                 co2: 25  },
  { category: 'Music', label: 'Synthesizer',                   co2: 100 },
  { category: 'Music', label: 'Vinyl Record Player',           co2: 40  },

  // ─── Books, Games & Media ─────────────────────────────────────────────────
  { category: 'Media', label: 'Book',                          co2: 3   },
  { category: 'Media', label: 'Textbook',                      co2: 5   },
  { category: 'Media', label: 'Comic Book / Manga',            co2: 2   },
  { category: 'Media', label: 'Video Game',                    co2: 10  },
  { category: 'Media', label: 'Board Game',                    co2: 8   },
  { category: 'Media', label: 'Card Game',                     co2: 3   },
  { category: 'Media', label: 'Jigsaw Puzzle',                 co2: 4   },
  { category: 'Media', label: 'LEGO Set',                      co2: 12  },
  { category: 'Media', label: 'Action Figure',                 co2: 5   },
  { category: 'Media', label: 'Vinyl Record',                  co2: 4   },
  { category: 'Media', label: 'DVD / Blu-ray',                 co2: 2   },

  // ─── Photography & Art ────────────────────────────────────────────────────
  { category: 'Photography', label: 'Camera Lens',             co2: 60  },
  { category: 'Photography', label: 'Mirrorless Camera',       co2: 120 },
  { category: 'Photography', label: 'Film Camera',             co2: 30  },
  { category: 'Photography', label: 'Camera Tripod',           co2: 15  },
  { category: 'Photography', label: 'Camera Bag',              co2: 12  },
  { category: 'Photography', label: 'Flash / Speedlite',       co2: 20  },
  { category: 'Photography', label: 'Photo Printer',           co2: 50  },
  { category: 'Photography', label: 'Painting Set',            co2: 10  },
  { category: 'Photography', label: 'Drawing Tablet',          co2: 40  },
  { category: 'Photography', label: '3D Printer',              co2: 120 },
  { category: 'Photography', label: 'Sewing Machine',          co2: 80  },

  // ─── Vehicles & Transport ─────────────────────────────────────────────────
  { category: 'Vehicles', label: 'Bicycle Helmet',             co2: 8   },
  { category: 'Vehicles', label: 'Bike Lock',                  co2: 5   },
  { category: 'Vehicles', label: 'Car Dash Cam',               co2: 20  },
  { category: 'Vehicles', label: 'Car Speaker System',         co2: 45  },
  { category: 'Vehicles', label: 'Electric Skateboard',        co2: 60  },
  { category: 'Vehicles', label: 'Hoverboard',                 co2: 70  },
  { category: 'Vehicles', label: 'Scooter (Kids)',             co2: 12  },
  { category: 'Vehicles', label: 'Baby Pram / Pushchair',      co2: 90  },
  { category: 'Vehicles', label: 'Child Bike Seat',            co2: 15  },
  { category: 'Vehicles', label: 'Car Roof Rack',              co2: 30  },

  // ─── Health & Beauty ──────────────────────────────────────────────────────
  { category: 'Health', label: 'Hair Dryer',                   co2: 20  },
  { category: 'Health', label: 'Hair Straightener',            co2: 15  },
  { category: 'Health', label: 'Electric Shaver',              co2: 15  },
  { category: 'Health', label: 'Massage Gun',                  co2: 25  },
  { category: 'Health', label: 'Blood Pressure Monitor',       co2: 10  },
  { category: 'Health', label: 'Scales (Smart)',               co2: 18  },
  { category: 'Health', label: 'Inversion Table',              co2: 60  },
  { category: 'Health', label: 'Foam Roller',                  co2: 5   },
  { category: 'Health', label: 'Perfume / Cologne',            co2: 4   },

  // ─── Kids & Baby ──────────────────────────────────────────────────────────
  { category: 'Kids', label: 'Baby Cot / Crib',                co2: 80  },
  { category: 'Kids', label: 'High Chair',                     co2: 40  },
  { category: 'Kids', label: 'Baby Monitor',                   co2: 20  },
  { category: 'Kids', label: 'Baby Bouncer',                   co2: 25  },
  { category: 'Kids', label: 'Playmat',                        co2: 10  },
  { category: 'Kids', label: 'Ride-on Car (Kids)',             co2: 45  },
  { category: 'Kids', label: 'Kids Scooter',                   co2: 12  },
  { category: 'Kids', label: 'Children\'s Bicycle',            co2: 50  },
  { category: 'Kids', label: 'Toy Set',                        co2: 6   },
  { category: 'Kids', label: 'Educational Toy',                co2: 4   },
];

// Fallback CO2 averages per category for custom/unlisted items
export const CATEGORY_FALLBACK_CO2 = {
  Electronics: 80, Fashion: 20, Home: 100, Appliances: 80,
  Sports: 40, Music: 60, Media: 5, Photography: 40,
  Vehicles: 30, Health: 15, Kids: 30,
};

// Simple fuzzy search — scores and ranks matches by relevance
export function searchTaxonomy(query, limit = 10) {
  if (!query || !query.trim()) return [];
  const q = query.toLowerCase().trim();

  return TAXONOMY
    .map(item => {
      const labelLower = item.label.toLowerCase();
      const catLower = item.category.toLowerCase();
      let score = 0;
      if (labelLower === q)                  score = 100; // exact match
      else if (labelLower.startsWith(q))     score = 80;  // prefix match
      else if (labelLower.includes(q))       score = 60;  // substring match
      else if (catLower.includes(q))         score = 30;  // category match
      // Word-level fuzzy: each word in label gets checked
      else {
        const words = labelLower.split(/\s+/);
        for (const w of words) {
          if (w.startsWith(q)) { score = 50; break; }
          if (w.includes(q))   { score = 40; break; }
        }
      }
      return { ...item, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
