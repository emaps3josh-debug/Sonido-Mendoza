import React from 'react';
import ReactDOM from 'react-dom/client';
import Pedir from './pages/Pedir.jsx';
import Admin from './pages/Admin.jsx';
import './styles.css';

// Solo hay dos páginas: /admin para el DJ y todo lo demás es /pedir
const Pagina = window.location.pathname.startsWith('/admin') ? Admin : Pedir;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Pagina />
  </React.StrictMode>
);
