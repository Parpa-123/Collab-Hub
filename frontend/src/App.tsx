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
import Explore from "./components/Explore";
import Repositories from "./components/Repositories";
import useBackendKeepAlive from "./hooks/useBackendKeepAlive";

function App() {
  useBackendKeepAlive();

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
                <Route path="explore" element={<Explore />} />
                <Route path="new" element={<ProtectedRouting><Repo /></ProtectedRouting>} />
                <Route path=":slug" element={<MainLayout />}>
                  <Route index element={<Code />} />
                  <Route path="branches" element={<Branches />} />
                  <Route path="pullrequests" element={<PullRequest />} />
                  <Route path="pullrequests/:id" element={<PRDetailed />} />
                  <Route path="issues" element={<Issues />} />
                  <Route path="issues/:id" element={<IssueDetail />} />
                  <Route path="blob" element={<FileViewer />} />
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
