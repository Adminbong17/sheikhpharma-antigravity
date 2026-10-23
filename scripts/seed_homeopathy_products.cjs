const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vkfloynvxqkxbqpdlzbd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZmxveW52eHFreGJxcGRsemJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQ0NzMyNSwiZXhwIjoyMDg5MDIzMzI1fQ.KGfBZMEqiEykX6emQp-pOqZTaZfnjQXBzfsrEUTsQK4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// High-resolution clean medical & apothecary concept images
const IMAGES = {
  german_drops: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80",
  mother_tincture: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&auto=format&fit=crop&q=80",
  biochemic: "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600&auto=format&fit=crop&q=80",
  tonic_syrup: "https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=600&auto=format&fit=crop&q=80",
  dilution: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&auto=format&fit=crop&q=80",
  hair_oil: "https://images.unsplash.com/photo-1608248597359-21b9a957c776?w=600&auto=format&fit=crop&q=80",
  skin_care: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80"
};

const HOMEOPATHY_PRODUCTS = [
  // ─── 1. German "R" Series Drops (Dr. Reckeweg & Co.) ───
  {
    name: "Dr. Reckeweg R41 (Vitality & Neurasthenia Drops)",
    generic_name: "Acidum phosphoricum, Agnus castus, Damiana, Testes",
    category: "homeopathy",
    subcategory: "জার্মান ড্রপস",
    price: 850,
    original_price: 950,
    price_unit: "22 ml Drops",
    stock: 65,
    rating: 4.9,
    sold_count: 142,
    image_url: IMAGES.german_drops,
    description: `<h3>Dr. Reckeweg R41 জার্মান ড্রপস (Vitality & Energy)</h3>
<p>বাংলাদেশে সবচেয়ে জনপ্রিয় জার্মান হোমিওপ্যাথি ড্রপস। শারীরিক ও মানসিক ক্লান্তি, শক্তিবর্ধক এবং স্নায়বিক দুর্বলতা দূর করতে অত্যন্ত ফলপ্রসূ।</p>
<h4>প্রধান কার্যকারিতা ও উপকারিতা:</h4>
<ul>
  <li>শারীরিক দুর্বলতা ও স্নায়বিক অবসাদ দূর করে।</li>
  <li>স্ট্যামিনা ও জীবনীশক্তি প্রাকৃতিক উপায়ে বৃদ্ধি করে।</li>
  <li>মানসিক চাপ, অতিরিক্ত চিন্তা ও বিষণ্ণতা কমায়।</li>
</ul>
<h4>সেবনবিধি:</h4>
<p>দৈনিক ২ থেকে ৩ বার, ১০-১৫ ফোঁটা ওষুধ সামান্য কুসুম গরম পানির সাথে মিশিয়ে খাবারের ৩০ মিনিট আগে সেবন করুন। অথবা রেজিস্ট্রার্ড চিকিৎসকের পরামর্শ অনুযায়ী সেবন করুন।</p>
<p><strong>প্রস্তুতকারক:</strong> Dr. Reckeweg & Co. GmbH, Bensheim, Germany.</p>`
  },
  {
    name: "Dr. Reckeweg R89 (Lipocol / Hair Care Drops)",
    generic_name: "Alfalfa, Hypophysis, Kalium phosphoricum, Testes",
    category: "homeopathy",
    subcategory: "জার্মান ড্রপস",
    price: 1150,
    original_price: 1300,
    price_unit: "30 ml Drops",
    stock: 50,
    rating: 4.9,
    sold_count: 118,
    image_url: IMAGES.german_drops,
    description: `<h3>Dr. Reckeweg R89 জার্মান হেয়ার কেয়ার ড্রপস</h3>
<p>অকালে চুল পড়া বন্ধ এবং নতুন চুল গজানোর জন্য অত্যন্ত কার্যকরী জার্মান হোমিওপ্যাথিক ফর্মুলেশন। হরমোনের ভারসাম্যহীনতা ও পুষ্টিহীনতাজনিত চুল পড়ায় দারুণ কাজ করে।</p>
<h4>প্রধান উপকারিতা:</h4>
<ul>
  <li>অতিরিক্ত চুল পড়া দ্রুত হ্রাস করে।</li>
  <li>হেয়ার ফলিকলকে পুষ্টি জুগিয়ে নতুন চুল গজাতে সহায়তা করে।</li>
  <li>মাথার ত্বক সুস্থ ও খুশকিমুক্ত রাখতে সাহায্য করে।</li>
</ul>
<h4>সেবনবিধি:</h4>
<p>প্রতিদিন ৩ বার, ২০-৩০ ফোঁটা ওষুধ আধা কাপ পানিতে মিশিয়ে খাবারের আগে সেব্য।</p>
<p><strong>প্রস্তুতকারক:</strong> Dr. Reckeweg & Co. GmbH, Germany.</p>`
  },
  {
    name: "Dr. Reckeweg R1 (Inflammation & Tonsil Drops)",
    generic_name: "Apis mellifica, Belladonna, Calcium jodatum, Hepar sulfuris",
    category: "homeopathy",
    subcategory: "জার্মান ড্রপস",
    price: 750,
    original_price: 850,
    price_unit: "22 ml Drops",
    stock: 80,
    rating: 4.8,
    sold_count: 94,
    image_url: IMAGES.german_drops,
    description: `<h3>Dr. Reckeweg R1 ইনফ্লামেশন ও টনসিল ড্রপস</h3>
<p>টনসিলাইটিস, গলা ব্যথা, যেকোনো তীব্র প্রদাহ ও ইনফেকশনে দ্রুত উপশম প্রদান করে।</p>
<h4>প্রধান উপকারিতা:</h4>
<ul>
  <li>টনসিলের ব্যথা ও ফোলাভাব দ্রুত কমায়।</li>
  <li>গলা ব্যথা ও ঢোক গিলতে কষ্ট উপশম করে।</li>
  <li>শরীরের যেকোনো ব্যাকটেরিয়াল ইনফ্লামেশন নিরাময়ে সহায়ক।</li>
</ul>
<h4>সেবনবিধি:</h4>
<p>তীব্র অবস্থায় প্রতি ১-২ ঘণ্টা পর পর ১০-১৫ ফোঁটা সামান্য পানিতে সেবনযোগ্য। সাধারণ অবস্থায় দিনে ৩ বার।</p>
<p><strong>প্রস্তুতকারক:</strong> Dr. Reckeweg & Co. GmbH, Germany.</p>`
  },
  {
    name: "Dr. Reckeweg R9 (Jutussin / Cough Drops)",
    generic_name: "Belladonna, Bryonia, Coccus cacti, Drosera, Ipecacuanha",
    category: "homeopathy",
    subcategory: "জার্মান ড্রপস",
    price: 750,
    original_price: 850,
    price_unit: "22 ml Drops",
    stock: 75,
    rating: 4.8,
    sold_count: 85,
    image_url: IMAGES.german_drops,
    description: `<h3>Dr. Reckeweg R9 কাশি ও ব্রঙ্কাইটিস ড্রপস</h3>
<p>শুকনো কাশি, খুসখুসে কাশি, শ্বাসকষ্ট এবং ক্রনিক কফ নিরাময়ে কার্যকর প্রাকৃতিক সমাধান।</p>
<h4>উপকারিতা:</h4>
<ul>
  <li>বুকে জমাট বাঁধা কফ পাতলা করে বের করে দেয়।</li>
  <li>শুকনো খুসখুসে কাশি শান্ত করে।</li>
  <li>ধূমপায়ী ও অ্যালার্জিক কাশির জন্য বিশেষ উপযোগী।</li>
</ul>
<h4>সেবনবিধি:</h4>
<p>দিনে ৩-৪ বার, ১০-১৫ ফোঁটা ওষুধ কুসুম গরম পানির সাথে সেবন করুন।</p>
<p><strong>প্রস্তুতকারক:</strong> Dr. Reckeweg & Co. GmbH, Germany.</p>`
  },
  {
    name: "Dr. Reckeweg R16 (Migraine & Headache Drops)",
    generic_name: "Cimicifuga, Gelsemium, Iris versicolor, Sanguinaria",
    category: "homeopathy",
    subcategory: "জার্মান ড্রপস",
    price: 750,
    original_price: 850,
    price_unit: "22 ml Drops",
    stock: 60,
    rating: 4.7,
    sold_count: 67,
    image_url: IMAGES.german_drops,
    description: `<h3>Dr. Reckeweg R16 মাইগ্রেন ও মাথাব্যথা ড্রপস</h3>
<p>দীর্ঘদিনের মাইগ্রেন, আধকপালি মাথাব্যথা ও মানসিক চাপের মাথাব্যথা দূর করতে বিশেষ কার্যকরী।</p>
<h4>উপকারিতা:</h4>
<ul>
  <li>মাইগ্রেনের ব্যথা দ্রুত উপশম করে।</li>
  <li>মাথা ঘোরানো ও চোখের ওপর চাপের অনুভূতি কমায়।</li>
</ul>
<h4>সেবনবিধি:</h4>
<p>১০-১৫ ফোঁটা ওষুধ সামান্য পানিতে মিশিয়ে দিনে ৩ বার সেবন করুন।</p>
<p><strong>প্রস্তুতকারক:</strong> Dr. Reckeweg & Co. GmbH, Germany.</p>`
  },
  {
    name: "Dr. Reckeweg R49 (Rhinopulsan / Sinusitis Drops)",
    generic_name: "Arsenicum album, Calcium carbonicum, Cinnabaris, Pulsatilla",
    category: "homeopathy",
    subcategory: "জার্মান ড্রপস",
    price: 750,
    original_price: 850,
    price_unit: "22 ml Drops",
    stock: 70,
    rating: 4.8,
    sold_count: 73,
    image_url: IMAGES.german_drops,
    description: `<h3>Dr. Reckeweg R49 সাইনোসাইটিস ও সর্দি ড্রপস</h3>
<p>ক্রনিক সাইনাস, সর্দি, অনবরত হাঁচি এবং নাক বন্ধ থাকার স্থায়ী প্রাকৃতিক সমাধান।</p>
<h4>উপকারিতা:</h4>
<ul>
  <li>নাকের বন্ধ ভাব ও শ্বাসকষ্ট দূর করে।</li>
  <li>সাইনাসের কারণে কপাল ও নাকের দুপাশে জমে থাকা কফ ও ব্যথা নিরাময় করে।</li>
</ul>
<h4>সেবনবিধি:</h4>
<p>১০-১৫ ফোঁটা পানিতে দিনে ৩ বার সেবন করুন।</p>
<p><strong>প্রস্তুতকারক:</strong> Dr. Reckeweg & Co. GmbH, Germany.</p>`
  },
  {
    name: "Dr. Reckeweg R53 (Acne & Pimples Drops)",
    generic_name: "Ammonium bromatum, Bromum, Hepar sulfuris, Juglans regia",
    category: "homeopathy",
    subcategory: "জার্মান ড্রপস",
    price: 750,
    original_price: 850,
    price_unit: "22 ml Drops",
    stock: 65,
    rating: 4.7,
    sold_count: 59,
    image_url: IMAGES.german_drops,
    description: `<h3>Dr. Reckeweg R53 ব্রণ ও ত্বকের ফুসকুড়ি ড্রপস</h3>
<p>মুখের অতিরিক্ত ব্রণ, ফুসকুড়ি, ত্বকের তৈলাক্ততা ও ইনফেকশন ভেতর থেকে পরিষ্কার করতে সাহায্য করে।</p>
<h4>সেবনবিধি:</h4>
<p>১০-১৫ ফোঁটা দিনে ৩ বার খাবারের আধা ঘণ্টা আগে আধা কাপ পানিতে মিশিয়ে সেব্য।</p>
<p><strong>প্রস্তুতকারক:</strong> Dr. Reckeweg & Co. GmbH, Germany.</p>`
  },
  {
    name: "Dr. Reckeweg R7 (Hepagalen / Liver & Gallbladder Drops)",
    generic_name: "Carduus marianus, Chelidonium, Lycopodium, Nux vomica",
    category: "homeopathy",
    subcategory: "জার্মান ড্রপস",
    price: 750,
    original_price: 850,
    price_unit: "22 ml Drops",
    stock: 55,
    rating: 4.8,
    sold_count: 62,
    image_url: IMAGES.german_drops,
    description: `<h3>Dr. Reckeweg R7 লিভার ও পিত্তথলির ড্রপস</h3>
<p>ফ্যাটি লিভার, জন্ডিস, লিভারের দুর্বলতা ও হজম শক্তি বাড়াতে কার্যকর জার্মান ওষুধ।</p>
<h4>সেবনবিধি:</h4>
<p>১০-১৫ ফোঁটা পানিতে দিনে ৩ বার খাবারের আগে সেবন করুন।</p>
<p><strong>প্রস্তুতকারক:</strong> Dr. Reckeweg & Co. GmbH, Germany.</p>`
  },

  // ─── 2. Mother Tinctures (মাদার টিংচার - Q Potency) ───
  {
    name: "Berberis Aquifolium Q (Dr. Willmar Schwabe Germany)",
    generic_name: "Berberis Aquifolium Mother Tincture Q",
    category: "homeopathy",
    subcategory: "মাদার টিংচার",
    price: 650,
    original_price: 750,
    price_unit: "30 ml Bottle",
    stock: 90,
    rating: 4.9,
    sold_count: 180,
    image_url: IMAGES.mother_tincture,
    description: `<h3>Berberis Aquifolium Q (Dr. Willmar Schwabe Germany)</h3>
<p>মেছতা, ব্রণের দাগ এবং মুখের কালো দাগ দূর করে ত্বক ফর্সা ও উজ্জ্বল করতে বিশ্বজুড়ে সর্বাধিক সমাদৃত হোমিওপ্যাথিক মাদার টিংচার।</p>
<h4>উপকারিতা:</h4>
<ul>
  <li>ত্বকের গভীর থেকে রক্ত পরিষ্কার করে দাগমুক্ত উজ্জ্বলতা দেয়।</li>
  <li>মেছতা (Melasma) এবং ব্রণের জেদি দাগ দূর করতে কার্যকর।</li>
  <li>ত্বকের অতিরিক্ত তৈলাক্ত ভাব নিয়ন্ত্রণ করে।</li>
</ul>
<h4>ব্যবহারবিধি:</h4>
<p>সেবনের জন্য: ১০-১৫ ফোঁটা ওষুধ আধা কাপ পানিতে দিনে ২-৩ বার।<br>বাহ্যিক প্রয়োগ: সমান পরিমাণ গোলাপ জল (Rose Water) এর সাথে মিশিয়ে রাতে ঘুমানোর আগে মুখে তুলো দিয়ে লাগানো যায়।</p>
<p><strong>প্রস্তুতকারক:</strong> Dr. Willmar Schwabe, Karlsruhe, Germany.</p>`
  },
  {
    name: "Arnica Montana Q (Dr. Willmar Schwabe Germany)",
    generic_name: "Arnica Montana Mother Tincture Q",
    category: "homeopathy",
    subcategory: "মাদার টিংচার",
    price: 600,
    original_price: 700,
    price_unit: "30 ml Bottle",
    stock: 85,
    rating: 4.9,
    sold_count: 165,
    image_url: IMAGES.mother_tincture,
    description: `<h3>Arnica Montana Q (Schwabe Germany)</h3>
<p>আঘাতের ব্যথা, রক্ত জমাট বাঁধা এবং চুলের বৃদ্ধি ও যত্নে একটি অসাধারণ প্রাকৃতিক রেমিডি।</p>
<h4>উপকারিতা:</h4>
<ul>
  <li>আঘাতজনিত যে কোনো ব্যথা ও ফোলাভাব দ্রুত কমায়।</li>
  <li>নারিকেল তেল বা অলিভ অয়েলের সাথে মিশিয়ে চুলে দিলে চুল পড়া বন্ধ হয়।</li>
  <li>মাথার ত্বকে রক্ত সঞ্চালন বৃদ্ধি করে চুল ঘন ও মজবুত করে।</li>
</ul>
<h4>সেবনবিধি:</h4>
<p>১০ ফোঁটা দিনে ২ বার পানিতে মিশিয়ে সেব্য। বাহ্যিক ব্যবহারের জন্য নারিকেল তেলের সাথে ১০:১ অনুপাতে মিশিয়ে ব্যবহার্য।</p>
<p><strong>প্রস্তুতকারক:</strong> Dr. Willmar Schwabe, Germany.</p>`
  },
  {
    name: "Ashwagandha Q / Withania Somnifera (Schwabe / SBL)",
    generic_name: "Withania Somnifera Mother Tincture Q",
    category: "homeopathy",
    subcategory: "মাদার টিংচার",
    price: 550,
    original_price: 650,
    price_unit: "30 ml Bottle",
    stock: 75,
    rating: 4.8,
    sold_count: 125,
    image_url: IMAGES.mother_tincture,
    description: `<h3>অশ্বগন্ধা মাদার টিংচার (Ashwagandha Q)</h3>
<p>শারীরিক দুর্বলতা, মানসিক ক্লান্তি, স্মৃতিশক্তি হ্রাস ও সাধারণ অবসাদ দূর করার প্রাকৃতিক শক্তিবর্ধক।</p>
<h4>উপকারিতা:</h4>
<ul>
  <li>শারীরিক বল ও কর্মক্ষমতা বৃদ্ধি করে।</li>
  <li>নার্ভাসনেস ও মানসিক ক্লান্তি দূর করে।</li>
  <li>রোগ প্রতিরোধ ক্ষমতা (Immunity) শক্তিশালী করে।</li>
</ul>
<h4>সেবনবিধি:</h4>
<p>১৫-২০ ফোঁটা ওষুধ আধা কাপ পানিতে মিশিয়ে দিনে ২ বার খাবারের পর সেবন করুন।</p>`
  },
  {
    name: "Thuja Occidentalis Q (Dr. Willmar Schwabe Germany)",
    generic_name: "Thuja Occidentalis Mother Tincture Q",
    category: "homeopathy",
    subcategory: "মাদার টিংচার",
    price: 580,
    original_price: 680,
    price_unit: "30 ml Bottle",
    stock: 70,
    rating: 4.8,
    sold_count: 110,
    image_url: IMAGES.mother_tincture,
    description: `<h3>Thuja Occidentalis Q (Schwabe Germany)</h3>
<p>শরীরের আঁচিল (Warts), চামড়ায় অতিরিক্ত মাংস বৃদ্ধি ও পলিপাস দূর করতে হোমিওপ্যাথিক চিকিৎসায় শীর্ষ ব্যবহৃত ওষুধ।</p>
<h4>ব্যবহারবিধি:</h4>
<p>১০ ফোঁটা করে দিনে ২ বার খাওয়ার পাশাপাশি আঁচিলের ওপর সরাসরি দিনে ১-২ বার লাগাতে পারেন।</p>
<p><strong>প্রস্তুতকারক:</strong> Dr. Willmar Schwabe, Germany.</p>`
  },
  {
    name: "Syzygium Jambolanum Q (Schwabe Germany)",
    generic_name: "Syzygium Jambolanum Mother Tincture Q",
    category: "homeopathy",
    subcategory: "মাদার টিংচার",
    price: 580,
    original_price: 680,
    price_unit: "30 ml Bottle",
    stock: 65,
    rating: 4.8,
    sold_count: 95,
    image_url: IMAGES.mother_tincture,
    description: `<h3>Syzygium Jambolanum Q (ডায়াবেটিস কন্ট্রোল)</h3>
<p>ডায়াবেটিসে রক্তের গ্লুকোজ স্বাভাবিক মাত্রায় রাখতে এবং অতিরিক্ত তৃষ্ণা ও প্রস্রাবের বেগ কমাতে একটি অত্যন্ত ফলপ্রসূ মাদার টিংচার।</p>
<h4>সেবনবিধি:</h4>
<p>১০-১৫ ফোঁটা আধা কাপ পানিতে মিশিয়ে দিনে ৩ বার খাবারের আগে সেব্য।</p>
<p><strong>প্রস্তুতকারক:</strong> Dr. Willmar Schwabe, Germany.</p>`
  },
  {
    name: "Passiflora Incarnata Q (Schwabe / SBL)",
    generic_name: "Passiflora Incarnata Mother Tincture Q",
    category: "homeopathy",
    subcategory: "মাদার টিংচার",
    price: 520,
    original_price: 620,
    price_unit: "30 ml Bottle",
    stock: 60,
    rating: 4.7,
    sold_count: 82,
    image_url: IMAGES.mother_tincture,
    description: `<h3>Passiflora Incarnata Q (প্রাকৃতিক ঘুম ও রিল্যাক্সেশন)</h3>
<p>অনিদ্রা (Insomnia), অতিরিক্ত চিন্তা ও অস্থিরতা দূর করে কোনো ধরণের পার্শ্বপ্রতিক্রিয়া ছাড়াই গভীর ও প্রশান্তিময় ঘুমের সহায়তা করে।</p>
<h4>সেবনবিধি:</h4>
<p>রাতে ঘুমানোর ৩০ মিনিট আগে ২০-২৫ ফোঁটা কুসুম গরম পানিতে মিশিয়ে সেবন করুন।</p>`
  },
  {
    name: "Crataegus Oxyacantha Q (Heart Tonic - Schwabe Germany)",
    generic_name: "Crataegus Oxyacantha Mother Tincture Q",
    category: "homeopathy",
    subcategory: "মাদার টিংচার",
    price: 650,
    original_price: 750,
    price_unit: "30 ml Bottle",
    stock: 50,
    rating: 4.8,
    sold_count: 70,
    image_url: IMAGES.mother_tincture,
    description: `<h3>Crataegus Oxyacantha Q (হার্ট টনিক)</h3>
<p>হৃদযন্ত্রের পেশী শক্তিশালী করতে, বুক ধড়ফড়ানি কমাতে এবং রক্তচাপ স্বাভাবিক রাখতে বিশ্বখ্যাত ভেষজ কার্ডিয়াক টনিক।</p>
<h4>সেবনবিধি:</h4>
<p>১০-১৫ ফোঁটা দিনে ৩ বার পানির সাথে সেব্য।</p>
<p><strong>প্রস্তুতকারক:</strong> Dr. Willmar Schwabe, Germany.</p>`
  },
  {
    name: "Damiana Q / Turnera Diffusa (Schwabe Germany)",
    generic_name: "Turnera Diffusa Mother Tincture Q",
    category: "homeopathy",
    subcategory: "মাদার টিংচার",
    price: 680,
    original_price: 780,
    price_unit: "30 ml Bottle",
    stock: 55,
    rating: 4.8,
    sold_count: 78,
    image_url: IMAGES.mother_tincture,
    description: `<h3>Damiana Q (Schwabe Germany)</h3>
<p>স্নায়বিক শক্তি বৃদ্ধি, অবসাদ দূরীকরণ এবং শারীরিক স্ট্যামিনা বৃদ্ধির জন্য একটি ঐতিহ্যবাহী নির্ভরযোগ্য মাদার টিংচার।</p>
<h4>সেবনবিধি:</h4>
<p>১৫ ফোঁটা আধা কাপ পানিতে মিশিয়ে দিনে ২ বার সেবন করুন।</p>`
  },

  // ─── 3. Biochemic Tablets & Tissue Salts (বায়োকেমিক ট্যাবলেট) ───
  {
    name: "Five Phos 6X (Dr. Willmar Schwabe Germany)",
    generic_name: "Calc phos, Ferr phos, Kali phos, Mag phos, Nat phos 6X",
    category: "homeopathy",
    subcategory: "বায়োকেমিক ট্যাবলেট",
    price: 450,
    original_price: 520,
    price_unit: "20 gm (100 Tabs)",
    stock: 100,
    rating: 4.9,
    sold_count: 210,
    image_url: IMAGES.biochemic,
    description: `<h3>Five Phos 6X (Dr. Willmar Schwabe Germany)</h3>
<p>৫টি গুরুত্বপূর্ণ ফসফেটের সমন্বয়ে তৈরি সর্বোত্তম সাধারণ ও স্নায়বিক বলবর্ধক বায়োকেমিক ওষুধ। শিশু, তরুণ ও বৃদ্ধ—সবার জন্য প্রযোজ্য।</p>
<h4>উপকারিতা:</h4>
<ul>
  <li>রক্তস্বল্পতা ও শারীরিক দুর্বলতা দূর করে।</li>
  <li>ব্রেন সেল ও নার্ভের কার্যক্ষমতা উন্নত করে স্মৃতিশক্তি বাড়ায়।</li>
  <li>দৈনন্দিন ক্লান্তি ও অবসাদ দূর করে।</li>
</ul>
<h4>সেবনবিধি:</h4>
<p>বড়দের জন্য: ৪টি করে ট্যাবলেট দিনে ৩ বার চুষে খাবেন।<br>বাচ্চাদের জন্য: ২টি করে ট্যাবলেট দিনে ৩ বার।</p>
<p><strong>প্রস্তুতকারক:</strong> Dr. Willmar Schwabe, Germany.</p>`
  },
  {
    name: "Calcarea Phosphorica 6X (Schwabe Germany)",
    generic_name: "Calcarea Phosphorica 6X",
    category: "homeopathy",
    subcategory: "বায়োকেমিক ট্যাবলেট",
    price: 380,
    original_price: 450,
    price_unit: "20 gm (100 Tabs)",
    stock: 80,
    rating: 4.8,
    sold_count: 130,
    image_url: IMAGES.biochemic,
    description: `<h3>Calcarea Phosphorica 6X (ক্যালকেরিয়া ফস)</h3>
<p>হাড় ও দাঁত গঠনের অপরিহার্য লবণ। শিশুদের সহজে দাঁত ওঠা এবং হাড় শক্ত করতে অতুলনীয়।</p>
<h4>সেবনবিধি:</h4>
<p>শিশুদের জন্য ২টি ট্যাবলেট দিনে ২ বার সামান্য কুসুম গরম পানিতে বা চুষে খাওয়ার উপযোগী।</p>`
  },
  {
    name: "Ferrum Phosphoricum 6X (Schwabe Germany)",
    generic_name: "Ferrum Phosphoricum 6X",
    category: "homeopathy",
    subcategory: "বায়োকেমিক ট্যাবলেট",
    price: 380,
    original_price: 450,
    price_unit: "20 gm (100 Tabs)",
    stock: 75,
    rating: 4.8,
    sold_count: 115,
    image_url: IMAGES.biochemic,
    description: `<h3>Ferrum Phosphoricum 6X (ফেরাম ফস)</h3>
<p>প্রাথমিক পর্যায়ের জ্বর, সর্দি, ইনফেকশন এবং রক্তে আয়রন ও হিমোগ্লোবিনের ঘাটতি পূরণে সেরা বায়োকেমিক ওষুধ।</p>
<h4>সেবনবিধি:</h4>
<p>৪টি ট্যাবলেট দিনে ৩ বার চুষে সেবন করুন।</p>`
  },
  {
    name: "Silicea 12X (Dr. Willmar Schwabe Germany)",
    generic_name: "Silicea 12X Biochemic Tissue Salt",
    category: "homeopathy",
    subcategory: "বায়োকেমিক ট্যাবলেট",
    price: 420,
    original_price: 490,
    price_unit: "20 gm (100 Tabs)",
    stock: 70,
    rating: 4.8,
    sold_count: 98,
    image_url: IMAGES.biochemic,
    description: `<h3>Silicea 12X (সিলিসিয়া বায়োকেমিক)</h3>
<p>চুল, ত্বক ও নখ মজবুত রাখতে এবং ফোঁড়া বা ক্ষতের পুঁজ বের করে দ্রুত শুকিয়ে দিতে অতুলনীয় ওষুধ।</p>
<h4>সেবনবিধি:</h4>
<p>৪টি ট্যাবলেট দিনে ৩ বার কুসুম গরম পানির সাথে সেব্য।</p>`
  },
  {
    name: "Magnesia Phosphorica 6X (Schwabe Germany)",
    generic_name: "Magnesia Phosphorica 6X",
    category: "homeopathy",
    subcategory: "বায়োকেমিক ট্যাবলেট",
    price: 380,
    original_price: 450,
    price_unit: "20 gm (100 Tabs)",
    stock: 65,
    rating: 4.7,
    sold_count: 85,
    image_url: IMAGES.biochemic,
    description: `<h3>Magnesia Phosphorica 6X (ম্যাগনেসিয়াম ফস)</h3>
<p>প্রাকৃতিক ব্যথানাশক বায়োকেমিক সল্ট। পেটের গ্যাসজনিত মোচড় দেওয়া ব্যথা, দাঁতের ব্যথা ও পেশীর খিঁচুনিতে চমৎকার আরাম দেয়।</p>
<h4>সেবনবিধি:</h4>
<p>৪টি ট্যাবলেট গরম পানিতে গুলিয়ে খেলে ব্যথায় দ্রুত কাজ করে।</p>`
  },
  {
    name: "Biochemic Combination BC-28 (General Tonic)",
    generic_name: "Complete 12 Tissue Salts Balanced Formula",
    category: "homeopathy",
    subcategory: "বায়োকেমিক ট্যাবলেট",
    price: 460,
    original_price: 550,
    price_unit: "20 gm (100 Tabs)",
    stock: 60,
    rating: 4.8,
    sold_count: 92,
    image_url: IMAGES.biochemic,
    description: `<h3>Biochemic Combination No. 28 (BC 28)</h3>
<p>১২টি বায়োকেমিক টিস্যু লবণের সমন্বয়ে তৈরি একটি স্বয়ংসম্পূর্ণ স্বাস্থ্য টনিক। রোগমুক্তির পর দ্রুত শক্তি ফিরে পেতে সহায়ক।</p>
<h4>সেবনবিধি:</h4>
<p>৪টি ট্যাবলেট দিনে ৩ বার খাবারের পর চুষে খাবেন।</p>`
  },

  // ─── 4. Tonics & Syrups (টনিক ও সিরাপ) ───
  {
    name: "Alfalfa Tonic with Ginseng (Dr. Willmar Schwabe Germany)",
    generic_name: "Alfalfa, Avena sat, Ginseng, Cinchona, Hydrastis",
    category: "homeopathy",
    subcategory: "টনিক ও সিরাপ",
    price: 1050,
    original_price: 1200,
    price_unit: "500 ml Bottle",
    stock: 55,
    rating: 4.9,
    sold_count: 175,
    image_url: IMAGES.tonic_syrup,
    description: `<h3>Alfalfa Tonic with Ginseng 500ml (Schwabe Germany)</h3>
<p>বিশ্ববিখ্যাত আলফালফা উইথ জিনসেং টনিক। ক্ষুধা বৃদ্ধি, ওজন বাড়ানো, রক্তস্বল্পতা দূর করা এবং শারীরিক ও মানসিক উদ্দীপনা ফিরিয়ে আনতে সেরা।</p>
<h4>প্রধান উপকারিতা:</h4>
<ul>
  <li>খাবারে অরুচি ও বদহজম দূর করে স্বাভাবিক ক্ষুধা বাড়ায়।</li>
  <li>স্বাস্থ্য ও ওজন প্রাকৃতিকভাবে বৃদ্ধি করে।</li>
  <li>জিনসেং থাকার কারণে শরীর সতেজ ও প্রাণবন্ত রাখে।</li>
</ul>
<h4>সেবনবিধি:</h4>
<p>বড়দের জন্য: ১-২ চা চামচ দিনে ৩ বার খাবারের ৩০ মিনিট আগে।<br>বাচ্চাদের জন্য: ১ চা চামচ দিনে ২-৩ বার।</p>
<p><strong>প্রস্তুতকারক:</strong> Dr. Willmar Schwabe, Germany.</p>`
  },
  {
    name: "Alfalfa Tonic (SBL India)",
    generic_name: "Alfalfa, Avena sativa, Cinchona, Hydrastis",
    category: "homeopathy",
    subcategory: "টনিক ও সিরাপ",
    price: 320,
    original_price: 380,
    price_unit: "180 ml Bottle",
    stock: 90,
    rating: 4.8,
    sold_count: 140,
    image_url: IMAGES.tonic_syrup,
    description: `<h3>Alfalfa Tonic 180ml (SBL India)</h3>
<p>শিশুদের শারীরিক বৃদ্ধি, দুর্বলতা দূর এবং খাওয়ার রুচি বাড়ানোর জন্য বাজেট ফ্রেন্ডলি ও অত্যন্ত জনপ্রিয় হোমিওপ্যাথিক সিরাপ।</p>
<h4>সেবনবিধি:</h4>
<p>১-২ চা চামচ করে দিনে ৩ বার আহারের পূর্বে সেব্য।</p>`
  },
  {
    name: "Stobal Cough Syrup (SBL India)",
    generic_name: "Pulsatilla, Rumex, Justicia adhatoda, Ipecac",
    category: "homeopathy",
    subcategory: "টনিক ও সিরাপ",
    price: 260,
    original_price: 300,
    price_unit: "115 ml Syrup",
    stock: 85,
    rating: 4.7,
    sold_count: 105,
    image_url: IMAGES.tonic_syrup,
    description: `<h3>Stobal Cough Syrup 115ml</h3>
<p>শুকনো কাশি, খুসখুসে ভাব ও কফযুক্ত কাশির জন্য নিরাপদ হোমিওপ্যাথিক সিরাপ। এতে কোনো প্রকার ঘুম ভাব বা তন্দ্রাচ্ছন্নতা হয় না।</p>
<h4>সেবনবিধি:</h4>
<p>বড়রা ১-২ চা চামচ দিনে ৩-৪ বার। বাচ্চারা ১ চা চামচ দিনে ৩ বার।</p>`
  },
  {
    name: "Cydonia Vulgaris Vitality Tonic (Kamal / SBL)",
    generic_name: "Cydonia Vulgaris, Damiana, Ginseng extract",
    category: "homeopathy",
    subcategory: "টনিক ও সিরাপ",
    price: 350,
    original_price: 420,
    price_unit: "100 ml Bottle",
    stock: 60,
    rating: 4.8,
    sold_count: 95,
    image_url: IMAGES.tonic_syrup,
    description: `<h3>Cydonia Vulgaris Vitality Tonic</h3>
<p>পুরুষদের দ্রুত ক্লান্তি, স্নায়বিক দুর্বলতা ও এনার্জির ঘাটতি পূরণে অত্যন্ত কার্যকর হোমিওপ্যাথিক ভেষজ টনিক।</p>
<h4>সেবনবিধি:</h4>
<p>১ চা চামচ করে দিনে ২ বার দুধ অথবা পানির সাথে সেব্য।</p>`
  },

  // ─── 5. Popular Dilutions (ডাইলিউশন - 30C / 200C) ───
  {
    name: "Nux Vomica 30C (Dr. Willmar Schwabe Germany)",
    generic_name: "Nux Vomica 30C Dilution",
    category: "homeopathy",
    subcategory: "ডাইলিউশন",
    price: 420,
    original_price: 480,
    price_unit: "30 ml Drops",
    stock: 95,
    rating: 4.9,
    sold_count: 230,
    image_url: IMAGES.dilution,
    description: `<h3>Nux Vomica 30C (Schwabe Germany)</h3>
<p>গ্যাস্ট্রিক, অতিরিক্ত তেল-মশলাযুক্ত খাবারের পর বুকজ্বালা, কোষ্ঠকাঠিন্য ও বদহজমের মহৌষধ।</p>
<h4>সেবনবিধি:</h4>
<p>৪-৫ ফোঁটা ওষুধ সামান্য পানিতে মিশিয়ে রাতে ঘুমানোর আগে অথবা দিনে ২ বার সেবনযোগ্য।</p>
<p><strong>প্রস্তুতকারক:</strong> Dr. Willmar Schwabe, Germany.</p>`
  },
  {
    name: "Rhus Toxicodendron 200C (Schwabe Germany)",
    generic_name: "Rhus Tox 200C Dilution",
    category: "homeopathy",
    subcategory: "ডাইলিউশন",
    price: 450,
    original_price: 520,
    price_unit: "30 ml Drops",
    stock: 75,
    rating: 4.8,
    sold_count: 110,
    image_url: IMAGES.dilution,
    description: `<h3>Rhus Tox 200C (বাতের ব্যথা নিরাময়)</h3>
<p>বাতব্যথা, হাঁটুর জয়েন্টের জড়তা, পেশীর টান ও স্যাঁতসেঁতে আবহাওয়ায় ব্যথা বেড়ে যাওয়ায় কার্যকর জার্মান ডাইলিউশন।</p>
<h4>সেবনবিধি:</h4>
<p>৪-৫ ফোঁটা ওষুধ সামান্য পানিতে দিনে ২ বার খাবারের আগে সেবন করুন।</p>`
  },
  {
    name: "Belladonna 30C (Dr. Willmar Schwabe Germany)",
    generic_name: "Belladonna 30C Dilution",
    category: "homeopathy",
    subcategory: "ডাইলিউশন",
    price: 420,
    original_price: 480,
    price_unit: "30 ml Drops",
    stock: 70,
    rating: 4.8,
    sold_count: 88,
    image_url: IMAGES.dilution,
    description: `<h3>Belladonna 30C (তীব্র জ্বর ও প্রদাহ)</h3>
<p>হঠাৎ আসা উচ্চ তাপমাত্রা, লালচে ত্বক, তীব্র গলা ব্যথা ও মাথা দপদপ করা ব্যথায় অত্যন্ত দ্রুত কাজ করে।</p>
<h4>সেবনবিধি:</h4>
<p>৪ ফোঁটা ওষুধ সামান্য পানিতে দিনে ৩ বার সেবন করুন।</p>`
  },
  {
    name: "Arsenicum Album 30C (Schwabe Germany)",
    generic_name: "Arsenicum Album 30C Dilution",
    category: "homeopathy",
    subcategory: "ডাইলিউশন",
    price: 420,
    original_price: 480,
    price_unit: "30 ml Drops",
    stock: 65,
    rating: 4.8,
    sold_count: 96,
    image_url: IMAGES.dilution,
    description: `<h3>Arsenicum Album 30C (ফুড পয়জনিং ও অ্যালার্জি)</h3>
<p>ফুড পয়জনিং, বারবার বমি ও পাতলা পায়খানা, সর্দির হাঁচি এবং দুর্বলতায় বহুল ব্যবহৃত নিরাপদ ডাইলিউশন।</p>
<h4>সেবনবিধি:</h4>
<p>৪ ফোঁটা ওষুধ আধা কাপ পানিতে মিশিয়ে দিনে ২-৩ বার সেবনযোগ্য।</p>`
  },
  {
    name: "Lycopodium Clavatum 30C (Schwabe Germany)",
    generic_name: "Lycopodium Clavatum 30C Dilution",
    category: "homeopathy",
    subcategory: "ডাইলিউশন",
    price: 420,
    original_price: 480,
    price_unit: "30 ml Drops",
    stock: 60,
    rating: 4.7,
    sold_count: 75,
    image_url: IMAGES.dilution,
    description: `<h3>Lycopodium Clavatum 30C</h3>
<p>পেটের নিচের অংশে গ্যাস জমা, পেট ফাঁপা, লিভারের দুর্বলতা এবং মিষ্টি খাওয়ার তীব্র আকাঙ্ক্ষার রোগীদের ক্ষেত্রে শ্রেষ্ঠ ফলদায়ক।</p>
<h4>সেবনবিধি:</h4>
<p>৪ ফোঁটা ওষুধ দিনে ২ বার সেবন করুন।</p>`
  },

  // ─── 6. Hair & Skin Care (চুল ও ত্বকের যত্ন) ───
  {
    name: "Arnica Montana Herbal Hair Oil (SBL / Schwabe)",
    generic_name: "Arnica, Jaborandi, Calendula Hair Tonic Oil",
    category: "homeopathy",
    subcategory: "হোমিও হেয়ার ও স্কিন কেয়ার",
    price: 420,
    original_price: 480,
    price_unit: "200 ml Bottle",
    stock: 90,
    rating: 4.9,
    sold_count: 195,
    image_url: IMAGES.hair_oil,
    description: `<h3>Arnica Montana Herbal Hair Oil 200ml</h3>
<p>চুল পড়া দ্রুত বন্ধ করতে, খুশকি নির্মূল করতে এবং মাথার তালুর রক্ত সঞ্চালন বাড়িয়ে নতুন চুল গজাতে বিশ্বস্ত হোমিওপ্যাথিক তেল।</p>
<h4>ব্যবহারবিধি:</h4>
<p>প্রতিদিন গোসলের পর বা রাতে ঘুমানোর আগে আঙুলের ডগা দিয়ে মাথার ত্বকে হালকাভাবে ম্যাসাজ করুন।</p>`
  },
  {
    name: "Silk N Stay Berberis Soap (SBL India)",
    generic_name: "Berberis Aquifolium, Calendula Herbal Soap",
    category: "homeopathy",
    subcategory: "হোমিও হেয়ার ও স্কিন কেয়ার",
    price: 180,
    original_price: 220,
    price_unit: "75 gm Bar",
    stock: 120,
    rating: 4.8,
    sold_count: 220,
    image_url: IMAGES.skin_care,
    description: `<h3>Silk N Stay Berberis Soap 75g</h3>
<p>মেছতা, ব্রণের দাগ এবং ত্বকের কালো ছোপ দূর করতে প্রাকৃতিক বারবেরিস একুইফোলিয়াম সমৃদ্ধ নিরাপদ হারবাল হোমিওপ্যাথিক সাবান।</p>
<h4>ব্যবহারবিধি:</h4>
<p>প্রতিদিন মুখ ও শরীরে সাধারণ সাবানের মতো ব্যবহার করুন।</p>`
  }
];

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();
}

async function seed() {
  console.log(`Starting to seed ${HOMEOPATHY_PRODUCTS.length} homeopathy products into Supabase...`);

  let insertedCount = 0;
  let updatedCount = 0;

  for (const item of HOMEOPATHY_PRODUCTS) {
    const slug = slugify(item.name);
    const sku = `HOM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Check if product already exists
    const { data: existing } = await supabase
      .from('products')
      .select('id, name')
      .eq('name', item.name)
      .maybeSingle();

    if (existing) {
      // Update
      const { error } = await supabase
        .from('products')
        .update({
          category: item.category,
          subcategory: item.subcategory,
          price: item.price,
          original_price: item.original_price,
          price_unit: item.price_unit,
          description: item.description,
          generic_name: item.generic_name,
          image_url: item.image_url,
          is_active: true,
          stock: item.stock,
          rating: item.rating,
          sold_count: item.sold_count,
        })
        .eq('id', existing.id);

      if (error) {
        console.error(`Failed to update "${item.name}":`, error.message);
      } else {
        updatedCount++;
        console.log(`Updated: "${item.name}"`);
      }
    } else {
      // Insert
      const { error } = await supabase
        .from('products')
        .insert({
          name: item.name,
          slug,
          sku,
          category: item.category,
          subcategory: item.subcategory,
          price: item.price,
          original_price: item.original_price,
          price_unit: item.price_unit,
          description: item.description,
          generic_name: item.generic_name,
          image_url: item.image_url,
          is_active: true,
          stock: item.stock,
          rating: item.rating,
          sold_count: item.sold_count,
        });

      if (error) {
        console.error(`Failed to insert "${item.name}":`, error.message);
      } else {
        insertedCount++;
        console.log(`Inserted: "${item.name}" (৳${item.price})`);
      }
    }
  }

  console.log(`\n===> Finished! Inserted: ${insertedCount}, Updated: ${updatedCount}, Total: ${HOMEOPATHY_PRODUCTS.length}`);
}

seed();
