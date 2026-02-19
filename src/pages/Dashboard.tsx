import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
    LayoutDashboard,
    MessageSquare,
    FileText,
    Receipt,
    Star,
    Sparkles,
    Mail,
    Search,
    FolderOpen,
    Settings as SettingsIcon,
    Hammer,
    Menu,
    X,
    Bot,
    Plus,
    Calendar as CalendarIcon,
    Users,

    Facebook,
    Linkedin,
    Send,
    LogOut,
} from "lucide-react";
import { CreateQuoteDialog } from "@/components/quotes/CreateQuoteDialog";
import { CreateInvoiceDialog } from "@/components/invoices/CreateInvoiceDialog";
import { ReviewsManager } from "@/components/reviews/ReviewsManager";
import { VisualisationAI } from "@/components/ai/VisualisationAI";
import { AlloVoisinLeads } from "@/components/leads/AlloVoisinLeads";
import { FacebookProspecting } from "@/components/leads/FacebookProspecting";
import { FileManager } from "@/components/files/FileManager";
import { Appointments } from "@/components/appointments/Appointments";
import { VoiceCommander } from "@/components/voice/VoiceCommander";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Settings } from "@/pages/Settings";
import { UserManagement } from "@/pages/admin/UserManagement";
import { ClientsCRM } from "@/components/crm/ClientsCRM";
import { FacebookAutoPost } from "@/components/facebook/FacebookAutoPost";
import { LinkedInAutoPilot } from "@/components/linkedin/LinkedInAutoPilot";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [whatsappInput, setWhatsappInput] = useState("");

    const { signOut, user, profile, loading } = useAuth();

    // Fetch company settings
    const { data: companySettings = { company_name: "AMG Rénovation", n8n_config: {} } } = useQuery({
        queryKey: ["company-settings"],
        queryFn: async () => {
            const { data } = await supabase.from("company_settings").select("*").maybeSingle();
            return data || { company_name: "AMG Rénovation", n8n_config: {} };
        },
    });

    // Fetch WhatsApp messages (from localStorage)
    const { data: messages = [], refetch: refetchMessages } = useQuery({
        queryKey: ["whatsapp-messages"],
        queryFn: async () => {
            const { data } = await supabase.from("whatsapp_messages").select("*").order("received_at", { ascending: true });
            return (data || []) as any[];
        },
        refetchInterval: 5000,
    });

    // Fetch quotes (from localStorage)
    const { data: quotes = [], refetch: refetchQuotes } = useQuery({
        queryKey: ["quotes"],
        queryFn: async () => {
            const { data } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
            return (data || []) as any[];
        },
    });

    // Fetch invoices (from localStorage)
    const { data: invoices = [], refetch: refetchInvoices } = useQuery({
        queryKey: ["invoices"],
        queryFn: async () => {
            const { data } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
            return (data || []) as any[];
        },
    });

    const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
    const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
    const [quoteToConvert, setQuoteToConvert] = useState<any>(null);
    const [leadInitialData, setLeadInitialData] = useState<any>(null);

    const handleConvertLeadToQuote = (lead: any) => {
        setLeadInitialData({
            client_name: lead.client_name,
            client_email: "",
            items: [{ description: `Travaux: ${lead.project_type}\nLieu: ${lead.city}`, quantity: 1, unit_price: lead.estimated_price_min || 0 }]
        });
        setIsQuoteDialogOpen(true);
    };

    const handleConvertToInvoice = (quote: any) => {
        const conversionData = {
            id: quote.id,
            quote_number: quote.quote_number,
            client_id: quote.client_id,
            client_name: quote.clients ? `${quote.clients.firstname} ${quote.clients.lastname}` : "Client Inconnu",
            client_email: quote.clients?.email,
            items: quote.items
        };
        setQuoteToConvert(conversionData);
        setIsInvoiceDialogOpen(true);
    };

    const handleSendDocument = async (doc: any, type: 'quote' | 'invoice') => {
        const n8nConfig = (companySettings as any)?.n8n_config as any;
        const n8nBase = n8nConfig?.webhook_base || (import.meta as any).env.VITE_N8N_WEBHOOK_BASE;

        // Use user-specific webhook if available, else fall back to company setting
        const userConfig = profile?.n8n_config as any;
        const defaultPath = type === 'quote' ? (n8nConfig?.devis_webhook || '/generer-devis') : (n8nConfig?.facture_webhook || '/devis-to-facture');
        const userPath = type === 'quote' ? userConfig?.devis_webhook : userConfig?.facture_webhook;

        const endpoint = userPath || defaultPath;
        const url = n8nBase ? n8nBase + endpoint : null;

        // Update status locally even without n8n
        const table = type === 'quote' ? 'quotes' : 'invoices';
        await (supabase.from(table) as any).update({ status: 'sent' }).eq('id', doc.id);

        if (url) {
            const toastId = toast.loading("Envoi en cours...");
            try {
                const payload = {
                    "Date": new Date().toLocaleDateString('fr-FR'),
                    "Nom": doc.clients?.lastname || "Inconnu",
                    "Prénom": doc.clients?.firstname || "Client",
                    "Email": doc.clients?.email,
                    "Prix HT": doc.total_ht,
                    "TVA": 20,
                    "Prix TTC": doc.total_ttc,
                    "Description": (doc.items || []).map((i: any) => `${i.description} (x${i.quantity})`).join('\n'),
                    ...(type === 'quote' ? { "Numéro de devis": doc.quote_number, "Validité": "30 jours" } : { "Numéro de facture": doc.invoice_number, "Numéro de devis": "N/A" })
                };
                await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                toast.success("Document envoyé avec succès !", { id: toastId });
            } catch {
                toast.warning("Statut mis à jour localement (N8N non joignable)", { id: toastId });
            }
        } else {
            toast.success("Statut mis à jour !");
        }

        if (type === 'quote') refetchQuotes();
        else refetchInvoices();
    };

    const handleSendWhatsApp = async () => {
        if (!whatsappInput.trim()) return;
        await supabase.from("whatsapp_messages").insert({
            sender: "assistant",
            phone_number: messages[0]?.phone_number || "+33 6 00 00 00 00",
            message_content: whatsappInput,
            received_at: new Date().toISOString(),
        });
        setWhatsappInput("");
        refetchMessages();
    };

    const allMenuItems = [
        { id: "dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
        { id: "crm", icon: Users, label: "CRM Clients" },
        { id: "whatsapp", icon: MessageSquare, label: "WhatsApp" },
        { id: "rdv", icon: CalendarIcon, label: "Rendez-vous" },
        { id: "devis", icon: FileText, label: "Devis" },
        { id: "factures", icon: Receipt, label: "Factures" },
        { id: "avis", icon: Star, label: "Avis Clients" },
        { id: "ia", icon: Sparkles, label: "Visualisation IA" },
        { id: "allovoisin", icon: Mail, label: "Opportunités" },
        { id: "prospection", icon: Search, label: "Prospection" },
        { id: "facebook", icon: Facebook, label: "Auto-Post FB" },
        { id: "linkedin_auto", icon: Linkedin, label: "Auto-Post LinkedIn" },
        { id: "fichiers", icon: FolderOpen, label: "Fichiers" },
        { id: "users", icon: Users, label: "Utilisateurs" },
        { id: "parametres", icon: SettingsIcon, label: "Paramètres" },
    ];

    // Filter menu items based on user permissions
    // If no profile (loading or legacy), show all (or defaults)
    const enabledFeatures = profile?.enabled_features || ["dashboard", "devis", "factures", "clients", "rdv", "parametres"];

    // Always show parametres for now, or careful not to lock out
    const menuItems = allMenuItems.filter(item =>
        enabledFeatures.includes(item.id) ||
        item.id === 'parametres' ||
        (item.id === 'users' && profile?.role === 'admin')
    );

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            <CreateQuoteDialog
                open={isQuoteDialogOpen}
                onOpenChange={(open) => {
                    setIsQuoteDialogOpen(open);
                    if (!open) setLeadInitialData(null);
                }}
                onSuccess={refetchQuotes}
                initialData={leadInitialData}
            />

            <CreateInvoiceDialog
                open={isInvoiceDialogOpen}
                onOpenChange={setIsInvoiceDialogOpen}
                onSuccess={() => { refetchInvoices(); refetchQuotes(); }}
                initialData={quoteToConvert}
            />

            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden animate-in fade-in"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-30 w-64 bg-card border-r flex flex-col transition-transform duration-300 md:translate-x-0 md:static ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="p-6 flex items-center justify-between border-b">
                    <h1 className="text-xl font-bold text-primary flex items-center gap-2">
                        <Hammer className="w-5 h-5" />
                        {(companySettings as any)?.company_name || "AMG Rénovation"}
                    </h1>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-1 py-4 overflow-y-auto">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                setIsMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${activeTab === item.id
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                }`}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t bg-muted/20 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex flex-col">
                            <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase mb-1">Assistance</p>
                            <div className="flex items-center gap-2">
                                <VoiceCommander onCommand={(cmd) => setActiveTab(cmd)} />
                                <ThemeToggle />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            AMG
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-medium truncate">Admin</p>
                            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                            <p className="text-[10px] text-red-500 font-mono">Role: {profile?.role || 'none'}</p>
                        </div>
                        <button
                            onClick={() => {
                                alert(`User ID: ${user?.id}\nProfile Role: ${profile?.role}\nLoaded: ${!loading}`);
                                console.log('Profile:', profile);
                            }}
                            className="p-2 rounded-lg text-blue-500 hover:bg-blue-100 transition-colors"
                            title="Debug Auth"
                        >
                            <Bot className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => signOut()}
                            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Déconnexion"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-muted/10">
                <header className="md:hidden bg-card border-b p-4 flex items-center gap-4 sticky top-0 z-10">
                    <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
                        <Menu className="w-5 h-5" />
                    </Button>
                    <h1 className="font-bold text-lg">AMG Rénovation</h1>
                </header>

                <main className="flex-1 p-4 md:p-8 overflow-y-auto scroll-smooth">
                    <div className="max-w-7xl mx-auto pb-20">

                        {/* DASHBOARD TAB */}
                        {activeTab === "dashboard" && (
                            <div className="space-y-6 animate-in fade-in">
                                <h2 className="text-3xl font-bold text-foreground">Tableau de bord</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab("whatsapp")}>
                                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                                Nouveaux Messages
                                            </CardTitle>
                                            <MessageSquare className="w-4 h-4 text-primary" />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{messages.length}</div>
                                            <p className="text-xs text-muted-foreground">Via WhatsApp</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab("devis")}>
                                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                                Devis en attente
                                            </CardTitle>
                                            <FileText className="w-4 h-4 text-orange-500" />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{quotes.filter((q: any) => q.status === 'draft' || q.status === 'sent').length}</div>
                                            <p className="text-xs text-muted-foreground">En attente de signature</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab("factures")}>
                                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                                Factures à encaisser
                                            </CardTitle>
                                            <Receipt className="w-4 h-4 text-green-500" />
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">{invoices.filter((i: any) => i.status === 'pending' || i.status === 'sent').length}</div>
                                            <p className="text-xs text-muted-foreground">En attente de paiement</p>
                                        </CardContent>
                                    </Card>
                                </div>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Actions Rapides</CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex flex-wrap gap-3">
                                            <Button onClick={() => setIsQuoteDialogOpen(true)}>
                                                <Plus className="w-4 h-4 mr-2" /> Nouveau Devis
                                            </Button>
                                            <Button onClick={() => setIsInvoiceDialogOpen(true)} variant="secondary">
                                                <Plus className="w-4 h-4 mr-2" /> Nouvelle Facture
                                            </Button>
                                            <Button onClick={() => setActiveTab("crm")} variant="outline">
                                                <Users className="w-4 h-4 mr-2" /> Voir les Clients
                                            </Button>
                                            <Button onClick={() => setActiveTab("rdv")} variant="outline">
                                                <CalendarIcon className="w-4 h-4 mr-2" /> Rendez-vous
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        )}

                        {/* CRM TAB */}
                        {activeTab === "crm" && <ClientsCRM />}

                        {/* WHATSAPP TAB */}
                        {activeTab === "whatsapp" && (
                            <div className="space-y-6 animate-in fade-in">
                                <h2 className="text-3xl font-bold text-foreground">Messagerie WhatsApp</h2>
                                <Card className="h-[600px] flex flex-col">
                                    <div className="p-4 border-b bg-muted/30">
                                        <p className="text-sm text-muted-foreground">Connecté au +33 6 00 00 00 00</p>
                                    </div>
                                    <ScrollArea className="flex-1 p-4">
                                        {messages.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                                                <Bot className="w-12 h-12 mb-2" />
                                                <p>Aucun message récent</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {messages.map((msg: any) => (
                                                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                                                        <div className={`max-w-[80%] p-3 rounded-lg ${msg.sender === 'user' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                                                            <p className="text-sm font-bold mb-1">{msg.phone_number}</p>
                                                            <p>{msg.message_content}</p>
                                                            <p className="text-[10px] opacity-70 text-right mt-1">
                                                                {new Date(msg.received_at).toLocaleTimeString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                    <div className="p-4 border-t flex gap-2">
                                        <Input
                                            placeholder="Écrire un message..."
                                            value={whatsappInput}
                                            onChange={(e) => setWhatsappInput(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleSendWhatsApp(); }}
                                        />
                                        <Button size="icon" onClick={handleSendWhatsApp}>
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </Card>
                            </div>
                        )}

                        {/* QUOTES TAB */}
                        {activeTab === "devis" && (
                            <div className="space-y-6 animate-in fade-in">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-3xl font-bold text-foreground">Devis</h2>
                                    <Button onClick={() => setIsQuoteDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                                        <Plus className="w-4 h-4 mr-2" /> Nouveau Devis
                                    </Button>
                                </div>
                                <Card>
                                    <CardContent className="p-0">
                                        {quotes.length === 0 ? (
                                            <div className="text-center py-12 text-muted-foreground">
                                                <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                                <p>Aucun devis pour le moment</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y">
                                                {quotes.map((quote: any) => (
                                                    <div key={quote.id} className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 hover:bg-muted/50 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className="bg-blue-100 p-2 rounded-full hidden md:block">
                                                                <FileText className="w-5 h-5 text-blue-600" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-lg">{quote.quote_number}</p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {quote.clients?.firstname} {quote.clients?.lastname} • {new Date(quote.created_at).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                                            <div className="text-right mr-4">
                                                                <p className="font-bold">{quote.total_ttc} €</p>
                                                                <Badge variant={quote.status === 'accepted' ? 'secondary' : 'outline'} className={quote.status === 'accepted' ? 'bg-green-100 text-green-800' : ''}>
                                                                    {quote.status === 'draft' ? 'Brouillon' : quote.status === 'accepted' ? 'Accepté' : 'Envoyé'}
                                                                </Badge>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button size="sm" variant="ghost" title="Envoyer par email" onClick={() => handleSendDocument(quote, 'quote')}>
                                                                    <Mail className="w-4 h-4 text-muted-foreground hover:text-primary" />
                                                                </Button>
                                                                {quote.status !== 'accepted' && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="border-green-200 hover:bg-green-50 text-green-700"
                                                                        onClick={() => handleConvertToInvoice(quote)}
                                                                    >
                                                                        <Receipt className="w-4 h-4 mr-2" /> Facturer
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* INVOICES TAB */}
                        {activeTab === "factures" && (
                            <div className="space-y-6 animate-in fade-in">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-3xl font-bold text-foreground">Factures</h2>
                                    <Button onClick={() => { setQuoteToConvert(null); setIsInvoiceDialogOpen(true); }} className="bg-green-600 hover:bg-green-700">
                                        <Plus className="w-4 h-4 mr-2" /> Nouvelle Facture
                                    </Button>
                                </div>
                                <Card>
                                    <CardContent className="p-0">
                                        {invoices.length === 0 ? (
                                            <div className="text-center py-12 text-muted-foreground">
                                                <Receipt className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                                <p>Aucune facture pour le moment</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y">
                                                {invoices.map((inv: any) => (
                                                    <div key={inv.id} className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 hover:bg-muted/50 bg-green-50/10">
                                                        <div className="flex items-center gap-4">
                                                            <div className="bg-green-100 p-2 rounded-full hidden md:block">
                                                                <Receipt className="w-5 h-5 text-green-600" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-lg">{inv.invoice_number}</p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {inv.clients?.firstname} {inv.clients?.lastname} • {new Date(inv.created_at).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                                            <div className="text-right">
                                                                <p className="font-bold">{inv.total_ttc} €</p>
                                                                <Badge variant="outline" className="bg-green-100 text-green-800 uppercase text-[10px]">{inv.status}</Badge>
                                                            </div>
                                                            <Button size="sm" variant="outline" onClick={() => handleSendDocument(inv, 'invoice')}>
                                                                <Mail className="w-4 h-4 mr-2" /> Envoyer
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* TAB COMPONENTS */}
                        {activeTab === "rdv" && <Appointments />}
                        {activeTab === "avis" && <ReviewsManager companySettings={companySettings} />}
                        {activeTab === "ia" && <VisualisationAI companySettings={companySettings} />}
                        {activeTab === "users" && <UserManagement />}
                        {activeTab === "parametres" && <Settings />}
                        {activeTab === "allovoisin" && <AlloVoisinLeads onConvertToQuote={handleConvertLeadToQuote} />}
                        {activeTab === "prospection" && <FacebookProspecting />}
                        {activeTab === "facebook" && <FacebookAutoPost companySettings={companySettings} />}
                        {activeTab === "linkedin_auto" && <LinkedInAutoPilot companySettings={companySettings} />}
                        {activeTab === "fichiers" && <FileManager />}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
