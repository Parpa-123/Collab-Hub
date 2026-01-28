import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import { UserContextProvider } from "./Context/userContext";
import ProtectedRouting from "./Context/ProtectedRouting";
import UserProfile from "./components/Profile Components/UserProfile";
import Repo from "./components/Repo";

function App() {

  return (
    <Router>
      <UserContextProvider>
        <Routes>
          <Route path="/" element={<Header />}>
            <Route index element={<h1>Home</h1>} />
            <Route path="profile" element={<ProtectedRouting><UserProfile /></ProtectedRouting>} />
            <Route path="new" element={<ProtectedRouting><Repo /></ProtectedRouting>} />
          </Route>
        </Routes>
      </UserContextProvider>
    </Router>
  )
}

export default App
