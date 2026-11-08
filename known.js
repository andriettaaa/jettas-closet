// Brands and shops the app can suggest while you type. They only become yours once you pick one and save:
// from then on they come from your own lists, like everything else you typed before.
window.KNOWN = {
  brands: [
    // skincare and body
    'Aesop', 'Augustinus Bader', 'Avène', 'Balea', 'Beauty of Joseon', 'Bioderma', 'Biore', 'Bondi Sands', 'Byoma', 'Caudalie', 'CeraVe', 'Cetaphil', 'Clarins', 'Clinique', 'COSRX', 'Dermalogica',
    'Dr. Jart+', 'Drunk Elephant', 'Embryolisse', 'eos', 'Erborian', 'Etude', 'Eucerin', 'First Aid Beauty', 'Garnier', 'Glow Recipe', 'Good Molecules', 'Hada Labo', 'Holika Holika', 'I\'m From',
    'Innisfree', 'Isntree', 'Kiehl\'s', 'Klairs', 'Kosas', 'L\'Occitane', 'La Roche-Posay', 'Laneige', 'Medik8', 'Mixsoon', 'Missha', 'Murad', 'Naturium', 'NIVEA', 'Neutrogena', 'Nuxe', 'O\'Keeffe\'s',
    'Olay', 'Palmer\'s', 'Paula\'s Choice', 'Peter Thomas Roth', 'Pixi', 'PURITO', 'Rituals', 'Round Lab', 'Sanex', 'Skin1004', 'SkinCeuticals', 'Some By Mi', 'Sol de Janeiro', 'Summer Fridays',
    'Supergoop!', 'Tatcha', 'The Body Shop', 'The INKEY List', 'The Ordinary', 'Topicals', 'Torriden', 'Tree Hut', 'Troubless', 'Vaseline', 'Vichy', 'Youth To The People', 'Aztec Secret', 'Dove',
    'Bonnyhill', 'Byphasse', 'Dr. Organic', 'Weleda', 'Lush', 'Absurd Beauty', 'Roquebrun', 'Rexona', 'Olivia Care', 'Ambre Solaire', 'Ultrasun', 'Hawaiian Tropic', 'Shea Moisture', 'Cantu Skin',
    // make-up
    'Anastasia Beverly Hills', 'Armani Beauty', 'Benefit', 'Bobbi Brown', 'Catrice', 'Charlotte Tilbury', 'Danessa Myricks', 'Dior', 'e.l.f.', 'essence', 'Estée Lauder', 'Fenty Beauty', 'Glossier',
    'Huda Beauty', 'ILIA', 'Juvia\'s Place', 'Kiko', 'Kylie Cosmetics', 'L\'Oréal', 'Laura Mercier', 'MAC', 'Made By Mitchell', 'Makeup by Mario', 'Makeup Revolution', 'Maybelline', 'Milani', 'Morphe',
    'NARS', 'NYX', 'One/Size', 'Pat McGrath', 'Patrick Ta', 'Rare Beauty', 'Revlon', 'Revolution', 'Rimmel', 'Sephora', 'Sweed', 'Too Faced', 'Urban Decay', 'Uoma Beauty', 'Haus Labs', 'Hourglass',
    'Real Techniques', 'Beautyblender', 'Merit', 'Saie', 'Tower 28', 'Dose of Colors', 'Mented', 'Black Opal', 'Iman', 'Fashion Fair', 'Sleek', 'Max Factor', 'Bourjois', 'Lancôme', 'YSL', 'Chanel',
    // hair
    'African Pride', 'Aunt Jackie\'s', 'As I Am', 'Biosilk', 'Blue Magic', 'Bouclème', 'Camille Rose', 'Cantu', 'Carol\'s Daughter', 'CHI', 'Curlsmith', 'Dabur', 'Design Essentials', 'Eco Style',
    'Gisou', 'got2b', 'Kérastase', 'Kinky-Curly', 'Mielle', 'Moroccanoil', 'Olaplex', 'Pantene', 'Pattern', 'Pureology', 'Red One', 'Redken', 'Revlon Professional', 'Sensationnel', 'Shea Moisture',
    'Silk Therapy', 'The Doux', 'TGIN', 'Uncle Funky\'s Daughter', 'Xtreme', 'Yari', 'Bounce Curl', 'Briogeo', 'Ouai', 'Dyson', 'GHD', 'Tangle Teezer', 'Wetbrush', 'Outre', 'Freetress', 'Kanekalon',
    'Elvive', 'Schwarzkopf', 'Garnier Fructis', 'Kruidvat', 'Etos', 'Trevor Sorbie', 'Andrélon', 'John Frieda', 'Paul Mitchell', 'Davines', 'K18', 'Bumble and bumble', 'Mizani', 'ORS',
    // fragrance
    'Burberry', 'Byredo', 'Carolina Herrera', 'Chloé', 'Creed', 'Dolce & Gabbana', 'Ellis Brooklyn', 'Giorgio Armani', 'Givenchy', 'Gucci', 'Guerlain', 'Guess', 'Hermès', 'Jean Paul Gaultier',
    'Jo Malone', 'Kayali', 'Kilian', 'Lattafa', 'Le Labo', 'Loewe', 'Maison Francis Kurkdjian', 'Maison Margiela', 'Mango', 'Marc Jacobs', 'Montblanc', 'Mugler', 'Narciso Rodriguez', 'Paco Rabanne',
    'Parfums de Marly', 'Prada', 'Ralph Lauren', 'Tom Ford', 'Valentino', 'Versace', 'Viktor & Rolf', 'Zadig & Voltaire', 'Zara', 'Zoella', 'Victoria\'s Secret', 'Bath & Body Works', 'Ahmed Al Maghribi',
    'Arabian Oud', 'Afnan', 'Armaf', 'Rasasi', 'Ajmal', 'Diptyque', 'Juliette Has A Gun', 'Glossier You',
    // fashion and shoes
    '& Other Stories', 'Abercrombie & Fitch', 'Acne Studios', 'Adidas', 'Arket', 'Asics', 'Ba&sh', 'Bershka', 'Birkenstock', 'Calvin Klein', 'Carhartt WIP', 'COS', 'Converse', 'Dr. Martens', 'Esprit',
    'Ganni', 'Gap', 'H&M', 'Hollister', 'Hugo Boss', 'Jacquemus', 'JD Williams', 'Levi\'s', 'Lululemon', 'Massimo Dutti', 'Michael Kors', 'Mango', 'New Balance', 'Nike', 'NA-KD', 'Only', 'Pull&Bear',
    'Puma', 'Ralph Lauren', 'Reebok', 'Reformation', 'Sandro', 'Scotch & Soda', 'Skims', 'Steve Madden', 'Stradivarius', 'The North Face', 'Timberland', 'Tommy Hilfiger', 'UGG', 'Uniqlo', 'Vans',
    'Vero Moda', 'Weekday', 'Zara', 'Coach', 'Guess', 'Mulberry', 'Polène', 'Longchamp', 'Fossil', 'Daniel Wellington', 'Pandora', 'Swarovski', 'Ray-Ban', 'Monki', 'Mytheresa', 'Shein', 'Primark',
    'Hunkemöller', 'Victoria\'s Secret', 'Tony Perotti', 'Loavies', 'Nikkie', 'Alix the Label', 'Gestuz', 'Samsøe Samsøe', 'Mos Mosh', 'Our Daily Edit',
    // home, kitchen and tech
    'Apple', 'Bamix', 'Bialetti', 'Bosch', 'BergHOFF', 'Brabantia', 'Braun', 'De\'Longhi', 'Dyson', 'Fiskars', 'Joseph Joseph', 'KitchenAid', 'Le Creuset', 'Lodge', 'Ninja', 'Nespresso', 'OXO',
    'Philips', 'Rösle', 'Samsung', 'Smeg', 'Staub', 'Tefal', 'Tupperware', 'WMF', 'Zwilling', 'Instant Pot', 'Cosori', 'Nutribullet', 'Princess', 'Inventum', 'Sage', 'Xiaomi', 'Sony', 'JBL',
    'Bose', 'Logitech', 'IKEA', 'HAY', 'Muuto', 'Ferm Living', 'Normann Copenhagen', 'Menu', 'Vitra', 'Kartell', '&Tradition', 'Rituals Home', 'Yankee Candle', 'Dille & Kamille', 'Leen Bakker',
    'Miele', 'AEG', 'Siemens', 'Karcher', 'Rowenta', 'Vileda', 'Swiffer', 'Ecover', 'Method', 'Dreft', 'Robijn', 'Ariel', 'Persil', 'Lenor', 'Cif', 'Dettol',
    // supplements and sport
    'MaryRuth\'s', 'Solgar', 'Davitamon', 'Optimum Nutrition', 'Myprotein', 'Body & Fit', 'XXL Nutrition', 'Vitakruid', 'Lucovitaal', 'Nature\'s Bounty', 'Garden of Life', 'Now Foods', 'Bonusan',
    'Orthica', 'Vitals', 'Etos', 'Kruidvat', 'Holland & Barrett', 'Gymshark', 'Under Armour', 'Lululemon', 'Alo Yoga', 'Liforme', 'Manduka', 'Domyos', 'Kettler', 'Theragun'
  ],
  shops: [
    // drugstores and beauty
    'Albert Heijn', 'Bol', 'Boots', 'Cult Beauty', 'DA', 'De Tuinen', 'Di', 'dm', 'Douglas', 'Etos', 'HEMA', 'Holland & Barrett', 'ICI Paris XL', 'Kiko', 'Kruidvat', 'Lookfantastic', 'Lyko',
    'MAC', 'Notino', 'Rituals', 'Sephora', 'Skins', 'Superdrug', 'The Body Shop', 'Trekpleister', 'Ulta', 'Yesstyle', 'Stylevana', 'Olive Young', 'Beauty Bay', 'Lush', 'Flaconi', 'Parfumdreams',
    'Parfumswinkel', 'Bijenkorf', 'Afro Shop', 'Beautyworld', 'Prijsknaller', 'Action', 'Big Bazar', 'Xenos', 'Wibra', 'Zeeman',
    // fashion
    '& Other Stories', 'Arket', 'ASOS', 'Bershka', 'COS', 'De Bijenkorf', 'Esprit', 'H&M', 'Hunkemöller', 'Mango', 'Massimo Dutti', 'NA-KD', 'Nike', 'Adidas', 'Only', 'Primark', 'Pull&Bear',
    'Shein', 'Sissy-Boy', 'Stradivarius', 'Uniqlo', 'Vinted', 'Weekday', 'Wehkamp', 'Zalando', 'Zalando Lounge', 'Zara', 'About You', 'JD Sports', 'Foot Locker', 'Snipes', 'Omoda', 'Sacha',
    'van Haren', 'Nelson', 'Manfield', 'Vanilia', 'Costes', 'America Today', 'C&A', 'Score', 'WE Fashion', 'Mytheresa', 'Farfetch', 'Net-a-Porter', 'Vestiaire Collective', 'Marktplaats',
    'Episode', 'Kilo Shop', 'Rumors', 'Lola Liza', 'The Sting', 'Peek & Cloppenburg', 'Hudson\'s Bay', 'Amazon', 'Temu', 'AliExpress', 'Etsy',
    // groceries
    'Albert Heijn', 'Jumbo', 'Lidl', 'Aldi', 'Plus', 'Dirk', 'Dekamarkt', 'Hoogvliet', 'Vomar', 'Spar', 'Coop', 'Ekoplaza', 'Marqt', 'Picnic', 'Crisp', 'Flink', 'Getir', 'Amazing Oriental',
    'Toko', 'Turkse supermarkt', 'Markt', 'Slager', 'Bakker', 'Sligro', 'Makro', 'Gall & Gall', 'Holland & Barrett',
    // home and tech
    'Action', 'Blokker', 'Bol', 'Coolblue', 'Gamma', 'Hornbach', 'HEMA', 'IKEA', 'Karwei', 'Kwantum', 'Leen Bakker', 'MediaMarkt', 'Praxis', 'Xenos', 'Dille & Kamille', 'Casa', 'Kwantum',
    'Flying Tiger', 'Søstrene Grene', 'Zara Home', 'H&M Home', 'Westwing', 'Fonq', 'Lampenlicht', 'Intratuin', 'Tuincentrum', 'Apple Store', 'Belsimpel', 'Alternate', 'Expert', 'BCC',
    'Decathlon', 'Intersport', 'Bever', 'Gymshark', 'Body & Fit', 'Myprotein', 'Thuisbezorgd'
  ]
};
