import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
import { useEffect } from "react";
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
    return (
        <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg z-[9999] text-xs shadow-xl border border-white/20">
            <h3 className="font-bold mb-2 border-b border-white/20 pb-1">Debug Info</h3>
            <div className="space-y-1 font-mono">
                <p><span className="text-gray-400">User:</span> {user?.email || 'Aucun'}</p>
                <p><span className="text-gray-400">Role:</span> <span className={profile?.role === 'admin' ? 'text-green-400 font-bold' : 'text-red-400'}>{profile?.role || 'Aucun'}</span></p>
                <p><span className="text-gray-400">Loading:</span> {loading ? 'Oui' : 'Non'}</p>
                <p><span className="text-gray-400">Project:</span> {import.meta.env.VITE_SUPABASE_URL?.substr(8, 20)}...</p>
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
                    <DebugConsole />
                    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                        <DebugOverlay />
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
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { UserPlus, Settings, Shield, ShieldAlert, Check, X, Loader2 } from "lucide-react";

const AVAILABLE_FEATURES = [
    { id: "dashboard", label: "Tableau de bord" },
    { id: "crm", label: "CRM Clients" },
    { id: "whatsapp", label: "WhatsApp" },
    { id: "rdv", label: "Rendez-vous" },
    { id: "devis", label: "Devis" },
    { id: "factures", label: "Factures" },
    { id: "avis", label: "Avis Clients" },
    { id: "ia", label: "Visualisation IA" },
    { id: "allovoisin", label: "Opportunités" },
    { id: "prospection", label: "Prospection" },
    { id: "facebook", label: "Auto-Post FB" },
    { id: "fichiers", label: "Fichiers" },
    { id: "parametres", label: "Paramètres" },
];

export function UserManagement() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        role: "user",
        enabled_features: ["dashboard", "devis", "factures", "clients", "rdv"],
        n8n_config: {} as Record<string, string>
    });

    const { data: users = [], refetch } = useQuery({
        queryKey: ["users-profiles"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    const handleCreateUser = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-user', {
                body: formData
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast.success("Utilisateur créé avec succès !");
            setIsCreateDialogOpen(false);
            refetch();
            resetForm();
        } catch (error: any) {
            console.error("Error creating user:", error);
            toast.error("Erreur lors de la création : " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateUser = async () => {
        if (!selectedUser) return;
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    role: formData.role,
                    enabled_features: formData.enabled_features,
                    n8n_config: formData.n8n_config
                })
                .eq("id", selectedUser.id);

            if (error) throw error;

            toast.success("Utilisateur mis à jour !");
            setIsEditDialogOpen(false);
            refetch();
        } catch (error: any) {
            console.error("Error updating user:", error);
            toast.error("Erreur lors de la mise à jour : " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            email: "",
            password: "",
            role: "user",
            enabled_features: ["dashboard", "devis", "factures", "clients", "rdv"],
            n8n_config: {}
        });
    };

    const openEdit = (user: any) => {
        setSelectedUser(user);
        setFormData({
            email: user.email,
            password: "", // Password cannot be viewed
            role: user.role || "user",
            enabled_features: user.enabled_features || [],
            n8n_config: user.n8n_config || {}
        });
        setIsEditDialogOpen(true);
    };

    const toggleFeature = (featureId: string) => {
        setFormData(prev => {
            const features = prev.enabled_features.includes(featureId)
                ? prev.enabled_features.filter(f => f !== featureId)
                : [...prev.enabled_features, featureId];
            return { ...prev, enabled_features: features };
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-foreground">Gestion des Utilisateurs</h2>
                    <p className="text-muted-foreground">Créez des comptes et gérez les permissions de chaque utilisateur.</p>
                </div>
                <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
                    <UserPlus className="w-4 h-4 mr-2" /> Ajouter un utilisateur
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {users.map((user: any) => (
                    <Card key={user.id} className="relative overflow-hidden group hover:shadow-lg transition-all">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="mb-2">
                                        {user.role === 'admin' ? <ShieldAlert className="w-3 h-3 mr-1" /> : <Shield className="w-3 h-3 mr-1" />}
                                        {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                                    </Badge>
                                    <CardTitle className="text-lg">{user.email}</CardTitle>
                                    <CardDescription className="text-xs">ID: {user.id.slice(0, 8)}...</CardDescription>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Modules activés :</p>
                                <div className="flex flex-wrap gap-1">
                                    {(user.enabled_features || []).slice(0, 5).map((f: string) => (
                                        <Badge key={f} variant="outline" className="text-[10px]">{AVAILABLE_FEATURES.find(af => af.id === f)?.label || f}</Badge>
                                    ))}
                                    {(user.enabled_features || []).length > 5 && (
                                        <Badge variant="outline" className="text-[10px]">+{user.enabled_features.length - 5} autres</Badge>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* CREATE USER DIALOG */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Ajouter un utilisateur</DialogTitle>
                        <DialogDescription>Créez un nouveau compte avec des permissions spécifiques.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Mot de passe</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Rôle</Label>
                            <div className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="role-user"
                                        checked={formData.role === 'user'}
                                        onCheckedChange={() => setFormData({ ...formData, role: 'user' })}
                                    />
                                    <Label htmlFor="role-user">Utilisateur Standard</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="role-admin"
                                        checked={formData.role === 'admin'}
                                        onCheckedChange={() => setFormData({ ...formData, role: 'admin' })}
                                    />
                                    <Label htmlFor="role-admin">Administrateur</Label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label>Modules autorisés</Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border p-4 rounded-lg">
                                {AVAILABLE_FEATURES.map(feature => (
                                    <div key={feature.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`create-${feature.id}`}
                                            checked={formData.enabled_features.includes(feature.id)}
                                            onCheckedChange={() => toggleFeature(feature.id)}
                                        />
                                        <Label htmlFor={`create-${feature.id}`} className="text-sm cursor-pointer">
                                            {feature.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 border-t pt-4">
                            <Label className="text-primary font-semibold">Webhooks spécifiques (Optionnel)</Label>
                            <p className="text-xs text-muted-foreground mb-2">Si vide, les webhooks globaux de l'entreprise seront utilisés.</p>

                            <div className="grid gap-2">
                                <div className="grid grid-cols-3 items-center gap-2">
                                    <Label className="text-xs">Devis</Label>
                                    <Input
                                        className="col-span-2 h-8 text-xs"
                                        placeholder="/generer-devis-commercial-1"
                                        value={formData.n8n_config?.devis_webhook || ''}
                                        onChange={(e) => setFormData({ ...formData, n8n_config: { ...formData.n8n_config, devis_webhook: e.target.value } })}
                                    />
                                </div>
                                <div className="grid grid-cols-3 items-center gap-2">
                                    <Label className="text-xs">Facture</Label>
                                    <Input
                                        className="col-span-2 h-8 text-xs"
                                        placeholder="/facture-commercial-1"
                                        value={formData.n8n_config?.facture_webhook || ''}
                                        onChange={(e) => setFormData({ ...formData, n8n_config: { ...formData.n8n_config, facture_webhook: e.target.value } })}
                                    />
                                </div>
                            </div>
                        </div>

                        <Button onClick={handleCreateUser} disabled={isLoading} className="w-full">
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Créer le compte
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* EDIT USER DIALOG */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Modifier l'utilisateur</DialogTitle>
                        <DialogDescription>Modifiez les permissions de {selectedUser?.email}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label>Rôle</Label>
                            <div className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="edit-role-user"
                                        checked={formData.role === 'user'}
                                        onCheckedChange={() => setFormData({ ...formData, role: 'user' })}
                                    />
                                    <Label htmlFor="edit-role-user">Utilisateur Standard</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="edit-role-admin"
                                        checked={formData.role === 'admin'}
                                        onCheckedChange={() => setFormData({ ...formData, role: 'admin' })}
                                    />
                                    <Label htmlFor="edit-role-admin">Administrateur</Label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label>Modules autorisés</Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border p-4 rounded-lg">
                                {AVAILABLE_FEATURES.map(feature => (
                                    <div key={`edit-${feature.id}`} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`edit-${feature.id}`}
                                            checked={formData.enabled_features.includes(feature.id)}
                                            onCheckedChange={() => toggleFeature(feature.id)}
                                        />
                                        <Label htmlFor={`edit-${feature.id}`} className="text-sm cursor-pointer">
                                            {feature.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 border-t pt-4">
                            <Label className="text-primary font-semibold">Webhooks spécifiques</Label>
                            <div className="grid gap-2">
                                <div className="grid grid-cols-3 items-center gap-2">
                                    <Label className="text-xs">Devis</Label>
                                    <Input
                                        className="col-span-2 h-8 text-xs"
                                        value={formData.n8n_config?.devis_webhook || ''}
                                        onChange={(e) => setFormData({ ...formData, n8n_config: { ...formData.n8n_config, devis_webhook: e.target.value } })}
                                    />
                                </div>
                                <div className="grid grid-cols-3 items-center gap-2">
                                    <Label className="text-xs">Facture</Label>
                                    <Input
                                        className="col-span-2 h-8 text-xs"
                                        value={formData.n8n_config?.facture_webhook || ''}
                                        onChange={(e) => setFormData({ ...formData, n8n_config: { ...formData.n8n_config, facture_webhook: e.target.value } })}
                                    />
                                </div>
                            </div>
                        </div>

                        <Button onClick={handleUpdateUser} disabled={isLoading} className="w-full">
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Enregistrer les modifications
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

interface Profile {
    id: string;
    email: string;
    role: "admin" | "user";
    enabled_features: string[];
    n8n_config: Record<string, string>;
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
    refreshProfile: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .maybeSingle();

            if (error) {
                console.error("Error fetching profile:", error);
            }

            if (data) {
                setProfile(data as Profile);
            }
        } catch (error) {
            console.error("Unexpected error fetching profile:", error);
        }
    };

    useEffect(() => {
        // Init session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            }
            setLoading(false);
        });

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    };

    const value = {
        session,
        user,
        profile,
        loading,
        signOut,
        refreshProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "<https://esm.sh/@supabase/supabase-js@2>";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        console.log(`[Create-User] Request received: ${req.method} ${req.url}`);

        // Verify the caller is an admin
        const authHeader = req.headers.get('Authorization');
        console.log(`[Create-User] Auth header present: ${!!authHeader}`);

        if (!authHeader) {
            throw new Error('Missing authorization header');
        }

        // Create a client with the caller's JWT to check their role
        const callerClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
        if (callerError || !caller) {
            console.error("[Create-User] Auth validation failed:", callerError);
            throw new Error('Invalid authentication token');
        }

        console.log(`[Create-User] Caller authenticated: ${caller.id}`);

        // Check if caller is admin
        const { data: callerProfile } = await callerClient
            .from('profiles')
            .select('role')
            .eq('id', caller.id)
            .single();

        console.log(`[Create-User] Caller role: ${callerProfile?.role}`);

        if (callerProfile?.role !== 'admin') {
            throw new Error('Only admins can create users');
        }

        // Use service role key for admin operations
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { email, password, role, enabled_features, n8n_config } = await req.json();

        // 1. Create user in auth.users
        const { data: user, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (createUserError) throw createUserError;

        // 2. Update profile with specific settings
        // The trigger on_auth_user_created will have already inserted a default profile
        const { error: updateProfileError } = await supabaseAdmin
            .from('profiles')
            .update({
                role: role || 'user',
                enabled_features: enabled_features || ["dashboard", "devis", "factures", "clients", "rdv"],
                n8n_config: n8n_config || {}
            })
            .eq('id', user.user.id);

        if (updateProfileError) throw updateProfileError;

        return new Response(
            JSON.stringify({ user: user.user, message: 'User created successfully' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );
    } catch (error: any) {
        console.error("[Create-User] Error:", error.message);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
});
