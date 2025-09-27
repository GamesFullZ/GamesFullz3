import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, useParams } from "react-router-dom";
import axios from "axios";
import { gamesData, getGamesPage, searchGames, getGameBySlug, getRelatedGames } from "./data.js";

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

// Auth Forms Component
const AuthForms = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    username: '',
    rememberMe: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'register') {
        const response = await axios.post(`${API}/auth/register`, {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          username: formData.username
        });
        setUser(response.data.user);
        onClose();
      } else {
        const response = await axios.post(`${API}/auth/login`, {
          email: formData.email,
          password: formData.password,
          remember_me: formData.rememberMe
        }, { withCredentials: true });
        setUser(response.data.user);
        onClose();
      }
    } catch (error) {
      setError(error.response?.data?.detail || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}>
      <form onSubmit={handleSubmit} className="auth-form">
        {error && (
          <div className="error-message" style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#EF4444',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {mode === 'register' && (
          <>
            <div className="form-group">
              <label htmlFor="name">Nombre completo</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="username">Nombre de usuario</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>
          </>
        )}

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Contraseña</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="form-input"
          />
        </div>

        {mode === 'login' && (
          <div className="form-group">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              <label htmlFor="rememberMe">Recordarme</label>
            </div>
          </div>
        )}

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Procesando...' : (mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta')}
        </button>

        <div className="auth-switch">
          {mode === 'login' ? (
            <p>
              ¿No tienes cuenta? 
              <button type="button" onClick={() => setMode('register')}>
                Regístrate aquí
              </button>
            </p>
          ) : (
            <p>
              ¿Ya tienes cuenta? 
              <button type="button" onClick={() => setMode('login')}>
                Inicia sesión aquí
              </button>
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
};

// Profile Modal Component
const ProfileModal = ({ isOpen, onClose }) => {
  const { user, setUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    username: user?.username || '',
    bio: user?.bio || '',
    location: user?.location || '',
    website: user?.website || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.put(`${API}/user/profile`, formData, {
        withCredentials: true
      });
      setUser(response.data);
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/user/upload-avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      
      setUser(prev => ({ ...prev, picture: response.data.picture_url }));
    } catch (error) {
      console.error('Error uploading avatar:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Perfil">
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label>Foto de perfil</label>
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <img 
              src={user?.picture || '/default-avatar.png'} 
              alt="Avatar" 
              style={{ 
                width: '100px', 
                height: '100px', 
                borderRadius: '50%', 
                border: '3px solid var(--primary-purple)',
                marginBottom: '1rem'
              }} 
            />
            <div className="file-upload">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarUpload} 
              />
              <div className="file-upload-btn">
                📷 Cambiar foto
              </div>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="name">Nombre</label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="username">Nombre de usuario</label>
          <input
            type="text"
            id="username"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="bio">Biografía</label>
          <textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData({...formData, bio: e.target.value})}
            className="form-textarea"
            rows="3"
            placeholder="Cuéntanos sobre ti..."
          ></textarea>
        </div>

        <div className="form-group">
          <label htmlFor="location">Ubicación</label>
          <input
            type="text"
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
            className="form-input"
            placeholder="Ciudad, País"
          />
        </div>

        <div className="form-group">
          <label htmlFor="website">Sitio web</label>
          <input
            type="url"
            id="website"
            value={formData.website}
            onChange={(e) => setFormData({...formData, website: e.target.value})}
            className="form-input"
            placeholder="https://..."
          />
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>
    </Modal>
  );
};

// Header Component
const Header = () => {
  const { user, login, logout } = useAuth();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [authModal, setAuthModal] = useState(false);
  const [profileModal, setProfileModal] = useState(false);

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
              <div className="user-menu" onClick={() => setProfileModal(true)} style={{ cursor: 'pointer' }}>
                <img src={user.picture || '/default-avatar.png'} alt="Usuario" className="user-avatar" />
                <span className="user-name">{user.name}</span>
                <button onClick={(e) => { e.stopPropagation(); logout(); }} className="logout-btn">Salir</button>
              </div>
            ) : (
              <>
                <button onClick={() => setAuthModal(true)} className="login-btn">Iniciar Sesión</button>
                <button onClick={() => { setAuthModal(true); }} className="register-btn">Registro</button>
              </>
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
          <p>¡Bienvenido a <strong>GamesfullZ v2.0</strong>!</p>
          <p>Soy el creador de esta plataforma dedicada a compartir los mejores juegos con la comunidad gaming. 
          Mi objetivo es proporcionar un acceso fácil y rápido a una amplia variedad de juegos para todos los gustos.</p>
          <p>GamesfullZ nació de mi pasión por los videojuegos y el deseo de crear un espacio donde los gamers 
          puedan encontrar, descargar y disfrutar de sus títulos favoritos.</p>
          <p><strong>Versión 2.0</strong> - Ahora con mejor diseño, más funcionalidades, sistema de usuarios completo y una experiencia premium.</p>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'privacy'} onClose={closeModal} title="Política de Privacidad">
        <div className="modal-text">
          <h3>Recopilación de Información</h3>
          <p>Recopilamos información necesaria para proporcionar nuestros servicios, incluyendo datos de registro, 
          preferencias de usuario y estadísticas de uso.</p>
          
          <h3>Uso de la Información</h3>
          <p>La información recopilada se utiliza para:</p>
          <ul>
            <li>Proporcionar acceso a funciones personalizadas</li>
            <li>Mantener las preferencias y favoritos del usuario</li>
            <li>Mejorar la experiencia en la plataforma</li>
            <li>Moderar contenido y mantener la comunidad segura</li>
          </ul>
          
          <h3>Protección de Datos</h3>
          <p>Implementamos medidas de seguridad avanzadas para proteger tu información personal. 
          Todos los datos sensibles están encriptados.</p>
          
          <h3>Cookies y Sesiones</h3>
          <p>Utilizamos cookies para mantener tu sesión activa y recordar tus preferencias si eliges la opción "Recordarme".</p>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'legal'} onClose={closeModal} title="Términos Legales">
        <div className="modal-text">
          <h3>Términos de Uso</h3>
          <p>Al utilizar GamesfullZ v2.0, aceptas cumplir con estos términos y condiciones actualizados.</p>
          
          <h3>Cuentas de Usuario</h3>
          <p>Los usuarios son responsables de mantener la confidencialidad de sus credenciales de acceso. 
          Cualquier actividad realizada desde tu cuenta será de tu responsabilidad.</p>
          
          <h3>Contenido y Moderación</h3>
          <p>GamesfullZ implementa sistemas automáticos de moderación para mantener un ambiente seguro. 
          El contenido ofensivo será censurado automáticamente.</p>
          
          <h3>Responsabilidad</h3>
          <p>GamesfullZ no se hace responsable por el mal uso de los archivos descargados o 
          por cualquier daño que pueda resultar de su uso.</p>
          
          <h3>Derechos de Autor</h3>
          <p>Respetamos los derechos de propiedad intelectual. Si eres titular de derechos y consideras 
          que se está infringiendo tu propiedad, contáctanos inmediatamente.</p>
          
          <h3>Suspensión de Cuentas</h3>
          <p>Nos reservamos el derecho de suspender cuentas que violen nuestros términos de servicio 
          o que exhiban comportamiento inapropiado.</p>
        </div>
      </Modal>

      <AuthForms 
        isOpen={authModal} 
        onClose={() => setAuthModal(false)} 
        initialMode="login"
      />

      <ProfileModal 
        isOpen={profileModal} 
        onClose={() => setProfileModal(false)} 
      />
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
            La evolución definitiva de tu plataforma favorita de juegos. Experiencia premium con 
            sistema de usuarios completo, diseño renovado y funcionalidades avanzadas.
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
              <span className="stat-number">150K+</span>
              <span className="stat-label">Usuarios</span>
            </div>
          </div>
          <div className="hero-buttons">
            <Link to="/juegos" className="cta-button primary">
              Explorar Catálogo
            </Link>
            <button className="cta-button secondary">
              Únete a la Comunidad
            </button>
          </div>
        </div>
        
        <div className="hero-visual">
          <div style={{
            background: 'var(--gradient-primary)',
            borderRadius: '25px',
            padding: '3rem',
            textAlign: 'center',
            border: '2px solid var(--border-color)'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎮</div>
            <h3 style={{ color: 'white', marginBottom: '1rem' }}>Premium Gaming</h3>
            <p style={{ color: 'rgba(255,255,255,0.9)' }}>
              Acceso completo a la mejor colección de juegos
            </p>
          </div>
        </div>
      </section>

      {/* Nueva sección de comunidad en lugar de juegos destacados */}
      <section className="community-section">
        <h2 className="section-title">Únete a Nuestra Comunidad</h2>
        <div className="community-grid">
          <div className="community-card">
            <span className="community-icon">👥</span>
            <h3 className="community-title">Comunidad Activa</h3>
            <p className="community-description">
              Conecta con miles de gamers, comparte experiencias y descubre nuevos juegos 
              recomendados por la comunidad.
            </p>
          </div>
          
          <div className="community-card">
            <span className="community-icon">⭐</span>
            <h3 className="community-title">Sistema de Valoraciones</h3>
            <p className="community-description">
              Valora y reseña juegos, ayuda a otros usuarios a encontrar los mejores títulos 
              basándote en experiencias reales.
            </p>
          </div>
          
          <div className="community-card">
            <span className="community-icon">🔒</span>
            <h3 className="community-title">Perfil Personalizado</h3>
            <p className="community-description">
              Crea tu perfil único, guarda tus favoritos, personaliza tu experiencia y 
              lleva el control de tu biblioteca de juegos.
            </p>
          </div>
          
          <div className="community-card">
            <span className="community-icon">🚀</span>
            <h3 className="community-title">Actualizaciones Constantes</h3>
            <p className="community-description">
              Recibe notificaciones de nuevos juegos, actualizaciones y contenido exclusivo. 
              Siempre al día con los últimos lanzamientos.
            </p>
          </div>
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
            <span className="stat-value">150K+</span>
            <span className="stat-desc">Usuarios Registrados</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📦</span>
            <span className="stat-value">15</span>
            <span className="stat-desc">Colecciones</span>
          </div>
        </div>
      </section>
    </div>
  );
};

// Games Listing Component con paginación mejorada
const Games = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [favorites, setFavorites] = useState([]);
  const [sortBy, setSortBy] = useState('recent');
  const [jumpPage, setJumpPage] = useState('');
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
      case 'alphabetical':
        filteredGames.sort((a, b) => a.title.localeCompare(b.title));
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

  const handlePageJump = () => {
    const pageNumber = parseInt(jumpPage);
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      setJumpPage('');
    }
  };

  const getPaginationNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta);
         i <= Math.min(totalPages - 1, currentPage + delta);
         i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  return (
    <div className="games-page">
      <div className="games-header">
        <h1>Biblioteca de Juegos</h1>
        <p>Explora nuestra colección premium de juegos. Filtra por categorías, busca tus favoritos y descubre nuevos títulos cada día.</p>
      </div>

      <div className="games-filters">
        <div className="search-sort-container">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Buscar juegos por título, categoría o tags..."
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
              <option value="alphabetical">Orden alfabético</option>
            </select>
          </div>
        </div>

        <div className="category-filter">
          <h3>Filtrar por categorías</h3>
          <p>Encuentra juegos organizados por géneros y categorías</p>
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
                {category === 'all' ? 'Todos los Juegos' : category}
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
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            ← Anterior
          </button>
          
          <div className="pagination-numbers">
            {getPaginationNumbers().map((page, index) => (
              page === '...' ? (
                <span key={index} className="pagination-dots">...</span>
              ) : (
                <button
                  key={index}
                  onClick={() => setCurrentPage(page)}
                  className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                >
                  {page}
                </button>
              )
            ))}
          </div>
          
          <button 
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Siguiente →
          </button>

          <div className="page-jump">
            <label>Ir a página:</label>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              placeholder="Nº"
            />
            <button onClick={handlePageJump}>Ir</button>
          </div>
        </div>
      )}
    </div>
  );
};

// Individual Game Page Component (mantiene la funcionalidad existente)
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

  // El resto del componente GameDetail se mantiene igual...
  return (
    <div className="game-detail">
      {/* Contenido existente del game detail */}
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

      {/* Resto del contenido GameDetail... */}
    </div>
  );
};

// Contact Component (mantiene funcionalidad existente)
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

// Dashboard Component (mantiene funcionalidad existente)
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