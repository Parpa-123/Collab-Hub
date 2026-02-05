import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import { UserContextProvider } from "./Context/userContext";
import ProtectedRouting from "./Context/ProtectedRouting";
import UserProfile from "./components/Profile Components/UserProfile";
import Repo from "./components/Repo";
import MainLayout from "./components/RepoUI Component/MainLayout";
import Code from "./components/RepoUI Component/Code";
import Branches from "./components/RepoUI Component/Branches";
import PullRequest from "./components/RepoUI Component/PullRequest";
import Issues from "./components/RepoUI Component/Issues";

function App() {

  return (
    <Router>
      <UserContextProvider>
        <Routes>
          <Route path="/" element={<Header />}>
            <Route index element={<h1>Home</h1>} />
            <Route path="profile" element={<ProtectedRouting><UserProfile /></ProtectedRouting>} />
            <Route path="new" element={<ProtectedRouting><Repo /></ProtectedRouting>} />
            <Route path=":slug" element={<ProtectedRouting><MainLayout /></ProtectedRouting>}>
              <Route index element={<ProtectedRouting><Code /></ProtectedRouting>} />
              <Route path="branches" element={<ProtectedRouting><Branches /></ProtectedRouting>} />
              <Route path="pullrequests" element={<ProtectedRouting><PullRequest /></ProtectedRouting>} />
              <Route path="issues" element={<ProtectedRouting><Issues /></ProtectedRouting>} />
            </Route>
          </Route>
        </Routes>
      </UserContextProvider>
    </Router>
  )
}

export default App
