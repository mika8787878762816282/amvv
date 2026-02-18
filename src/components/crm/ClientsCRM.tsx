import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
    Users, Search, Plus, Phone, Mail, Calendar, FileText, Receipt,
    Palette, ChevronDown, Edit2, Trash2, Loader2, User
} from "lucide-react";

// Default color scheme
const DEFAULT_COLORS: Record<string, string> = {
    "Facture payée": "#22c55e",
    "Devis accepté": "#10b981",
    "En attente": "#eab308",
    "Devis envoyé": "#3b82f6",
    "Refusé": "#ef4444",
    "Nouveau": "#8b5cf6",
};

export function ClientsCRM() {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<any>(null);
    const [isColorOpen, setIsColorOpen] = useState(false);
    const [colors, setColors] = useState<Record<string, string>>(() => {
        try {
            const saved = localStorage.getItem('amg_crm_colors');
            return saved ? JSON.parse(saved) : DEFAULT_COLORS;
        } catch { return DEFAULT_COLORS; }
    });

    // Form state
    const [form, setForm] = useState({ firstname: "", lastname: "", email: "", phone: "", notes: "" });

    // Fetch clients
    const { data: clients = [], isLoading, refetch } = useQuery({
        queryKey: ["clients"],
        queryFn: async () => {
            const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
            if (error) throw error;
            return data as any[];
        },
    });

    // Fetch quotes for status
    const { data: quotes = [] } = useQuery({
        queryKey: ["quotes"],
        queryFn: async () => {
            const { data } = await supabase.from("quotes").select("*");
            return (data || []) as any[];
        },
    });

    // Fetch invoices for status
    const { data: invoices = [] } = useQuery({
        queryKey: ["invoices"],
        queryFn: async () => {
            const { data } = await supabase.from("invoices").select("*");
            return (data || []) as any[];
        },
    });

    // Fetch appointments for last RDV
    const { data: appointments = [] } = useQuery({
        queryKey: ["appointments"],
        queryFn: async () => {
            const { data } = await supabase.from("appointments").select("*");
            return (data || []) as any[];
        },
    });

    const getClientStatus = (clientId: string) => {
        const clientInvoices = invoices.filter((i: any) => i.client_id === clientId);
        const clientQuotes = quotes.filter((q: any) => q.client_id === clientId);

        if (clientInvoices.some((i: any) => i.status === 'paid')) return "Facture payée";
        if (clientInvoices.some((i: any) => i.status === 'pending' || i.status === 'sent')) return "En attente";
        if (clientQuotes.some((q: any) => q.status === 'accepted')) return "Devis accepté";
        if (clientQuotes.some((q: any) => q.status === 'sent')) return "Devis envoyé";
        if (clientQuotes.some((q: any) => q.status === 'rejected')) return "Refusé";
        if (clientQuotes.length > 0 || clientInvoices.length > 0) return "En attente";
        return "Nouveau";
    };

    const getLastAppointment = (clientName: string) => {
        const clientApps = appointments
            .filter((a: any) => a.client_name?.toLowerCase().includes(clientName.toLowerCase()))
            .sort((a: any, b: any) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime());
        return clientApps[0] || null;
    };

    // Filtered clients
    const filteredClients = clients.filter((c: any) => {
        const q = searchQuery.toLowerCase();
        return (
            `${c.firstname} ${c.lastname}`.toLowerCase().includes(q) ||
            (c.email || "").toLowerCase().includes(q) ||
            (c.phone || "").toLowerCase().includes(q)
        );
    });

    const handleSaveClient = async () => {
        try {
            if (editingClient) {
                await (supabase.from("clients") as any).update({
                    firstname: form.firstname,
                    lastname: form.lastname,
                    email: form.email,
                    phone: form.phone,
                    notes: form.notes,
                }).eq("id", editingClient.id);
                toast.success("Client modifié !");
            } else {
                await supabase.from("clients").insert({
                    firstname: form.firstname,
                    lastname: form.lastname,
                    email: form.email,
                    phone: form.phone,
                    notes: form.notes,
                });
                toast.success("Client ajouté !");
            }
            setIsAddOpen(false);
            setEditingClient(null);
            setForm({ firstname: "", lastname: "", email: "", phone: "", notes: "" });
            refetch();
            queryClient.invalidateQueries({ queryKey: ["clients"] });
        } catch (err: any) {
            toast.error("Erreur: " + err.message);
        }
    };

    const handleDeleteClient = async (id: string) => {
        await (supabase.from("clients") as any).delete().eq("id", id);
        toast.success("Client supprimé");
        refetch();
    };

    const openEdit = (client: any) => {
        setEditingClient(client);
        setForm({
            firstname: client.firstname || "",
            lastname: client.lastname || "",
            email: client.email || "",
            phone: client.phone || "",
            notes: client.notes || "",
        });
        setIsAddOpen(true);
    };

    const saveColors = (newColors: Record<string, string>) => {
        setColors(newColors);
        localStorage.setItem('amg_crm_colors', JSON.stringify(newColors));
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <Users className="w-8 h-8 text-primary" />
                        CRM Clients
                    </h2>
                    <p className="text-muted-foreground mt-1">{clients.length} client(s) enregistré(s)</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsColorOpen(true)}>
                        <Palette className="w-4 h-4 mr-2" /> Couleurs
                    </Button>
                    <Button onClick={() => { setEditingClient(null); setForm({ firstname: "", lastname: "", email: "", phone: "", notes: "" }); setIsAddOpen(true); }}>
                        <Plus className="w-4 h-4 mr-2" /> Nouveau Client
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Rechercher un client par nom, email ou téléphone..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(
                    filteredClients.reduce((acc: Record<string, number>, c: any) => {
                        const status = getClientStatus(c.id);
                        acc[status] = (acc[status] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>)
                ).map(([status, count]) => (
                    <Card key={status} className="border-l-4" style={{ borderLeftColor: colors[status] || "#94a3b8" }}>
                        <CardContent className="p-3 flex justify-between items-center">
                            <span className="text-sm font-medium">{status}</span>
                            <span className="text-2xl font-bold" style={{ color: colors[status] || "#94a3b8" }}>{count as number}</span>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Client List */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-12 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin" /></div>
                    ) : filteredClients.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">
                            <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>{searchQuery ? "Aucun résultat pour cette recherche" : "Aucun client enregistré"}</p>
                        </div>
                    ) : (
                        <ScrollArea className="max-h-[600px]">
                            <div className="divide-y">
                                {filteredClients.map((client: any) => {
                                    const status = getClientStatus(client.id);
                                    const lastApp = getLastAppointment(`${client.firstname} ${client.lastname}`);
                                    const clientQuotes = quotes.filter((q: any) => q.client_id === client.id);
                                    const clientInvoices = invoices.filter((i: any) => i.client_id === client.id);

                                    return (
                                        <div key={client.id} className="p-4 hover:bg-muted/50 transition-colors">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                                {/* Client info */}
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div
                                                        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
                                                        style={{ backgroundColor: colors[status] || "#94a3b8" }}
                                                    >
                                                        {client.firstname?.[0]}{client.lastname?.[0]}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-bold text-base truncate">{client.firstname} {client.lastname}</p>
                                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                            {client.phone && (
                                                                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {client.phone}</span>
                                                            )}
                                                            {client.email && (
                                                                <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {client.email}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Status & Stats */}
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    {lastApp && (
                                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(lastApp.appointment_date).toLocaleDateString('fr-FR')} à {new Date(lastApp.appointment_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    )}
                                                    {clientQuotes.length > 0 && (
                                                        <Badge variant="outline" className="text-[10px] gap-1">
                                                            <FileText className="w-3 h-3" /> {clientQuotes.length} devis
                                                        </Badge>
                                                    )}
                                                    {clientInvoices.length > 0 && (
                                                        <Badge variant="outline" className="text-[10px] gap-1">
                                                            <Receipt className="w-3 h-3" /> {clientInvoices.length} facture(s)
                                                        </Badge>
                                                    )}
                                                    <Badge
                                                        className="text-[10px] font-bold border-none text-white shadow-sm"
                                                        style={{ backgroundColor: colors[status] || "#94a3b8" }}
                                                    >
                                                        {status}
                                                    </Badge>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(client)} title="Modifier">
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClient(client.id)} title="Supprimer" className="text-destructive hover:text-destructive">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Client Dialog */}
            <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) setEditingClient(null); }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <User className="w-5 h-5 text-primary" />
                            {editingClient ? "Modifier le client" : "Nouveau Client"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Prénom</Label>
                                <Input value={form.firstname} onChange={e => setForm(f => ({ ...f, firstname: e.target.value }))} placeholder="Jean" />
                            </div>
                            <div className="space-y-2">
                                <Label>Nom</Label>
                                <Input value={form.lastname} onChange={e => setForm(f => ({ ...f, lastname: e.target.value }))} placeholder="Dupont" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="client@email.com" />
                        </div>
                        <div className="space-y-2">
                            <Label>Téléphone</Label>
                            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+33 6 00 00 00 00" />
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes optionnelles..." />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
                            <Button onClick={handleSaveClient}>{editingClient ? "Enregistrer" : "Ajouter"}</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Color Picker Dialog */}
            <Dialog open={isColorOpen} onOpenChange={setIsColorOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Palette className="w-5 h-5 text-primary" />
                            Personnaliser les couleurs
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        {Object.entries(colors).map(([status, color]) => (
                            <div key={status} className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium">{status}</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={(e) => saveColors({ ...colors, [status]: e.target.value })}
                                        className="w-8 h-8 rounded border cursor-pointer"
                                    />
                                    <Badge style={{ backgroundColor: color }} className="text-white text-[10px] border-none min-w-[60px] justify-center">{status}</Badge>
                                </div>
                            </div>
                        ))}
                        <div className="pt-2">
                            <Button variant="outline" size="sm" className="w-full" onClick={() => saveColors(DEFAULT_COLORS)}>
                                Réinitialiser les couleurs par défaut
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
