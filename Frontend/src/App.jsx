import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Publications from "./pages/Publications";
import Projects from "./pages/Projects";
import Conferences from "./pages/Conferences";
import Collaborations from "./pages/Collaborations";
import Citations from "./pages/Citations";
import Reports from "./pages/Reports";
import Audit from "./pages/Audit";
import Institutions from "./pages/Institutions";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Discover from "./pages/Discover";
import NetworkGraph from "./pages/NetworkGraph";
import AIAssistant from "./pages/AIAssistant";

function App(){
  return(
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login/>}/>
        <Route path="/register" element={<Register/>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard/>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Login/>}/>
        <Route
            path="/discover"
            element={
              <ProtectedRoute>
                <Discover />
              </ProtectedRoute>
            }
          />
        <Route
            path="/network"
            element={
              <ProtectedRoute>
                <NetworkGraph />
              </ProtectedRoute>
            }
          />
        <Route
            path="/assistant"
            element={
              <ProtectedRoute>
                <AIAssistant />
              </ProtectedRoute>
            }
          />
        <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
        <Route
            path="/publications"
            element={
              <ProtectedRoute>
                <Publications />
              </ProtectedRoute>
            }
          />
        <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            }
          />
        <Route
            path="/conferences"
            element={
              <ProtectedRoute>
                <Conferences />
              </ProtectedRoute>
            }
          />
        <Route
            path="/collaborations"
            element={
              <ProtectedRoute>
                <Collaborations />
              </ProtectedRoute>
            }
          />
        <Route
            path="/citations"
            element={
              <ProtectedRoute>
                <Citations />
              </ProtectedRoute>
            }
          />
        <Route
            path="/institutions"
            element={
              <ProtectedRoute>
                <Institutions />
              </ProtectedRoute>
            }
          />
        <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
        <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
        <Route
            path="/audit"
            element={
              <ProtectedRoute>
                <Audit />
              </ProtectedRoute>
            }
          />
      </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
