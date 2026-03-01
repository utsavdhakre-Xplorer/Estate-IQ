// Node.js Polyfills for Webpack 5
import { Buffer } from 'buffer';
import crypto from 'crypto-browserify';
import stream from 'stream-browserify';
import process from 'process';

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

window.Buffer = window.Buffer || Buffer;
window.stream = window.stream || stream;
window.process = window.process || process;
window.global = window;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
