import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, useParams } from "react-router-dom";
import axios from "axios";
import { gamesData, getGamesPage, getFeaturedGames, searchGames, getGameBySlug, getRelatedGames } from "./data.js";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkSession = async () => {
    try {
      const response = await axios.get(`${API}/auth/session`, {
        withCredentials: true
      });
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// Modal Component
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

// Header Component
const Header = () => {
  const { user, login, logout } = useAuth();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  const openModal = (modalType) => {
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  return (
    <>
      <header className="header">
        <nav className="nav-container">
          <Link to="/" className="logo">
            <span className="logo-text">GamesfullZ</span>
            <span className="version-badge">v2.0</span>
          </Link>
          
          <div className={`nav-links ${mobileMenu ? 'nav-links-mobile' : ''}`}>
            <Link to="/" className="nav-link" onClick={() => setMobileMenu(false)}>Inicio</Link>
            <Link to="/juegos" className="nav-link" onClick={() => setMobileMenu(false)}>Juegos</Link>
            <Link to="/contacto" className="nav-link" onClick={() => setMobileMenu(false)}>Contacto</Link>
          </div>

          <div className="floating-buttons">
            <button onClick={() => openModal('about')} className="floating-btn" title="Quién soy">
              👤
            </button>
            <button onClick={() => openModal('privacy')} className="floating-btn" title="Privacidad">
              🔒
            </button>
            <button onClick={() => openModal('legal')} className="floating-btn" title="Legal">
              ⚖️
            </button>
          </div>

          <div className="auth-section">
            {user ? (
              <div className="user-menu">
                <img src={user.picture || '/default-avatar.png'} alt="Usuario" className="user-avatar" />
                <span className="user-name">{user.name}</span>
                <button onClick={logout} className="logout-btn">Salir</button>
              </div>
            ) : (
              <button onClick={login} className="login-btn">Iniciar Sesión</button>
            )}
          </div>

          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            ☰
          </button>
        </nav>
      </header>

      {/* Modals */}
      <Modal isOpen={activeModal === 'about'} onClose={closeModal} title="Quién Soy">
        <div className="modal-text">
          <p>¡Bienvenido a <strong>GamesfullZ</strong>!</p>
          <p>Soy el creador de esta plataforma dedicada a compartir los mejores juegos con la comunidad gaming. 
          Mi objetivo es proporcionar un acceso fácil y rápido a una amplia variedad de juegos para todos los gustos.</p>
          <p>GamesfullZ nació de mi pasión por los videojuegos y el deseo de crear un espacio donde los gamers 
          puedan encontrar, descargar y disfrutar de sus títulos favoritos.</p>
          <p><strong>Versión 2.0</strong> - Ahora con mejor diseño, más funcionalidades y una experiencia de usuario mejorada.</p>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'privacy'} onClose={closeModal} title="Política de Privacidad">
        <div className="modal-text">
          <h3>Recopilación de Información</h3>
          <p>Recopilamos información mínima necesaria para proporcionar nuestros servicios, como datos de autenticación 
          a través de nuestro sistema OAuth.</p>
          
          <h3>Uso de la Información</h3>
          <p>La información recopilada se utiliza exclusivamente para:</p>
          <ul>
            <li>Proporcionar acceso a funciones personalizadas</li>
            <li>Mantener las preferencias del usuario</li>
            <li>Mejorar la experiencia en la plataforma</li>
          </ul>
          
          <h3>Protección de Datos</h3>
          <p>Nos comprometemos a proteger tu información personal y no la compartimos con terceros sin tu consentimiento.</p>
          
          <h3>Cookies</h3>
          <p>Utilizamos cookies esenciales para el funcionamiento del sitio y la autenticación de usuarios.</p>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'legal'} onClose={closeModal} title="Términos Legales">
        <div className="modal-text">
          <h3>Términos de Uso</h3>
          <p>Al utilizar GamesfullZ, aceptas cumplir con estos términos y condiciones.</p>
          
          <h3>Contenido</h3>
          <p>Todo el contenido proporcionado es solo para fines educativos e informativos. 
          Los usuarios son responsables del uso que hagan del contenido descargado.</p>
          
          <h3>Responsabilidad</h3>
          <p>GamesfullZ no se hace responsable por el mal uso de los archivos descargados o 
          por cualquier daño que pueda resultar de su uso.</p>
          
          <h3>Derechos de Autor</h3>
          <p>Respetamos los derechos de propiedad intelectual. Si eres titular de derechos y consideras 
          que se está infringiendo tu propiedad, contáctanos.</p>
          
          <h3>Modificaciones</h3>
          <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. 
          Los cambios serán efectivos inmediatamente después de su publicación.</p>
        </div>
      </Modal>
    </>
  );
};

// Game Card Component for listings
const GameCard = ({ game, isFavorite, onToggleFavorite, compact = false }) => {
  const { user } = useAuth();

  const handleDirectLink = () => {
    window.open(game.directLink, '_blank');
  };

  const handleShortLink = () => {
    window.open(game.shortLink, '_blank');
  };

  return (
    <div className={`game-card ${compact ? 'compact' : ''}`}>
      <Link to={`/juegos/${game.slug}`} className="game-card-link">
        <div className="game-image-container">
          <img src={game.image} alt={game.title} className="game-image" />
          {user && (
            <button 
              className={`favorite-btn ${isFavorite ? 'favorited' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                onToggleFavorite(game.id);
              }}
            >
              {isFavorite ? '❤️' : '🤍'}
            </button>
          )}
          <div className="game-overlay">
            <span className="view-details">Ver Detalles</span>
          </div>
        </div>
        
        <div className="game-content">
          <h3 className="game-title">{game.title}</h3>
          {!compact && <p className="game-description">{game.description}</p>}
          
          <div className="game-metadata">
            <span className="game-category">{game.category}</span>
            <span className="game-rating">⭐ {game.rating}</span>
            <span className="game-downloads">📥 {game.downloads}</span>
            <span className="game-size">💾 {game.size}</span>
          </div>

          {!compact && (
            <div className="game-tags">
              {game.tags.slice(0, 3).map(tag => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </Link>
      
      <div className="download-buttons">
        <button onClick={handleDirectLink} className="download-btn direct">
          Descarga Directa
        </button>
        <button onClick={handleShortLink} className="download-btn short">
          Con Acortador
        </button>
      </div>
    </div>
  );
};

// Home Component
const Home = () => {
  const featuredGames = getFeaturedGames();
  const [favorites, setFavorites] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    try {
      const response = await axios.get(`${API}/favorites`, {
        withCredentials: true
      });
      setFavorites(response.data.map(fav => fav.game_id));
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const toggleFavorite = async (gameId) => {
    if (!user) return;

    try {
      if (favorites.includes(gameId)) {
        await axios.delete(`${API}/favorites/${gameId}`, {
          withCredentials: true
        });
        setFavorites(favorites.filter(id => id !== gameId));
      } else {
        await axios.post(`${API}/favorites/${gameId}`, {}, {
          withCredentials: true
        });
        setFavorites([...favorites, gameId]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-content">
          <div className="welcome-badge">
            <span>🎮 Bienvenido a la nueva versión</span>
          </div>
          <h1 className="hero-title">GamesfullZ v2.0</h1>
          <p className="hero-subtitle">
            La evolución de tu plataforma favorita de juegos. Ahora más rápida, más bella y con mejores funcionalidades.
          </p>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">{gamesData.length}</span>
              <span className="stat-label">Juegos</span>
            </div>
            <div className="stat">
              <span className="stat-number">2.8M+</span>
              <span className="stat-label">Descargas</span>
            </div>
            <div className="stat">
              <span className="stat-number">85K+</span>
              <span className="stat-label">Usuarios</span>
            </div>
          </div>
          <div className="hero-buttons">
            <Link to="/juegos" className="cta-button primary">
              Explorar Juegos
            </Link>
            <button className="cta-button secondary">
              Ver Novedades
            </button>
          </div>
        </div>
      </section>

      <section className="featured-games">
        <h2 className="section-title">Juegos Destacados</h2>
        <div className="games-grid">
          {featuredGames.map(game => (
            <GameCard 
              key={game.id} 
              game={game}
              isFavorite={favorites.includes(game.id)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      </section>

      <section className="stats-section">
        <h2 className="section-title">Estadísticas de GamesfullZ</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">🎮</span>
            <span className="stat-value">{gamesData.length}</span>
            <span className="stat-desc">Juegos Disponibles</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📥</span>
            <span className="stat-value">2.8M+</span>
            <span className="stat-desc">Total de Descargas</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">👥</span>
            <span className="stat-value">85K+</span>
            <span className="stat-desc">Usuarios Registrados</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📦</span>
            <span className="stat-value">12</span>
            <span className="stat-desc">Colecciones</span>
          </div>
        </div>
      </section>
    </div>
  );
};

// Games Listing Component
const Games = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [favorites, setFavorites] = useState([]);
  const [sortBy, setSortBy] = useState('recent');
  const { user } = useAuth();
  
  const itemsPerPage = 12;

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    try {
      const response = await axios.get(`${API}/favorites`, {
        withCredentials: true
      });
      setFavorites(response.data.map(fav => fav.game_id));
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const toggleFavorite = async (gameId) => {
    if (!user) return;

    try {
      if (favorites.includes(gameId)) {
        await axios.delete(`${API}/favorites/${gameId}`, {
          withCredentials: true
        });
        setFavorites(favorites.filter(id => id !== gameId));
      } else {
        await axios.post(`${API}/favorites/${gameId}`, {}, {
          withCredentials: true
        });
        setFavorites([...favorites, gameId]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const getFilteredGames = () => {
    let filteredGames = gamesData;

    if (searchTerm) {
      filteredGames = searchGames(searchTerm);
    }

    if (selectedCategory !== 'all') {
      filteredGames = filteredGames.filter(game => game.category === selectedCategory);
    }

    // Sorting
    switch (sortBy) {
      case 'recent':
        filteredGames.sort((a, b) => new Date(b.updateDate) - new Date(a.updateDate));
        break;
      case 'popular':
        filteredGames.sort((a, b) => parseFloat(b.downloads.replace('k', '')) - parseFloat(a.downloads.replace('k', '')));
        break;
      case 'rating':
        filteredGames.sort((a, b) => b.rating - a.rating);
        break;
      default:
        break;
    }

    return filteredGames;
  };

  const filteredGames = getFilteredGames();
  const totalPages = Math.ceil(filteredGames.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentGames = filteredGames.slice(startIndex, startIndex + itemsPerPage);

  const categories = ['all', ...new Set(gamesData.map(game => game.category))];

  return (
    <div className="games-page">
      <div className="games-header">
        <h1>Todos los Juegos</h1>
        <p>En esta sección se muestran todos los juegos disponibles en GamesfullZ. También puedes buscar juegos por categorías.</p>
      </div>

      <div className="games-filters">
        <div className="search-sort-container">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Buscar juegos..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="search-input"
            />
          </div>
          
          <div className="sort-container">
            <label>Ordenar por:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="recent">Recién actualizados</option>
              <option value="popular">Más descargados</option>
              <option value="rating">Mejor valorados</option>
            </select>
          </div>
        </div>

        <div className="category-filter">
          <h3>Ver categorías</h3>
          <p>Todos los juegos ordenados por categorías</p>
          <div className="category-buttons">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                  setCurrentPage(1);
                }}
                className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
              >
                {category === 'all' ? 'Todos' : category}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="games-grid-container">
        <div className="games-grid listing">
          {currentGames.map(game => (
            <GameCard 
              key={game.id} 
              game={game}
              isFavorite={favorites.includes(game.id)}
              onToggleFavorite={toggleFavorite}
              compact={true}
            />
          ))}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            ← Anterior
          </button>
          
          <div className="pagination-numbers">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let page;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                >
                  {page}
                </button>
              );
            })}
          </div>
          
          <button 
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
};

// Individual Game Page Component
const GameDetail = () => {
  const { slug } = useParams();
  const game = getGameBySlug(slug);
  const [userRating, setUserRating] = useState(0);
  const [review, setReview] = useState('');
  const [gameRatings, setGameRatings] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (game) {
      loadGameRatings();
      if (user) {
        loadFavorites();
      }
    }
  }, [game, user]);

  const loadGameRatings = async () => {
    try {
      const response = await axios.get(`${API}/ratings/${game.id}`);
      setGameRatings(response.data);
    } catch (error) {
      console.error('Error loading ratings:', error);
    }
  };

  const loadFavorites = async () => {
    try {
      const response = await axios.get(`${API}/favorites`, {
        withCredentials: true
      });
      setFavorites(response.data.map(fav => fav.game_id));
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const handleRatingSubmit = async () => {
    if (!user || userRating === 0) return;

    try {
      await axios.post(`${API}/ratings`, {
        game_id: game.id,
        rating: userRating,
        review: review
      }, { withCredentials: true });
      
      loadGameRatings();
      setUserRating(0);
      setReview('');
    } catch (error) {
      console.error('Error submitting rating:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user) return;

    try {
      if (favorites.includes(game.id)) {
        await axios.delete(`${API}/favorites/${game.id}`, {
          withCredentials: true
        });
        setFavorites(favorites.filter(id => id !== game.id));
      } else {
        await axios.post(`${API}/favorites/${game.id}`, {}, {
          withCredentials: true
        });
        setFavorites([...favorites, game.id]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  if (!game) {
    return (
      <div className="game-not-found">
        <h1>Juego no encontrado</h1>
        <p>El juego que buscas no existe o ha sido removido.</p>
        <Link to="/juegos" className="cta-button">Volver a Juegos</Link>
      </div>
    );
  }

  const relatedGames = getRelatedGames(game.id, 6);

  return (
    <div className="game-detail">
      <div className="game-hero">
        <div className="game-hero-background">
          <img src={game.wallpaper} alt={game.title} />
        </div>
        <div className="game-hero-content">
          <div className="game-hero-info">
            <div className="game-stats">
              <span className="visits">{game.visits}</span>
              <span className="downloads">{game.downloads}</span>
              <div className="rating">
                <span className="rating-score">{game.userRating}</span>
                <div className="rating-details">
                  {gameRatings && <span>({gameRatings.total_ratings})</span>}
                </div>
              </div>
            </div>
            
            <div className="game-poster-container">
              <img src={game.image} alt={game.title} className="game-poster" />
              <button className="gameplay-btn">Ver Gameplay</button>
            </div>
          </div>
        </div>
      </div>

      <div className="game-content">
        <div className="game-main">
          <div className="game-header-section">
            <h1>{game.title}</h1>
            <p className="game-full-description">{game.fullDescription}</p>
            
            <div className="game-tags-section">
              {game.tags.map(tag => (
                <Link key={tag} to={`/categorias/${tag.toLowerCase()}`} className="game-tag">
                  {tag}
                </Link>
              ))}
            </div>
          </div>

          <div className="game-info-grid">
            <div className="game-info-card">
              <h3>Información del Juego</h3>
              <div className="info-item">
                <span className="label">Lanzamiento:</span>
                <span className="value">{new Date(game.releaseDate).toLocaleDateString('es-ES')}</span>
              </div>
              <div className="info-item">
                <span className="label">Actualización:</span>
                <span className="value">{new Date(game.updateDate).toLocaleDateString('es-ES')}</span>
              </div>
              <div className="info-item">
                <span className="label">Versión:</span>
                <span className="value">{game.version}</span>
              </div>
              <div className="info-item">
                <span className="label">Tamaño:</span>
                <span className="value">{game.size}</span>
              </div>
              <div className="info-item">
                <span className="label">Crack:</span>
                <span className="value">{game.crack}</span>
              </div>
              <div className="info-item">
                <span className="label">Idioma:</span>
                <span className="value">{game.language}</span>
              </div>
            </div>

            <div className="download-section">
              <div className="download-buttons-main">
                <button 
                  onClick={() => window.open(game.directLink, '_blank')} 
                  className="download-btn-main direct"
                >
                  Descarga Directa
                </button>
                <button 
                  onClick={() => window.open(game.shortLink, '_blank')} 
                  className="download-btn-main short"
                >
                  Con Acortador
                </button>
              </div>
              
              {user && (
                <button 
                  onClick={toggleFavorite}
                  className={`favorite-btn-main ${favorites.includes(game.id) ? 'favorited' : ''}`}
                >
                  {favorites.includes(game.id) ? '❤️ En Favoritos' : '🤍 Añadir a Favoritos'}
                </button>
              )}
            </div>
          </div>

          <div className="requirements-section">
            <h3>Requisitos del Sistema</h3>
            <div className="requirements-grid">
              <div className="requirements-card">
                <h4>Mínimos</h4>
                <div className="req-item">
                  <span>SO: {game.requirements.minimum.os}</span>
                </div>
                <div className="req-item">
                  <span>Procesador: {game.requirements.minimum.processor}</span>
                </div>
                <div className="req-item">
                  <span>Memoria: {game.requirements.minimum.memory}</span>
                </div>
                <div className="req-item">
                  <span>Gráficos: {game.requirements.minimum.graphics}</span>
                </div>
                <div className="req-item">
                  <span>Almacenamiento: {game.requirements.minimum.storage}</span>
                </div>
              </div>
              
              <div className="requirements-card">
                <h4>Recomendados</h4>
                <div className="req-item">
                  <span>SO: {game.requirements.recommended.os}</span>
                </div>
                <div className="req-item">
                  <span>Procesador: {game.requirements.recommended.processor}</span>
                </div>
                <div className="req-item">
                  <span>Memoria: {game.requirements.recommended.memory}</span>
                </div>
                <div className="req-item">
                  <span>Gráficos: {game.requirements.recommended.graphics}</span>
                </div>
                <div className="req-item">
                  <span>Almacenamiento: {game.requirements.recommended.storage}</span>
                </div>
              </div>
            </div>
          </div>

          {user && (
            <div className="rating-section">
              <h3>Valora este juego</h3>
              <div className="rating-form">
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setUserRating(star)}
                      className={`star ${star <= userRating ? 'active' : ''}`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="Escribe tu reseña (opcional)..."
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  className="review-textarea"
                />
                <button onClick={handleRatingSubmit} className="submit-rating-btn">
                  Enviar Valoración
                </button>
              </div>
            </div>
          )}

          {gameRatings && gameRatings.ratings.length > 0 && (
            <div className="reviews-section">
              <h3>Reseñas y Puntuación</h3>
              <div className="reviews-list">
                {gameRatings.ratings.slice(0, 5).map((rating, index) => (
                  <div key={index} className="review-item">
                    <div className="review-header">
                      <span className="reviewer-name">Usuario {index + 1}</span>
                      <span className="review-rating">⭐ {rating.rating}</span>
                    </div>
                    {rating.review && <p className="review-text">{rating.review}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {relatedGames.length > 0 && (
        <div className="related-games-section">
          <h3>Juegos Relacionados</h3>
          <div className="games-grid">
            {relatedGames.map(relatedGame => (
              <GameCard 
                key={relatedGame.id} 
                game={relatedGame}
                isFavorite={favorites.includes(relatedGame.id)}
                onToggleFavorite={toggleFavorite}
                compact={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Contact Component
const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('¡Mensaje enviado! Te contactaremos pronto.');
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <div className="contact-page">
      <div className="contact-container">
        <h1>Contacto</h1>
        <p>¿Tienes alguna pregunta o sugerencia? ¡Nos encantaría escucharte!</p>

        <div className="contact-content">
          <div className="contact-info">
            <h3>Información de Contacto</h3>
            <div className="contact-item">
              <span className="contact-icon">📧</span>
              <span>info@gamesfullz.com</span>
            </div>
            <div className="contact-item">
              <span className="contact-icon">🌐</span>
              <span>www.gamesfullz.com</span>
            </div>
            <div className="contact-item">
              <span className="contact-icon">⏰</span>
              <span>Lunes a Viernes: 9:00 AM - 6:00 PM</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-group">
              <label htmlFor="name">Nombre</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="message">Mensaje</label>
              <textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                required
                rows="5"
                className="form-textarea"
              ></textarea>
            </div>

            <button type="submit" className="submit-btn">
              Enviar Mensaje
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const processSessionId = async () => {
      const hash = window.location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);
      
      if (sessionIdMatch && !user && !processing) {
        setProcessing(true);
        const sessionId = sessionIdMatch[1];
        
        try {
          const response = await axios.post(`${API}/auth/process-session`, 
            sessionId, 
            { 
              headers: { 'Content-Type': 'application/json' },
              withCredentials: true 
            }
          );
          
          setUser(response.data.user);
          
          // Clear the URL hash
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Redirect to games page
          setTimeout(() => navigate('/juegos'), 1500);
          
        } catch (error) {
          console.error('Error processing session:', error);
          navigate('/');
        } finally {
          setProcessing(false);
        }
      } else if (!sessionIdMatch && !user) {
        navigate('/');
      }
    };

    processSessionId();
  }, [location, user, navigate, setUser, processing]);

  if (processing) {
    return (
      <div className="processing-container">
        <div className="loader"></div>
        <p>Procesando autenticación...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="processing-container">
        <p>Redirigiendo...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>¡Bienvenido, {user.name}!</h1>
        <p>Acceso completo a GamesfullZ v2.0 con funciones exclusivas</p>
      </div>
      
      <div className="dashboard-redirect">
        <p>Serás redirigido al catálogo de juegos en unos segundos...</p>
        <Link to="/juegos" className="cta-button">
          Ir a Juegos Ahora
        </Link>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/juegos" element={<Games />} />
              <Route path="/juegos/:slug" element={<GameDetail />} />
              <Route path="/contacto" element={<Contact />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </main>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;