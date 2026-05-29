// Расширенная подборка городов мира для автоподсказок (формат "Город, Страна").
// Не исчерпывающий список — юзер может ввести свой город вручную (свободный ввод).
// Названия на латинице. Для полного поиска на локальных языках нужен гео-API (позже).
export const WORLD_CITIES = [
  // Netherlands
  "Amsterdam, Netherlands", "Rotterdam, Netherlands", "The Hague, Netherlands", "Utrecht, Netherlands",
  "Eindhoven, Netherlands", "Groningen, Netherlands", "Tilburg, Netherlands", "Almere, Netherlands",
  "Breda, Netherlands", "Nijmegen, Netherlands", "Haarlem, Netherlands", "Arnhem, Netherlands",
  "Maastricht, Netherlands", "Leiden, Netherlands", "Delft, Netherlands",
  // Ukraine
  "Kyiv, Ukraine", "Kharkiv, Ukraine", "Odesa, Ukraine", "Dnipro, Ukraine", "Donetsk, Ukraine",
  "Zaporizhzhia, Ukraine", "Lviv, Ukraine", "Kryvyi Rih, Ukraine", "Mykolaiv, Ukraine", "Mariupol, Ukraine",
  "Luhansk, Ukraine", "Vinnytsia, Ukraine", "Makiivka, Ukraine", "Sevastopol, Ukraine", "Simferopol, Ukraine",
  "Kherson, Ukraine", "Poltava, Ukraine", "Chernihiv, Ukraine", "Cherkasy, Ukraine", "Khmelnytskyi, Ukraine",
  "Chernivtsi, Ukraine", "Zhytomyr, Ukraine", "Sumy, Ukraine", "Rivne, Ukraine", "Ivano-Frankivsk, Ukraine",
  "Ternopil, Ukraine", "Lutsk, Ukraine", "Uzhhorod, Ukraine", "Kropyvnytskyi, Ukraine", "Kramatorsk, Ukraine",
  // United Kingdom
  "London, United Kingdom", "Manchester, United Kingdom", "Birmingham, United Kingdom", "Liverpool, United Kingdom",
  "Leeds, United Kingdom", "Glasgow, United Kingdom", "Edinburgh, United Kingdom", "Bristol, United Kingdom",
  "Sheffield, United Kingdom", "Newcastle, United Kingdom", "Cardiff, United Kingdom", "Belfast, United Kingdom",
  "Nottingham, United Kingdom", "Leicester, United Kingdom", "Brighton, United Kingdom",
  // Germany
  "Berlin, Germany", "Munich, Germany", "Hamburg, Germany", "Cologne, Germany", "Frankfurt, Germany",
  "Stuttgart, Germany", "Düsseldorf, Germany", "Leipzig, Germany", "Dortmund, Germany", "Essen, Germany",
  "Bremen, Germany", "Dresden, Germany", "Hanover, Germany", "Nuremberg, Germany", "Duisburg, Germany",
  // France
  "Paris, France", "Marseille, France", "Lyon, France", "Toulouse, France", "Nice, France",
  "Nantes, France", "Strasbourg, France", "Montpellier, France", "Bordeaux, France", "Lille, France",
  // Spain
  "Madrid, Spain", "Barcelona, Spain", "Valencia, Spain", "Seville, Spain", "Zaragoza, Spain",
  "Malaga, Spain", "Bilbao, Spain", "Alicante, Spain", "Granada, Spain", "Palma, Spain",
  // Italy
  "Rome, Italy", "Milan, Italy", "Naples, Italy", "Turin, Italy", "Palermo, Italy",
  "Genoa, Italy", "Bologna, Italy", "Florence, Italy", "Venice, Italy", "Verona, Italy",
  // Portugal
  "Lisbon, Portugal", "Porto, Portugal", "Braga, Portugal", "Faro, Portugal",
  // Poland
  "Warsaw, Poland", "Krakow, Poland", "Lodz, Poland", "Wroclaw, Poland", "Poznan, Poland",
  "Gdansk, Poland", "Szczecin, Poland", "Lublin, Poland", "Katowice, Poland",
  // Other Europe
  "Vienna, Austria", "Graz, Austria", "Zurich, Switzerland", "Geneva, Switzerland", "Bern, Switzerland",
  "Brussels, Belgium", "Antwerp, Belgium", "Ghent, Belgium", "Dublin, Ireland", "Cork, Ireland",
  "Copenhagen, Denmark", "Stockholm, Sweden", "Gothenburg, Sweden", "Oslo, Norway", "Bergen, Norway",
  "Helsinki, Finland", "Prague, Czech Republic", "Brno, Czech Republic", "Budapest, Hungary",
  "Athens, Greece", "Thessaloniki, Greece", "Bucharest, Romania", "Cluj-Napoca, Romania",
  "Sofia, Bulgaria", "Zagreb, Croatia", "Belgrade, Serbia", "Bratislava, Slovakia", "Ljubljana, Slovenia",
  "Tallinn, Estonia", "Riga, Latvia", "Vilnius, Lithuania", "Reykjavik, Iceland", "Luxembourg, Luxembourg",
  // Russia
  "Moscow, Russia", "Saint Petersburg, Russia", "Novosibirsk, Russia", "Yekaterinburg, Russia",
  "Kazan, Russia", "Nizhny Novgorod, Russia", "Chelyabinsk, Russia", "Samara, Russia", "Omsk, Russia",
  "Rostov-on-Don, Russia", "Ufa, Russia", "Krasnoyarsk, Russia", "Voronezh, Russia", "Volgograd, Russia",
  "Krasnodar, Russia", "Sochi, Russia", "Kaliningrad, Russia", "Vladivostok, Russia",
  // Turkey & Middle East
  "Istanbul, Turkey", "Ankara, Turkey", "Izmir, Turkey", "Bursa, Turkey", "Antalya, Turkey",
  "Tel Aviv, Israel", "Jerusalem, Israel", "Haifa, Israel", "Dubai, UAE", "Abu Dhabi, UAE",
  "Sharjah, UAE", "Doha, Qatar", "Riyadh, Saudi Arabia", "Jeddah, Saudi Arabia", "Kuwait City, Kuwait",
  "Amman, Jordan", "Beirut, Lebanon", "Manama, Bahrain", "Muscat, Oman",
  // Caucasus & Central Asia
  "Tbilisi, Georgia", "Batumi, Georgia", "Yerevan, Armenia", "Baku, Azerbaijan",
  "Almaty, Kazakhstan", "Astana, Kazakhstan", "Tashkent, Uzbekistan", "Bishkek, Kyrgyzstan",
  "Minsk, Belarus", "Chisinau, Moldova",
  // USA
  "New York, USA", "Los Angeles, USA", "Chicago, USA", "Houston, USA", "Phoenix, USA",
  "Philadelphia, USA", "San Antonio, USA", "San Diego, USA", "Dallas, USA", "San Jose, USA",
  "Austin, USA", "San Francisco, USA", "Seattle, USA", "Boston, USA", "Miami, USA",
  "Denver, USA", "Atlanta, USA", "Las Vegas, USA", "Portland, USA", "Washington, USA",
  // Canada
  "Toronto, Canada", "Montreal, Canada", "Vancouver, Canada", "Calgary, Canada", "Ottawa, Canada", "Edmonton, Canada",
  // Latin America
  "Mexico City, Mexico", "Guadalajara, Mexico", "Monterrey, Mexico", "Cancun, Mexico",
  "Sao Paulo, Brazil", "Rio de Janeiro, Brazil", "Brasilia, Brazil", "Salvador, Brazil",
  "Buenos Aires, Argentina", "Cordoba, Argentina", "Santiago, Chile", "Bogota, Colombia",
  "Medellin, Colombia", "Lima, Peru", "Quito, Ecuador", "Montevideo, Uruguay", "Caracas, Venezuela",
  // Africa
  "Cairo, Egypt", "Alexandria, Egypt", "Lagos, Nigeria", "Abuja, Nigeria", "Nairobi, Kenya",
  "Cape Town, South Africa", "Johannesburg, South Africa", "Durban, South Africa", "Casablanca, Morocco",
  "Marrakesh, Morocco", "Tunis, Tunisia", "Algiers, Algeria", "Accra, Ghana", "Addis Ababa, Ethiopia",
  // Asia
  "Tokyo, Japan", "Osaka, Japan", "Kyoto, Japan", "Yokohama, Japan", "Nagoya, Japan",
  "Seoul, South Korea", "Busan, South Korea", "Beijing, China", "Shanghai, China", "Guangzhou, China",
  "Shenzhen, China", "Chengdu, China", "Hong Kong, China", "Taipei, Taiwan",
  "Bangkok, Thailand", "Chiang Mai, Thailand", "Phuket, Thailand", "Singapore, Singapore",
  "Kuala Lumpur, Malaysia", "Jakarta, Indonesia", "Bali, Indonesia", "Surabaya, Indonesia",
  "Manila, Philippines", "Cebu, Philippines", "Ho Chi Minh City, Vietnam", "Hanoi, Vietnam",
  "Mumbai, India", "Delhi, India", "Bangalore, India", "Hyderabad, India", "Chennai, India",
  "Kolkata, India", "Pune, India", "Ahmedabad, India", "Jaipur, India",
  "Karachi, Pakistan", "Lahore, Pakistan", "Islamabad, Pakistan", "Dhaka, Bangladesh",
  // Oceania
  "Sydney, Australia", "Melbourne, Australia", "Brisbane, Australia", "Perth, Australia",
  "Adelaide, Australia", "Gold Coast, Australia", "Auckland, New Zealand", "Wellington, New Zealand",
];
