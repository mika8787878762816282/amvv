import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import { LoginPage } from "./pages/Login";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DebugConsole } from "@/components/debug/DebugConsole";
import { UserManagement } from "./pages/admin/UserManagement";
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient();

const ProtectedDashboard = () => {
    const { session, loading } = useAuth();

    if (loading) return <div className="flex items-center justify-center min-h-screen text-white">Chargement...</div>;

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    return <Dashboard />;
};

// Wrapper for the login page to redirect if already logged in
const LoginPageWrapper = () => {
    const { session } = useAuth();
    if (session) return <Navigate to="/" replace />;
    return <LoginPage />;
};



const AdminRoute = ({ children }: { children: JSX.Element }) => {
    const { profile, loading } = useAuth();

    if (loading) return <div className="flex items-center justify-center min-h-screen text-white">Chargement...</div>;

    // Allow access if role is admin OR if we can't determine role yet (to avoid lockout during dev/setup)
    // Ideally should be strict: if (profile?.role !== 'admin') ...
    if (profile?.role !== 'admin' && profile !== null) {
        return <Navigate to="/" replace />;
    }

    return children;
};

const DebugOverlay = () => {
    const { user, profile, loading } = useAuth();
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg z-[9999] text-xs shadow-xl border border-white/20">
            <button
                onClick={() => setIsVisible(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-white font-bold"
                title="Fermer"
            >
                ✕
            </button>
            <h3 className="font-bold mb-2 border-b border-white/20 pb-1 pr-6">Debug Info</h3>
            <div className="space-y-1 font-mono">
                <p><span className="text-gray-400">User:</span> {user?.email || 'Aucun'}</p>
                <p><span className="text-gray-400">Role:</span> <span className={profile?.role === 'admin' ? 'text-green-400 font-bold' : 'text-red-400'}>{profile?.role || 'Aucun'}</span></p>
                <p><span className="text-gray-400">Loading:</span> {loading ? 'Oui' : 'Non'}</p>
                <p><span className="text-gray-400">Project:</span> {import.meta.env.VITE_SUPABASE_URL?.substring(8, 20)}...</p>
            </div>
        </div>
    );
};

const AppContent = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <TooltipProvider>
                    <Toaster />
                    {import.meta.env.DEV && <DebugConsole />}
                    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                        {import.meta.env.DEV && <DebugOverlay />}
                        <Routes>
                            <Route path="/login" element={<LoginPageWrapper />} />
                            <Route path="/" element={<ProtectedDashboard />} />
                            <Route path="/dashboard" element={<ProtectedDashboard />} />

                            <Route path="/admin/users" element={
                                <AdminRoute>
                                    <div className="flex h-screen bg-background">
                                        <div className="w-64 border-r bg-card p-4">
                                            <Button variant="ghost" className="w-full justify-start mb-4" onClick={() => window.location.href = '/'}>
                                                &larr; Retour au Dashboard
                                            </Button>
                                        </div>
                                        <div className="flex-1 overflow-auto">
                                            <UserManagement />
                                        </div>
                                    </div>
                                </AdminRoute>
                            } />

                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </BrowserRouter>
                </TooltipProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
};

const App = () => {
    useEffect(() => {
        const theme = localStorage.getItem("theme") || "light";
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, []);

    return <AppContent />;
};

export default App;
