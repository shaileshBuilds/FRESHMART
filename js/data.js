/* FRESHMART — site config + data facade. Products & categories come from js/products.js (window.FMDB). */
window.FM = (function () {
  const db = window.FMDB, ids = (l) => l.map((p) => p.id);
  const byDiscount = db.products.slice().sort((a, b) => b.discount - a.discount || b.reviews - a.reviews);
  const byRating = db.products.slice().sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  return {
    freeDeliveryMin: 499,
    cities: ['Lucknow', 'Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Kolkata'],
    db, categories: db.categories, products: db.products,
    sets: { best: ids(db.collections.bestSelling).slice(0, 10), flash: ids(byDiscount).slice(0, 4), weekly: ids(byDiscount).slice(4, 8), recommended: ids(byRating).slice(0, 8) },
    brands: ['Amul', 'Aashirvaad', 'Tata Sampann', 'Britannia', "Haldiram's", 'Dabur'],
    testimonials: [
      { name: 'Aarav M.', city: 'Lucknow', text: 'The produce feels like it came straight from the farm. Delivery was quick and everything was packed carefully.' },
      { name: 'Priya S.', city: 'Delhi', text: 'Fresh bread and dairy on time, every time. Easily my favourite way to do the weekly shop.' },
      { name: 'Rohan K.', city: 'Mumbai', text: 'Clear prices, a huge range and a great organic section. Checkout is refreshingly simple.' }
    ]
  };
})();
