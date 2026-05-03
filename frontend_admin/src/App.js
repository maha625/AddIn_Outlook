import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SideMenu from "./pages/SideMenu";
import Dashboard from "./pages/Dashboard";
import AddClient from "./pages/Add_clients";
import ClientList from "./pages/ClientList";
import EditClient from "./pages/EditClient";
import AddTypeEvenement from "./pages/Add_type_evenement";
import ListTypeEvenement from "./pages/list_type_evenement";
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
            <Route path="/edit-client/:id" element={<EditClient />} />
            <Route path="/add-type-evenement" element={<AddTypeEvenement />} />
            <Route path="/list-type-evenement" element={<ListTypeEvenement />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;