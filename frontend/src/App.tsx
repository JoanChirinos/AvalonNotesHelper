import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./ThemeContext";
import Home from "./components/Home";
import Avalon from "./components/Avalon";
import AvalonGame from "./components/AvalonGame";
import AvalonGameSetup from "./components/AvalonGameSetup";
import "./App.css";
import AvalonGameRouter from "./components/AvalonGameRouter";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/avalon" element={<Avalon />} />
          <Route path="/avalon/game/:game_id" element={<AvalonGameRouter />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
