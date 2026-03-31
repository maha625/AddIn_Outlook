import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import AddClient from "./pages/Add_clients";
import ClientList from "./pages/ClientList";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/add-client" element={<AddClient />} />
        <Route path="/clients" element={<ClientList />} />
      </Routes>
    </Router>
  );
}
export default App;