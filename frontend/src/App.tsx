import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import { UserContextProvider } from "./Context/userContext";
import { ToastProvider } from "./Context/ToastProvider";
import { ThemeProvider } from "./Context/ThemeContext";
import ProtectedRouting from "./Context/ProtectedRouting";
import Profile from "./components/Profile";
import Repo from "./components/Repo";
import Dashboard from "./components/Dashboard";
import MainLayout from "./components/RepoUI Component/MainLayout";
import Code from "./components/RepoUI Component/Code";
import Branches from "./components/RepoUI Component/Branches";
import PullRequest from "./components/RepoUI Component/PullRequest";
import Issues from "./components/RepoUI Component/Issues";
import IssueDetail from "./components/RepoUI Component/IssueDetail";
import NotFound from "./404 section/404";
import PRDetailed from "./components/RepoUI Component/PRDetailed";
import FileViewer from "./components/RepoUI Component/FileViewer";
import OAuthCallback from "./components/OAuthCallback";
import Repositories from "./components/Repositories";

function App() {

  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <UserContextProvider>
            <Routes>
              <Route path="/" element={<Header />}>
                <Route index element={<Dashboard />} />
                <Route path="auth/callback" element={<OAuthCallback />} />
                <Route path="profile" element={<ProtectedRouting><Profile /></ProtectedRouting>} />
                <Route path="repositories" element={<ProtectedRouting><Repositories /></ProtectedRouting>} />
                <Route path="new" element={<ProtectedRouting><Repo /></ProtectedRouting>} />
                <Route path=":slug" element={<ProtectedRouting><MainLayout /></ProtectedRouting>}>
                  <Route index element={<ProtectedRouting><Code /></ProtectedRouting>} />
                  <Route path="branches" element={<ProtectedRouting><Branches /></ProtectedRouting>} />
                  <Route path="pullrequests" element={<ProtectedRouting><PullRequest /></ProtectedRouting>} />
                  <Route path="pullrequests/:id" element={<ProtectedRouting><PRDetailed /></ProtectedRouting>} />
                  <Route path="issues" element={<ProtectedRouting><Issues /></ProtectedRouting>} />
                  <Route path="issues/:id" element={<ProtectedRouting><IssueDetail /></ProtectedRouting>} />
                  <Route path="blob" element={<ProtectedRouting><FileViewer /></ProtectedRouting>} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </UserContextProvider>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
