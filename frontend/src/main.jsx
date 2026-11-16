import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AppProvider } from "./state/AppContext";
import { ConvexServices } from "./state/ConvexServices";
import "./styles.css";
import "./styles/dashboard.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConvexServices><AppProvider>
        <App />
      </AppProvider></ConvexServices>
    </BrowserRouter>
  </React.StrictMode>
);

import './styles/reference-theme.css';

import './styles/chat-messenger.css';
