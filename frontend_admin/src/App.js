import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SideMenu from "./pages/SideMenu";
import Dashboard from "./pages/Dashboard";
import AddClient from "./pages/Add_clients";
import ClientList from "./pages/ClientList";
import AddButtonsToExisting from "./pages/AddButtonsToExisting";
import EditClient from "./pages/EditClient";
import "./App.css"; // N'oublie pas d'importer le CSS pour le layout flex

function App() {
  return (
    <Router>
      <div className="app-layout">
        {/* Le SideMenu restera affiché à gauche sur toutes les pages */}
        <SideMenu />
        
        {/* La zone principale qui change selon la route */}
        <main className="content-area">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<ClientList />} />
            <Route path="/add-client" element={<AddClient />} />
            <Route path="/add-buttons" element={<AddButtonsToExisting />} />
            <Route path="/edit-client/:id" element={<EditClient />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;