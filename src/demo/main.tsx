import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import '../styles/base.css';
import '../styles/theme-brown.css';
import '../styles/pieces-staunty.css';
import '../styles/pieces-cburnett.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
