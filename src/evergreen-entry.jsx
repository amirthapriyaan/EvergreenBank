import React from 'react';
import { createRoot } from 'react-dom/client';
import EvergreenApp from './evergreen/App.jsx';
import './evergreen/app.css';
createRoot(document.getElementById('root')).render(<React.StrictMode><EvergreenApp /></React.StrictMode>);
