import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Loader2, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function Settings() {
    const [isLoading, setIsLoading] = useState(false);
    const [companyName, setCompanyName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [siret, setSiret] = useState("");
    const [tvaNumber, setTvaNumber] = useState("");
    const [n8nUrl, setN8nUrl] = useState("");

    // Workflow paths
    const [paths, setPaths] = useState({
        devis_webhook: "/generer-devis",
        facture_webhook: "/devis-to-facture",
        avis_webhook: "/demande-avis-client",
        ia_webhook: "/visualisation-ia",
        allovoisin_webhook: "/allovoisin-leads",
        facebook_webhook: "/facebook-prospects"
    });

    // Fetch existing settings
    const { data: settings, refetch } = useQuery({
        queryKey: ["company-settings"],
        queryFn: async () => {
            const { data, error } = await (supabase
                .from("company_settings")
                .select("*")
                .limit(1)
                .maybeSingle() as any);
            if (error) throw error;
            return data;
        },
    });

    // Populate form when data loads
    useEffect(() => {
        if (settings) {
            setCompanyName((settings as any).company_name || "");
            setEmail((settings as any).email || "");
            setPhone((settings as any).phone || "");
            setAddress((settings as any).address || "");
            setSiret((settings as any).siret || "");
            setTvaNumber((settings as any).tva_number || "");

            const config = (settings as any).n8n_config as any;
            setN8nUrl(config?.webhook_base || "");

            if (config) {
                setPaths({
                    devis_webhook: config.devis_webhook || "/generer-devis",
                    facture_webhook: config.facture_webhook || "/devis-to-facture",
                    avis_webhook: config.avis_webhook || "/demande-avis-client",
                    ia_webhook: config.ia_webhook || "/visualisation-ia",
                    allovoisin_webhook: config.allovoisin_webhook || "/allovoisin-leads",
                    facebook_webhook: config.facebook_webhook || "/facebook-prospects"
                });
            }
        }
    }, [settings]);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const updates = {
                company_name: companyName,
                email,
                phone,
                address,
                siret,
                tva_number: tvaNumber,
                n8n_config: {
                    webhook_base: n8nUrl,
                    ...paths
                }
            };

            if ((settings as any)?.id) {
                const { error } = await (supabase.from("company_settings") as any)
                    .update(updates)
                    .eq("id", (settings as any).id);
                if (error) throw error;
            } else {
                const { error } = await (supabase.from("company_settings") as any)
                    .insert(updates);
                if (error) throw error;
            }

            toast.success("Paramètres enregistrés avec succès !");
            refetch();
        } catch (error: any) {
            console.error("Error saving settings:", error);
            toast.error("Erreur lors de l'enregistrement : " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const updatePath = (key: keyof typeof paths, value: string) => {
        setPaths(prev => ({ ...prev, [key]: value }));
    };

    const { profile } = useAuth();

    return (
        <div className="space-y-6 animate-in fade-in">
            <h2 className="text-3xl font-bold text-foreground">Paramètres Entreprise</h2>

            {profile?.role === 'admin' && (
                <Card className="border-blue-500 bg-blue-500/5">
                    <CardHeader>
                        <CardTitle className="flex items-center text-blue-600">
                            <Shield className="w-5 h-5 mr-2" />
                            Administration
                        </CardTitle>
                        <CardDescription>
                            Gérez les utilisateurs, leurs rôles et leurs permissions d'accès aux différents modules.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => window.location.href = '/admin/users'}>
                            Gérer les utilisateurs
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6">
                {/* Company Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Informations Générales</CardTitle>
                        <CardDescription>Ces informations apparaîtront sur vos devis et factures.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="companyName">Nom de l'entreprise</Label>
                                <Input
                                    id="companyName"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email de contact</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Téléphone</Label>
                                <Input
                                    id="phone"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="siret">Numéro SIRET</Label>
                                <Input
                                    id="siret"
                                    value={siret}
                                    onChange={(e) => setSiret(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Adresse complète</Label>
                            <Input
                                id="address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tva">Numéro TVA Intracommunautaire</Label>
                            <Input
                                id="tva"
                                value={tvaNumber}
                                onChange={(e) => setTvaNumber(e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Integrations Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Intégrations & Automatisations (N8N)</CardTitle>
                        <CardDescription>Configurez ici l'URL de base et les chemins spécifiques pour vos automatisations N8N.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2 border-b pb-4">
                            <Label htmlFor="n8nUrl" className="text-primary font-bold">URL de base du Webhook N8N</Label>
                            <Input
                                id="n8nUrl"
                                placeholder="https://votre-instance-n8n.com/webhook"
                                value={n8nUrl}
                                onChange={(e) => setN8nUrl(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="devis_webhook">Webhook Devis</Label>
                                <Input
                                    id="devis_webhook"
                                    value={paths.devis_webhook}
                                    onChange={(e) => updatePath("devis_webhook", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="facture_webhook">Webhook Facture</Label>
                                <Input
                                    id="facture_webhook"
                                    value={paths.facture_webhook}
                                    onChange={(e) => updatePath("facture_webhook", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="avis_webhook">Webhook Avis Clients</Label>
                                <Input
                                    id="avis_webhook"
                                    value={paths.avis_webhook}
                                    onChange={(e) => updatePath("avis_webhook", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ia_webhook">Webhook Visualisation IA</Label>
                                <Input
                                    id="ia_webhook"
                                    value={paths.ia_webhook}
                                    onChange={(e) => updatePath("ia_webhook", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="allovoisin_webhook">Webhook AlloVoisin</Label>
                                <Input
                                    id="allovoisin_webhook"
                                    value={paths.allovoisin_webhook}
                                    onChange={(e) => updatePath("allovoisin_webhook", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="facebook_webhook">Webhook Facebook</Label>
                                <Input
                                    id="facebook_webhook"
                                    value={paths.facebook_webhook}
                                    onChange={(e) => updatePath("facebook_webhook", e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={isLoading} size="lg">
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer les modifications
                    </Button>
                </div>
            </div>
        </div>
    );
}
