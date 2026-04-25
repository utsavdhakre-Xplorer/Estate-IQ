// Node.js polyfills for Webpack 5 (keeps existing CRA/CRACO compatibility)
import { Buffer } from "buffer";
import stream from "stream-browserify";
import process from "process";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

window.Buffer = window.Buffer || Buffer;
window.stream = window.stream || stream;
window.process = window.process || process;
window.global = window;

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

