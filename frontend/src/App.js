import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { gamesData, getGamesPage, getFeaturedGames, searchGames } from "./data.js";

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

// Components
const Header = () => {
  const { user, login, logout } = useAuth();
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <header className="header">
      <nav className="nav-container">
        <Link to="/" className="logo">
          <span className="logo-text">GameStack</span>
        </Link>
        
        <div className={`nav-links ${mobileMenu ? 'nav-links-mobile' : ''}`}>
          <Link to="/" className="nav-link" onClick={() => setMobileMenu(false)}>Inicio</Link>
          <Link to="/juegos" className="nav-link" onClick={() => setMobileMenu(false)}>Juegos</Link>
          <Link to="/contacto" className="nav-link" onClick={() => setMobileMenu(false)}>Contacto</Link>
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
  );
};

const GameCard = ({ game, isFavorite, onToggleFavorite }) => {
  const { user } = useAuth();

  const handleDirectLink = () => {
    window.open(game.directLink, '_blank');
  };

  const handleShortLink = () => {
    window.open(game.shortLink, '_blank');
  };

  return (
    <div className="game-card">
      <div className="game-image-container">
        <img src={game.image} alt={game.title} className="game-image" />
        {user && (
          <button 
            className={`favorite-btn ${isFavorite ? 'favorited' : ''}`}
            onClick={() => onToggleFavorite(game.id)}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
        )}
      </div>
      
      <div className="game-content">
        <h3 className="game-title">{game.title}</h3>
        <p className="game-description">{game.description}</p>
        
        <div className="game-metadata">
          <span className="game-category">{game.category}</span>
          <span className="game-rating">⭐ {game.rating}</span>
          <span className="game-downloads">📥 {game.downloads}</span>
          <span className="game-size">💾 {game.size}</span>
        </div>

        <div className="game-tags">
          {game.tags.map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>

        <div className="download-buttons">
          <button onClick={handleDirectLink} className="download-btn direct">
            Descarga Directa
          </button>
          <button onClick={handleShortLink} className="download-btn short">
            Con Acortador
          </button>
        </div>
      </div>
    </div>
  );
};

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
          <h1 className="hero-title">Bienvenido a GameStack</h1>
          <p className="hero-subtitle">
            La mejor plataforma para descargar tus juegos favoritos
          </p>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">{gamesData.length}</span>
              <span className="stat-label">Juegos</span>
            </div>
            <div className="stat">
              <span className="stat-number">1.2M+</span>
              <span className="stat-label">Descargas</span>
            </div>
            <div className="stat">
              <span className="stat-number">50K+</span>
              <span className="stat-label">Usuarios</span>
            </div>
          </div>
          <Link to="/juegos" className="cta-button">
            Explorar Juegos
          </Link>
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
    </div>
  );
};

const Games = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [favorites, setFavorites] = useState([]);
  const { user } = useAuth();
  
  const itemsPerPage = 6;

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
        <p>Explora nuestra colección completa de juegos</p>
      </div>

      <div className="games-filters">
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

        <div className="category-filter">
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

      <div className="games-grid">
        {currentGames.map(game => (
          <GameCard 
            key={game.id} 
            game={game}
            isFavorite={favorites.includes(game.id)}
            onToggleFavorite={toggleFavorite}
          />
        ))}
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`pagination-number ${currentPage === page ? 'active' : ''}`}
              >
                {page}
              </button>
            ))}
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

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would typically send the form data to your backend
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
              <span>info@gamestack.com</span>
            </div>
            <div className="contact-item">
              <span className="contact-icon">🌐</span>
              <span>www.gamestack.com</span>
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
        <p>Accede a funciones exclusivas como favoritos y valoraciones</p>
      </div>
      
      <div className="dashboard-redirect">
        <p>Serás redirigido al catálogo de juegos...</p>
        <Link to="/juegos" className="cta-button">
          Ver Juegos
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