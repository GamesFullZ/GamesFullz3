// Base de datos de juegos - Agregar nuevos juegos aquí
export const gamesData = [
  {
    id: "1",
    title: "Hollow Knight Silksong",
    description: "Hollow Knight: Silksong es un juego metroidvania desarrollado por Team Cherry que sigue la historia de Hornet, una cazadora letal que se encuentra cautiva en un reino desconocido llamado Pharloom.",
    image: "https://files.gamesfull.app/uploads/wallpaper/2025/09/hollow-knight-silksong-1757012805751.jpg",
    category: "Aventura",
    rating: 4.8,
    downloads: "125.6k",
    size: "12.3 GB",
    directLink: "https://ejemplo-directo.com/hollow-knight-silksong",
    shortLink: "https://acorta.do/hksilksong",
    featured: true,
    releaseDate: "2024-12-15",
    tags: ["Metroidvania", "Indie", "Aventura"]
  },
  {
    id: "2", 
    title: "Kingdom Come Deliverance II Gold Edition",
    description: "Kingdom Come Deliverance II Gold Edition es un emocionante RPG de acción con mucha narrativa y un exuberante mundo abierto situado en la Europa medieval del siglo XV.",
    image: "https://files.gamesfull.app/uploads/wallpaper/2025/07/kingdom-come-deliverance-ii-gold-edition-1751773755989.jpg",
    category: "RPG",
    rating: 4.6,
    downloads: "89.3k",
    size: "45.2 GB", 
    directLink: "https://ejemplo-directo.com/kingdom-come-2",
    shortLink: "https://acorta.do/kcd2",
    featured: true,
    releaseDate: "2024-11-20",
    tags: ["RPG", "Medieval", "Mundo Abierto"]
  },
  {
    id: "3",
    title: "The Last of Us Part II Remastered", 
    description: "Disfruta de la experiencia que ganó más de 300 premios a juego del año con una serie de mejoras técnicas que hacen de The Last of Us Parte II Remastered la forma definitiva.",
    image: "https://files.gamesfull.app/uploads/image/2025/09/the-last-of-us-part-ii-remastered-1758647244596-193x288.jpg",
    category: "Acción",
    rating: 4.9,
    downloads: "203.7k",
    size: "78.5 GB",
    directLink: "https://ejemplo-directo.com/tlou2-remastered",
    shortLink: "https://acorta.do/tlou2r",
    featured: true,
    releaseDate: "2024-10-10",
    tags: ["Acción", "Aventura", "Supervivencia"]
  },
  {
    id: "4",
    title: "Hades II",
    description: "La secuela del aclamado roguelike que continúa la mitología griega con nuevos personajes, mecánicas mejoradas y una narrativa épica.",
    image: "https://files.gamesfull.app/uploads/image/2025/09/hades-ii-1758827848134-193x288.jpg",
    category: "Indie",
    rating: 4.7,
    downloads: "156.4k",
    size: "8.9 GB",
    directLink: "https://ejemplo-directo.com/hades-2",
    shortLink: "https://acorta.do/hades2",
    featured: false,
    releaseDate: "2024-09-25",
    tags: ["Roguelike", "Indie", "Mitología"]
  },
  {
    id: "5", 
    title: "Cyberpunk 2077",
    description: "Un RPG de acción y aventura de mundo abierto que se desarrolla en Night City, una megalópolis obsesionada con el poder, el glamour y las modificaciones corporales.",
    image: "https://files.gamesfull.app/uploads/image/2020/12/cyberpunk-2077-elamigos-poster-193x288.jpg",
    category: "RPG",
    rating: 4.3,
    downloads: "320.8k",
    size: "62.1 GB",
    directLink: "https://ejemplo-directo.com/cyberpunk-2077",
    shortLink: "https://acorta.do/cp2077",
    featured: false,
    releaseDate: "2024-08-15",
    tags: ["RPG", "Cyberpunk", "Mundo Abierto"]
  },
  {
    id: "6",
    title: "Elden Ring Deluxe Edition",
    description: "Un juego de rol de acción desarrollado por FromSoftware en colaboración con George R.R. Martin, creando un mundo oscuro y épico.",
    image: "https://files.gamesfull.app/uploads/image/2022/02/elden-ring-deluxe-edition-elamigos-poster-193x288.jpg",
    category: "RPG",
    rating: 4.8,
    downloads: "287.3k",
    size: "49.7 GB",
    directLink: "https://ejemplo-directo.com/elden-ring",
    shortLink: "https://acorta.do/eldenring",
    featured: false,
    releaseDate: "2024-07-30",
    tags: ["Souls-like", "RPG", "Fantasía"]
  },
  {
    id: "7",
    title: "God of War",
    description: "Kratos vive ahora como un hombre en el reino de los dioses nórdicos y los monstruos. Es en este duro e implacable mundo donde debe luchar para sobrevivir.",
    image: "https://files.gamesfull.app/uploads/image/2022/01/god-of-war-elamigos-poster-193x288.jpg",
    category: "Acción",
    rating: 4.9,
    downloads: "355.8k", 
    size: "45.6 GB",
    directLink: "https://ejemplo-directo.com/god-of-war",
    shortLink: "https://acorta.do/gow",
    featured: false,
    releaseDate: "2024-06-20",
    tags: ["Acción", "Mitología", "Aventura"]
  },
  {
    id: "8",
    title: "Red Dead Redemption 2",
    description: "América, 1899. El fin de la era del salvaje oeste ha comenzado. Después de que un robo sale mal en la ciudad de Blackwater, Arthur Morgan y la banda de Van der Linde se ven obligados a huir.",
    image: "https://files.gamesfull.app/uploads/image/2019/11/red-dead-redemption-2-elamigos-poster-193x288.jpg",
    category: "Acción",
    rating: 4.7,
    downloads: "253.1k",
    size: "89.2 GB",
    directLink: "https://ejemplo-directo.com/rdr2", 
    shortLink: "https://acorta.do/rdr2",
    featured: false,
    releaseDate: "2024-05-15",
    tags: ["Western", "Mundo Abierto", "Aventura"]
  }
];

// Función para obtener juegos con paginación automática
export const getGamesPage = (page = 1, itemsPerPage = 6) => {
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const games = gamesData.slice(startIndex, endIndex);
  
  return {
    games,
    totalGames: gamesData.length,
    totalPages: Math.ceil(gamesData.length / itemsPerPage),
    currentPage: page,
    hasNextPage: endIndex < gamesData.length,
    hasPrevPage: page > 1
  };
};

// Función para obtener juegos destacados
export const getFeaturedGames = () => {
  return gamesData.filter(game => game.featured);
};

// Función para obtener juegos por categoría
export const getGamesByCategory = (category) => {
  return gamesData.filter(game => game.category === category);
};

// Función para buscar juegos
export const searchGames = (query) => {
  const lowercaseQuery = query.toLowerCase();
  return gamesData.filter(game => 
    game.title.toLowerCase().includes(lowercaseQuery) ||
    game.description.toLowerCase().includes(lowercaseQuery) ||
    game.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};