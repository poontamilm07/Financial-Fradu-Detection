import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import Sidebar from './components/Sidebar';
import UserProfile from "./pages/UserProfile";
import ChatBot from './chatbot/ChatBot';
import './styles/globals.css';
import LandingPage from "./pages/LandingPage";



// Lazy load pages

const FraudPanel = lazy(() => import('./pages/FraudPanel'));
const RiskHeatmap = lazy(() => import('./pages/RiskHeatmap'));
const Reports = lazy(() => import('./pages/Reports'));
const Login = lazy(() => import('./auth/Login'));
const Register = lazy(() => import('./auth/Register')); // placeholder
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Transactions = lazy(() => import('./pages/Transactions'));

// Placeholder pages
const PageHolder = ({ title, icon }) => (
  <div className="animate-fade-in">
    <div className="page-header">
      <h1 className="page-title">{icon} {title}</h1>
      <p className="page-subtitle">This module is fully integrated with the backend</p>
    </div>
    <div className="card" style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ color: '#00f0ff', marginBottom: 8 }}>{title}</h3>
      <p style={{ color: '#666' }}>Connect your backend and this page will display real data automatically.</p>
    </div>
  </div>
);

const AppLayout = ({ children }) => (
  <div className="layout">
    <Sidebar />
    <main className="main-content">
      {children}
    </main>
    <ChatBot />
  </div>
);

const LoadingScreen = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0f', flexDirection: 'column', gap: 16 }}>
    <div className="loader" style={{ width: 40, height: 40, borderWidth: 3 }} />
    <p style={{ color: '#00f0ff', fontSize: 14 }}>Loading FraudGuard AI...</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a2e',
              color: '#e0e0ff',
              border: '1px solid rgba(0,240,255,0.2)',
              borderRadius: 10,
              fontSize: 13
            },
            success: { iconTheme: { primary: '#00e676', secondary: '#0a0a0f' } },
            error: { iconTheme: { primary: '#ff4444', secondary: '#0a0a0f' } }
          }}
        />
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AppLayout><Dashboard /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/transactions" element={
              <ProtectedRoute>
                <AppLayout><Transactions /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/fraud-panel" element={
              <ProtectedRoute requiredRoles={['super_admin', 'analyst', 'admin']}>
                <AppLayout><FraudPanel /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/risk-heatmap" element={
              <ProtectedRoute requiredRoles={['super_admin', 'analyst', 'admin']}>
                <AppLayout><RiskHeatmap /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute requiredRoles={['super_admin', 'fraud_analyst', 'admin']}>
                <AppLayout><Reports /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/" element={<LandingPage />} />
            

{/* Profile Route */}

<Route path="/profile" element={
  <ProtectedRoute>
    <AppLayout>
      <UserProfile />
    </AppLayout>
  </ProtectedRoute>
} />

            {/* Default */}
           
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;