// src/components/SideMenu.js
import React from "react";
import { NavLink } from "react-router-dom";
import "./SideMenu.css";

function SideMenu() {
  return (
    <div className="sidemenu">
      <div className="sidemenu-logo">
        <i className="fas fa-envelope-open-text"></i>
        <span>Outlook Admin</span>
      </div>
      
      <nav className="sidemenu-nav">
        <NavLink to="/" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
          <i className="fas fa-th-large"></i>
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/add-client" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
          <i className="fas fa-user-plus"></i>
          <span>Ajouter un Client</span>
        </NavLink>

        <NavLink to="/clients" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
          <i className="fas fa-users"></i>
          <span>Liste des Clients</span>
        </NavLink>
        <NavLink to="/list-type-evenement" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
          <i className="fas fa-list"></i>
          <span>Liste des Types d'Événements</span>
        </NavLink>
        <NavLink to="/add-type-evenement" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
          <i className="fas fa-plus"></i>
          <span>Ajouter un Type d'Événement</span>
        </NavLink>

      </nav>

      <div className="sidemenu-footer">
        <small>v1.2.0 - ENSAM 2026</small>
      </div>
    </div>
  );
}

export default SideMenu;