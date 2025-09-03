import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import Avalon from "./components/Avalon";
import AvalonGame from "./components/AvalonGame";
import AvalonGameSetup from "./components/AvalonGameSetup";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/avalon" element={<Avalon />} />
        <Route path="/avalon/game/:game_id" element={<AvalonGameSetup />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
