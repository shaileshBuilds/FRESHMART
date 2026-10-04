/* FRESHMART — centralized product database (Part 3).
   Exposes window.FMDB: categories, products, collections and lookup helpers.
   Prices are sample INR prices for demo use. Replace images in assets/images/products/ with real photos
   (keep the same filenames, or edit `image`). */
(function () {
  const slug = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const categories = [
    { id: 'fruits-vegetables', name: 'Fruits & Vegetables', icon: 'apple',     tint: '#EAF5DA', description: 'Farm-fresh fruits and vegetables, delivered daily.', sub: ['Fresh Fruits', 'Vegetables', 'Leafy Greens'] },
    { id: 'dairy-bakery',      name: 'Dairy & Bakery',      icon: 'milk',      tint: '#EAF3FA', description: 'Milk, curd, paneer, eggs and fresh bread.',        sub: ['Milk & Curd', 'Butter & Cheese', 'Bread & Eggs'] },
    { id: 'rice-pulses',       name: 'Rice & Pulses',       icon: 'wheat',     tint: '#FBF1DF', description: 'Rice, dals and pulses for everyday meals.',        sub: ['Rice', 'Dals', 'Beans & Chana'] },
    { id: 'atta-flour',        name: 'Atta & Flour',        icon: 'package',   tint: '#F6EBD6', description: 'Atta, besan, maida and specialty flours.',        sub: ['Atta', 'Besan & Maida', 'Millet Flours'] },
    { id: 'spices',            name: 'Spices',              icon: 'flame',     tint: '#FCE6D8', description: 'Whole and ground spices, masalas and salt.',      sub: ['Ground Spices', 'Whole Spices', 'Masalas'] },
    { id: 'snacks',            name: 'Snacks',              icon: 'cookie',    tint: '#FDEBD3', description: 'Namkeen, biscuits, chips and chocolates.',        sub: ['Namkeen', 'Biscuits', 'Chocolates'] },
    { id: 'beverages',         name: 'Beverages',           icon: 'cup-soda',  tint: '#FDF0E1', description: 'Tea, coffee, juices, water and soft drinks.',     sub: ['Tea & Coffee', 'Juices', 'Soft Drinks'] },
    { id: 'breakfast',         name: 'Breakfast',           icon: 'egg-fried', tint: '#FFF3CF', description: 'Cereals, oats, spreads and honey.',               sub: ['Cereals & Oats', 'Spreads', 'Honey'] },
    { id: 'personal-care',     name: 'Personal Care',       icon: 'bath',      tint: '#F1EAF8', description: 'Bath, hair, oral and skin care essentials.',      sub: ['Bath & Body', 'Hair Care', 'Oral Care'] },
    { id: 'household',         name: 'Household Essentials',icon: 'spray-can', tint: '#E4F1F2', description: 'Cleaning, laundry and kitchen essentials.',       sub: ['Laundry', 'Cleaners', 'Dishwash'] },
    { id: 'baby-care',         name: 'Baby Care',           icon: 'baby',      tint: '#FBE9F0', description: 'Diapers, baby food and gentle baby care.',        sub: ['Diapers', 'Baby Food', 'Baby Skincare'] },
    { id: 'pet-care',          name: 'Pet Care',            icon: 'paw-print', tint: '#EFE8DD', description: 'Food, treats and care for dogs and cats.',        sub: ['Dog Food', 'Cat Food', 'Treats & Care'] },
    { id: 'meat-seafood',      name: 'Meat & Seafood',      icon: 'beef',      tint: '#FBE4E2', description: 'Fresh chicken, mutton, fish and prawns.',         sub: ['Chicken', 'Mutton', 'Fish & Prawns'] },
    { id: 'organic',           name: 'Organic Foods',       icon: 'leaf',      tint: '#E3F2E1', description: 'Certified organic staples and superfoods.',       sub: ['Superfoods', 'Organic Staples', 'Natural Sweeteners'] },
    { id: 'frozen',            name: 'Frozen Foods',        icon: 'snowflake', tint: '#E6F0FA', description: 'Frozen vegetables, snacks and ice cream.',        sub: ['Frozen Veg', 'Snacks', 'Ice Cream'] }
  ];

  /* Row: [name, brand, price, MRP, weight, emoji, description, flags]  flags: f=featured t=trending b=best-selling */
  const FF = 'FreshMart Farms';
  const ROWS = {
    'fruits-vegetables': [
      ['Robusta Bananas', FF, 49, 60, '1 dozen', '🍌', 'Naturally ripened, sweet and creamy bananas.', 'b'],
      ['Royal Gala Apples', FF, 189, 220, '1 kg', '🍎', 'Crisp, juicy apples with a balanced sweetness.', 'f'],
      ['Nagpur Oranges', FF, 99, 120, '1 kg', '🍊', 'Tangy-sweet seasonal oranges, rich in vitamin C.', ''],
      ['Seedless Green Grapes', FF, 129, 150, '500 g', '🍇', 'Plump, sweet and completely seedless.', 't'],
      ['Hybrid Tomatoes', FF, 32, 40, '500 g', '🍅', 'Firm red tomatoes for curries and salads.', 'b'],
      ['Onions', FF, 38, 45, '1 kg', '🧅', 'Everyday cooking onions with a strong flavour.', 'b'],
      ['Potatoes', FF, 34, 40, '1 kg', '🥔', 'Fresh, versatile potatoes for every recipe.', ''],
      ['Fresh Palak (Spinach)', FF, 25, 30, '250 g', '🥬', 'Tender spinach leaves, washed and trimmed.', 't'],
      ['Green Capsicum', FF, 44, 55, '250 g', '🫑', 'Crunchy capsicum, ideal for stir-fries.', '']
    ],
    'dairy-bakery': [
      ['Taaza Toned Milk', 'Amul', 66, 68, '1 L', '🥛', 'Fresh pasteurised toned milk.', 'b'],
      ['Salted Butter', 'Amul', 285, 290, '500 g', '🧈', 'Classic salted table butter.', 'f'],
      ['Processed Cheese Slices', 'Amul', 135, 140, '200 g', '🧀', 'Ready-to-use slices for sandwiches and burgers.', 't'],
      ['Masti Dahi', 'Mother Dairy', 38, 40, '400 g', '🍶', 'Thick, creamy set curd.', 'b'],
      ['Fresh Paneer', 'Amul', 95, 100, '200 g', '🍘', 'Soft paneer made from pure milk.', ''],
      ['Brown Bread', 'Britannia', 55, 58, '400 g', '🍞', 'Soft whole-wheat sandwich bread.', ''],
      ['Farm Fresh Eggs', 'Eggoz', 108, 120, '12 pcs', '🥚', 'Protein-rich white eggs, packed fresh.', 'f']
    ],
    'rice-pulses': [
      ['Classic Basmati Rice', 'India Gate', 585, 700, '5 kg', '🍚', 'Aged long-grain basmati with rich aroma.', 'bf'],
      ['Sona Masoori Rice', 'Fortune', 365, 420, '5 kg', '🌾', 'Light, fluffy rice for daily meals.', ''],
      ['Toor Dal', 'Tata Sampann', 169, 190, '1 kg', '🫘', 'Unpolished, protein-rich arhar dal.', 't'],
      ['Moong Dal', 'Tata Sampann', 155, 175, '1 kg', '🟡', 'Quick-cooking split yellow moong.', ''],
      ['Chana Dal', 'Fortune', 118, 130, '1 kg', '🌰', 'Nutty split chickpeas for dal and snacks.', ''],
      ['Rajma Chitra', 'Tata Sampann', 150, 170, '1 kg', '🔴', 'Kidney beans for the perfect rajma-chawal.', ''],
      ['Kabuli Chana', 'Tata Sampann', 160, 180, '1 kg', '⚪', 'Large white chickpeas for chole.', '']
    ],
    'atta-flour': [
      ['Whole Wheat Atta', 'Aashirvaad', 265, 295, '5 kg', '🫓', 'Soft rotis from 100% whole wheat.', 'b'],
      ['Multigrain Atta', 'Aashirvaad', 330, 365, '5 kg', '🌽', 'Seven-grain blend for nutritious rotis.', ''],
      ['Chakki Fresh Atta', 'Pillsbury', 255, 285, '5 kg', '🌾', 'Stone-ground atta with natural fibre.', ''],
      ['Besan', 'Tata Sampann', 78, 85, '500 g', '🟨', 'Fine gram flour for pakoras and kadhi.', ''],
      ['Maida', 'Rajdhani', 55, 60, '1 kg', '🥖', 'Refined flour for bakes and snacks.', ''],
      ['Suji (Rava)', 'Rajdhani', 62, 68, '1 kg', '🥣', 'Fine semolina for upma and halwa.', ''],
      ['Ragi Flour', 'Rajdhani', 74, 80, '500 g', '🌱', 'Calcium-rich finger millet flour.', 't']
    ],
    'spices': [
      ['Garam Masala', 'MDH', 88, 95, '100 g', '🌶️', 'Aromatic blend of whole roasted spices.', ''],
      ['Turmeric Powder (Haldi)', 'Everest', 72, 78, '200 g', '🟠', 'Pure turmeric with vibrant colour.', ''],
      ['Kashmiri Lal Mirch', 'Everest', 92, 100, '200 g', '🔥', 'Mild heat and deep red colour.', ''],
      ['Cumin Seeds (Jeera)', 'Catch', 68, 75, '100 g', '🌿', 'Whole jeera for tempering and spice mixes.', ''],
      ['Iodised Salt', 'Tata', 28, 30, '1 kg', '🧂', 'Vacuum-evaporated iodised salt.', 'b'],
      ['Coriander Powder', 'Tata Sampann', 64, 70, '200 g', '🍃', 'Freshly ground dhania powder.', ''],
      ['Chana Masala', 'MDH', 82, 88, '100 g', '🫕', 'Ready spice mix for restaurant-style chole.', '']
    ],
    'snacks': [
      ['Aloo Bhujia', "Haldiram's", 120, 130, '400 g', '🥨', 'Crispy potato and gram flour namkeen.', 'f'],
      ['Magic Masala Chips', "Lay's", 20, 20, '52 g', '🍟', 'Spicy, tangy potato chips.', 't'],
      ['Parle-G Biscuits', 'Parle', 80, 85, '800 g', '🍪', 'The classic glucose biscuit.', 'b'],
      ['Good Day Cashew Cookies', 'Britannia', 42, 45, '200 g', '🧁', 'Buttery cookies loaded with cashew.', ''],
      ['Masala Munch', 'Kurkure', 20, 20, '90 g', '🌽', 'Crunchy corn puffs with desi masala.', ''],
      ['Dairy Milk Silk', 'Cadbury', 175, 180, '150 g', '🍫', 'Smooth, creamy milk chocolate bar.', 'f'],
      ['Masala Noodles', 'Maggi', 96, 102, '420 g', '🍜', '2-minute noodles with the classic tastemaker.', 'b']
    ],
    'beverages': [
      ['Tata Tea Gold', 'Tata Tea', 285, 310, '500 g', '🍵', 'Rich assam tea with long leaves.', 'b'],
      ['Classic Instant Coffee', 'Nescafé', 345, 380, '100 g', '☕', 'Pure instant coffee with bold aroma.', 't'],
      ['Mixed Fruit Juice', 'Real', 115, 120, '1 L', '🧃', 'Refreshing blend of fruit juices.', ''],
      ['Packaged Drinking Water', 'Bisleri', 38, 40, '2 L', '💧', 'Safe, mineral-balanced drinking water.', ''],
      ['Cola', 'Coca-Cola', 99, 105, '2.25 L', '🥤', 'Chilled-serve fizzy cola.', ''],
      ['Aam Panna', 'Paper Boat', 30, 30, '250 ml', '🥭', 'Traditional raw-mango summer cooler.', ''],
      ['Lemon & Honey Green Tea', 'Lipton', 165, 190, '25 bags', '🍋', 'Light green tea bags with lemon and honey.', '']
    ],
    'breakfast': [
      ['Corn Flakes', "Kellogg's", 195, 225, '475 g', '🥣', 'Crunchy flakes fortified with iron and vitamins.', 'b'],
      ['Rolled Oats', 'Quaker', 195, 220, '1 kg', '🥄', 'Wholegrain oats for porridge and baking.', ''],
      ['Chocos', "Kellogg's", 199, 225, '375 g', '🟤', 'Chocolatey whole-grain cereal pillows.', ''],
      ['Fruit & Nut Muesli', "Kellogg's", 295, 340, '500 g', '🍓', 'Wholegrain muesli with fruits and nuts.', ''],
      ['Creamy Peanut Butter', 'Sundrop', 319, 360, '924 g', '🥜', 'Smooth, protein-rich peanut spread.', 't'],
      ['Mixed Fruit Jam', 'Kissan', 165, 180, '500 g', '🫐', 'Real fruit jam for bread and parathas.', ''],
      ['Pure Honey', 'Dabur', 215, 240, '500 g', '🍯', '100% pure honey, no added sugar.', 'f']
    ],
    'personal-care': [
      ['Cream Beauty Bar (Pack of 3)', 'Dove', 165, 195, '3 x 100 g', '🧼', 'Moisturising bathing bar for soft skin.', ''],
      ['Strong Teeth Toothpaste', 'Colgate', 112, 120, '200 g', '🪥', 'Calcium-boost toothpaste for strong teeth.', 'b'],
      ['Anti-Dandruff Shampoo', 'Head & Shoulders', 289, 340, '340 ml', '🧴', 'Cleans away flakes with every wash.', ''],
      ['Neem Face Wash', 'Himalaya', 165, 185, '150 ml', '🫧', 'Purifying face wash for clear skin.', ''],
      ['Coconut Oil', 'Parachute', 245, 270, '500 ml', '🥥', '100% pure coconut oil for hair and skin.', ''],
      ['Soft Body Lotion', 'Nivea', 375, 450, '400 ml', '🧖', 'Deep-moisture lotion for 48 hours of care.', ''],
      ['Guard Razor', 'Gillette', 45, 50, '1 pc', '🪒', 'Easy, safe everyday shave.', '']
    ],
    'household': [
      ['Matic Front Load Detergent', 'Surf Excel', 545, 640, '2 kg', '🧺', 'Tough stain removal for front-load machines.', 'f'],
      ['Dishwash Gel (Lemon)', 'Vim', 189, 215, '750 ml', '🧽', 'Grease-cutting gel with lemon power.', 't'],
      ['Toilet Cleaner', 'Harpic', 172, 190, '1 L', '🚽', 'Kills 99.9% germs and removes stains.', ''],
      ['Disinfectant Floor Cleaner', 'Lizol', 210, 235, '975 ml', '🧹', 'Fresh-scented floor cleaner.', ''],
      ['Glass Cleaner', 'Colin', 98, 110, '500 ml', '🪟', 'Streak-free shine for glass and mirrors.', ''],
      ['Fabric Conditioner', 'Comfort', 215, 245, '860 ml', '🌸', 'Long-lasting freshness and softness.', ''],
      ['Garbage Bags (Medium)', 'Origami', 120, 140, '30 pcs', '🗑️', 'Strong, leak-proof bags.', '']
    ],
    'baby-care': [
      ['Active Baby Diapers (M)', 'Pampers', 899, 1099, '76 pcs', '👶', 'Up to 12 hours of dryness.', 'f'],
      ['Wonder Pants (L)', 'Huggies', 799, 999, '64 pcs', '🍼', 'Soft pant-style diapers for active babies.', ''],
      ['Cerelac Wheat Apple', 'Nestlé', 255, 270, '300 g', '🍎', 'Fortified baby cereal with wheat and apple.', ''],
      ['Infant Formula Stage 1', 'Lactogen', 510, 540, '400 g', '🥄', 'Nutrition for infants 0–6 months.', ''],
      ['Baby Shampoo', "Johnson's", 185, 210, '200 ml', '🛁', 'No-more-tears gentle formula.', 't'],
      ['Baby Powder', "Johnson's", 245, 275, '400 g', '🧸', 'Keeps baby skin soft and dry.', ''],
      ['Baby Wipes', 'Himalaya', 179, 199, '72 pcs', '🧻', 'Gentle, alcohol-free wipes.', '']
    ],
    'pet-care': [
      ['Adult Dog Food Chicken & Veg', 'Pedigree', 699, 799, '3 kg', '🐕', 'Complete nutrition for adult dogs.', 'f'],
      ['Ocean Fish Adult Cat Food', 'Whiskas', 449, 499, '1.2 kg', '🐈', 'Tasty ocean fish dry food for cats.', ''],
      ['Puppy Dry Food', 'Drools', 579, 650, '3 kg', '🐶', 'High-protein formula for growing puppies.', ''],
      ['Kitten Dry Food', 'Me-O', 385, 430, '1.1 kg', '🐱', 'Balanced diet for kittens.', ''],
      ['Dentastix Dog Treats', 'Pedigree', 185, 205, '180 g', '🦴', 'Daily chews that help clean teeth.', ''],
      ['Clumping Cat Litter', 'Heads Up For Tails', 549, 649, '5 kg', '🪣', 'Low-dust, fast-clumping litter.', ''],
      ['Pet Shampoo', 'Himalaya Erina-EP', 175, 195, '200 ml', '🐩', 'Coat-cleansing shampoo for dogs and cats.', '']
    ],
    'meat-seafood': [
      ['Chicken Curry Cut', 'Licious', 189, 210, '500 g', '🍗', 'Fresh, antibiotic-free curry cut pieces.', 'bf'],
      ['Boneless Chicken Breast', 'Licious', 299, 330, '500 g', '🐔', 'Lean boneless breast, cleaned and ready.', ''],
      ['Mutton Curry Cut', 'Licious', 449, 490, '500 g', '🥩', 'Tender goat meat cut for curries.', ''],
      ['Rohu Fish (Cleaned)', 'Licious', 325, 360, '500 g', '🐟', 'Freshwater rohu, cleaned and cut.', ''],
      ['Medium Prawns (Cleaned)', 'Licious', 349, 399, '250 g', '🦐', 'Deveined, ready-to-cook prawns.', 't'],
      ['Chicken Sausages', "Venky's", 165, 185, '250 g', '🌭', 'Juicy ready-to-cook sausages.', ''],
      ['Basa Fillets', 'Licious', 249, 285, '400 g', '🍣', 'Boneless, mild-flavoured fish fillets.', '']
    ],
    'organic': [
      ['Tulsi Green Tea', 'Organic India', 210, 235, '25 bags', '🍃', 'Certified organic tulsi and green tea.', ''],
      ['Jaggery Powder', 'Organic Tattva', 129, 145, '500 g', '🟫', 'Chemical-free natural sweetener.', ''],
      ['Organic Quinoa', '24 Mantra Organic', 295, 340, '500 g', '🥗', 'Gluten-free complete-protein grain.', 't'],
      ['Organic Chia Seeds', '24 Mantra Organic', 199, 239, '250 g', '🌱', 'Omega-3 rich superfood seeds.', ''],
      ['Organic Moong Dal', '24 Mantra Organic', 185, 210, '1 kg', '🫛', 'Pesticide-free whole moong dal.', ''],
      ['Cold Pressed Coconut Oil', 'Organic Tattva', 399, 450, '1 L', '🌴', 'Wood-pressed organic coconut oil.', ''],
      ['Raw Honey', 'Organic Tattva', 299, 340, '500 g', '🐝', 'Unprocessed organic honey.', 'f']
    ],
    'frozen': [
      ['French Fries', 'McCain', 165, 185, '420 g', '🍟', 'Crispy straight-cut fries, ready in minutes.', 't'],
      ['Vanilla Ice Cream', 'Amul', 255, 280, '1 L', '🍦', 'Creamy classic vanilla.', ''],
      ['Frozen Green Peas', 'Safal', 89, 99, '500 g', '🟢', 'Garden peas, frozen at peak freshness.', ''],
      ['Frozen Sweet Corn', 'Safal', 79, 90, '500 g', '🌽', 'Sweet corn kernels, ready to cook.', ''],
      ['Frozen Mixed Vegetables', 'Safal', 95, 105, '500 g', '🥕', 'Carrot, beans, peas and corn mix.', ''],
      ['Malabar Paratha', "Haldiram's", 139, 155, '5 pcs', '🫓', 'Flaky layered paratha, heat and eat.', ''],
      ['Chicken Nuggets', 'ITC Master Chef', 245, 270, '400 g', '🍖', 'Crunchy crumb-coated chicken nuggets.', '']
    ]
  };

  let id = 0;
  const products = [];
  categories.forEach((c) => (ROWS[c.id] || []).forEach(([name, brand, price, originalPrice, weight, emoji, description, flags]) => {
    id++;
    const discount = Math.round((originalPrice - price) / originalPrice * 100);
    products.push({
      id, name, brand, category: c.id, price, originalPrice, discount,
      rating: +(3.9 + (id * 37 % 11) / 10).toFixed(1),
      reviews: 40 + (id * 7919) % 2400,
      weight, description,
      image: `assets/images/products/${id}-${slug(name)}.svg`,
      stock: 6 + (id * 53) % 140,
      emoji, tags: flags,
      badge: discount >= 12 ? `-${discount}%` : c.id === 'organic' ? 'Organic' : null
    });
  }));

  const byFlag = (f) => products.filter((p) => p.tags.includes(f));
  const getProductById = (pid) => products.find((p) => p.id === +pid) || null;
  const getProductsByCategory = (cid) => (!cid || cid === 'all') ? products.slice() : products.filter((p) => p.category === cid);
  const getCategoryById = (cid) => categories.find((c) => c.id === cid) || null;
  const searchProducts = (q) => { q = (q || '').trim().toLowerCase(); return q ? products.filter((p) => `${p.name} ${p.brand} ${p.description}`.toLowerCase().includes(q)) : products.slice(); };
  const collections = { featured: byFlag('f'), trending: byFlag('t'), bestSelling: byFlag('b') };
  const getCollection = (name) => (collections[name] || []).slice();

  window.FMDB = { categories, products, collections, getProductById, getProductsByCategory, getCategoryById, searchProducts, getCollection };
})();
