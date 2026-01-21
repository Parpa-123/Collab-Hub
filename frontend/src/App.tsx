import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import { UserContextProvider } from "./Context/userContext";
import ProtectedRouting from "./Context/ProtectedRouting";
function App() {

  return (
    <Router>
      <UserContextProvider>
        <Routes>
          <Route path="/" element={<Header />}>
            <Route index element={<h1>Home</h1>} />
            <Route path="about" element={<h1>About</h1>} />
            <Route path="me" element={<ProtectedRouting><h1>Protected</h1></ProtectedRouting>} /> 
          </Route>
        </Routes>
      </UserContextProvider>
    </Router>
  )
}

export default App
