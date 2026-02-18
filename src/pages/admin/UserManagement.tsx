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
