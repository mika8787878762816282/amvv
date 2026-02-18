# PROJET COMPLET : AMG Rénovation

Date: 2026-02-18T00:01:35.515Z



## File: src\App.tsx

```tsx
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import { LoginPage, useAuth } from "./pages/Login";
import { DebugConsole } from "@/components/debug/DebugConsole";

const queryClient = new QueryClient();

const App = () => {
    const { isLoggedIn } = useAuth();
    const [authenticated, setAuthenticated] = useState(isLoggedIn());

    useEffect(() => {
        const theme = localStorage.getItem("theme") || "light";
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, []);

    if (!authenticated) {
        return (
            <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                    <Toaster />
                    <LoginPage onLogin={() => setAuthenticated(true)} />
                </TooltipProvider>
            </QueryClientProvider>
        );
    }

    return (
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <Toaster />
                <DebugConsole />
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </TooltipProvider>
        </QueryClientProvider>
    );
};

export default App;

```


## File: src\components\ai\VisualisationAI.tsx

```tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Upload, Loader2, Image as ImageIcon, ArrowRight, History } from "lucide-react";
import { toast } from "sonner";

export function VisualisationAI({ companySettings }: { companySettings: any }) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);

    // Fetch past renderings
    const { data: renderings = [], refetch, isLoading: isLoadingHistory } = useQuery({
        queryKey: ["ai-renderings"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("ai_renderings")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data as any[];
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            setResultUrl(null);
        }
    };

    const handleGenerate = async () => {
        if (!selectedFile || !prompt) {
            toast.error("Veuillez sélectionner une image et entrer un prompt.");
            return;
        }

        setIsGenerating(true);
        try {
            // 1. Convert image to base64
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(selectedFile);
            });
            const base64Image = await base64Promise;

            // 2. Call N8N Webhook
            const n8nConfig = companySettings?.n8n_config as any;
            const n8nBase = n8nConfig?.webhook_base || (import.meta as any).env.VITE_N8N_WEBHOOK_BASE;
            const n8nWebhookUrl = n8nBase ? n8nBase + (n8nConfig?.ia_webhook || '/visualisation-ia') : null;

            if (!n8nWebhookUrl) {
                throw new Error("Webhook N8N pour l'IA non configuré");
            }

            const response = await fetch(n8nWebhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    image: base64Image,
                    prompt: prompt,
                    company_name: companySettings?.company_name || "AMG Rénovation"
                }),
            });

            if (!response.ok) throw new Error("Erreur lors de la génération par l'IA");

            const result = await response.json();

            // Assume result has generated_url or base64
            if (result.image_url) {
                setResultUrl(result.image_url);
                toast.success("Image générée avec succès !");
                refetch();
            } else {
                // Mock result for demo if N8N doesn't return an image yet
                setResultUrl(previewUrl);
                toast.warning("Génération simulée (vérifiez votre workflow N8N)");
            }

        } catch (error: any) {
            console.error("AI Generation Error:", error);
            toast.error("Erreur: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-foreground">Visualisation IA</h2>
                <Badge variant="secondary" className="bg-primary/10 text-primary">Beta</Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* CONFIGURATION */}
                <Card className="shadow-card border-primary/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            Configuration de la transformation
                        </CardTitle>
                        <CardDescription>
                            Téléchargez une photo de la pièce et décrivez les modifications souhaitées.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Photo de base</Label>
                            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors border-muted-foreground/20">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className="h-full w-full object-cover rounded-lg" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                                        <p className="mb-2 text-sm text-muted-foreground">
                                            <span className="font-semibold">Cliquez pour uploader</span> or drag and drop
                                        </p>
                                        <p className="text-xs text-muted-foreground text-center px-4">
                                            Format JPG, PNG ou WEBP (Max 5MB)
                                        </p>
                                    </div>
                                )}
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                            {previewUrl && (
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} className="text-xs text-destructive">
                                    Supprimer la photo
                                </Button>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Description des changements (Prompt)</Label>
                            <Textarea
                                placeholder="Ex: Transformer cette cuisine rustique en cuisine moderne avec un îlot central en marbre blanc, des meubles gris anthracite et un éclairage led suspendu."
                                className="min-h-[120px] resize-none"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground italic">
                                Astuce: Soyez précis sur les matériaux, les couleurs et le style (Moderne, Industriel, Scandinave...)
                            </p>
                        </div>

                        <Button
                            className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                            disabled={isGenerating || !selectedFile || !prompt}
                            onClick={handleGenerate}
                        >
                            {isGenerating ? (
                                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Génération...</>
                            ) : (
                                <><Sparkles className="w-5 h-5 mr-2" /> Générer la visualisation</>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* RESULT */}
                <Card className="shadow-card overflow-hidden flex flex-col min-h-[400px]">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-sm font-medium">Résultat de la visualisation</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col items-center justify-center p-0 relative">
                        {isGenerating ? (
                            <div className="flex flex-col items-center gap-4 text-center p-8">
                                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                <div>
                                    <p className="font-bold">L'IA transforme l'image...</p>
                                    <p className="text-sm text-muted-foreground">Cela peut prendre jusqu'à 20 secondes.</p>
                                </div>
                            </div>
                        ) : resultUrl ? (
                            <div className="w-full h-full flex flex-col">
                                <div className="flex-1 overflow-hidden">
                                    <img src={resultUrl} alt="AI Result" className="w-full h-full object-cover" />
                                </div>
                                <div className="p-4 border-t bg-card flex justify-between items-center">
                                    <p className="text-sm font-medium">Transformation terminée</p>
                                    <Button size="sm" variant="outline" onClick={() => window.open(resultUrl, '_blank')}>
                                        Télécharger
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center p-12 text-muted-foreground opacity-40">
                                <ImageIcon className="w-20 h-20 mx-auto mb-4" />
                                <p>Le résultat s'affichera ici après la génération</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* HISTORY */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-muted-foreground" />
                    <h3 className="text-xl font-bold">Historique récent</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {isLoadingHistory ? (
                        [...Array(4)].map((_, i) => <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />)
                    ) : renderings.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                            Aucune génération précédente trouvée.
                        </div>
                    ) : (
                        renderings.map((render: any) => (
                            <div key={render.id} className="group relative aspect-square rounded-lg overflow-hidden border shadow-sm hover:shadow-md transition-all">
                                <img src={render.generated_image_url} alt={render.prompt} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end text-white">
                                    <p className="text-[10px] line-clamp-3 mb-2">{render.prompt}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[8px] opacity-70">{new Date(render.created_at).toLocaleDateString()}</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// Helper to use in Dashboard exclusion list
export const AI_TAB_ID = "ia";

```


## File: src\components\appointments\Appointments.tsx

```tsx
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import {
    Calendar as CalIcon, Clock, Plus, User, Phone,
    CalendarDays, Edit2, Trash2, ChevronRight
} from "lucide-react";
import { CreateAppointmentDialog } from "./CreateAppointmentDialog";

export function Appointments() {
    const queryClient = useQueryClient();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [view, setView] = useState<"calendar" | "list">("calendar");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<any>(null);

    const { data: appointments = [], refetch } = useQuery({
        queryKey: ["appointments"],
        queryFn: async () => {
            const { data } = await supabase
                .from("appointments")
                .select("*")
                .order("appointment_date", { ascending: true });
            return (data || []) as any[];
        },
    });

    const selectedDateStr = selectedDate.toISOString().split("T")[0];
    const dailyAppointments = appointments.filter((apt: any) => {
        const aptDate = new Date(apt.appointment_date).toISOString().split("T")[0];
        return aptDate === selectedDateStr;
    });

    const handleDelete = async (id: string) => {
        await (supabase.from("appointments") as any).delete().eq("id", id);
        toast.success("Rendez-vous supprimé");
        refetch();
    };

    const handleNewAppointment = () => {
        setEditingAppointment(null);
        setIsDialogOpen(true);
    };

    const handleEditAppointment = (appointment: any) => {
        setEditingAppointment(appointment);
        setIsDialogOpen(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "confirmed":
                return <Badge className="bg-green-100 text-green-800 border-green-200">Confirmé</Badge>;
            case "pending":
                return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">En attente</Badge>;
            case "cancelled":
                return <Badge className="bg-red-100 text-red-800 border-red-200">Annulé</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Dates that have appointments (for calendar highlighting)
    const appointmentDates = appointments.map(
        (a: any) => new Date(a.appointment_date).toISOString().split("T")[0]
    );

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                    <CalIcon className="w-8 h-8 text-primary" />
                    Rendez-vous
                </h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setView(view === "calendar" ? "list" : "calendar")}>
                        {view === "calendar" ? <CalendarDays className="w-4 h-4 mr-2" /> : <CalIcon className="w-4 h-4 mr-2" />}
                        {view === "calendar" ? "Vue liste" : "Vue calendrier"}
                    </Button>
                    <Button onClick={handleNewAppointment}>
                        <Plus className="w-4 h-4 mr-2" /> Nouveau RDV
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Calendar */}
                {view === "calendar" && (
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-base">Calendrier</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-center">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => date && setSelectedDate(date)}
                                className="rounded-md"
                                modifiers={{ hasAppointment: (date) => appointmentDates.includes(date.toISOString().split("T")[0]) }}
                                modifiersStyles={{
                                    hasAppointment: { fontWeight: 'bold', color: 'var(--primary)', textDecoration: 'underline' }
                                }}
                            />
                        </CardContent>
                    </Card>
                )}

                {/* Appointments List */}
                <Card className={view === "calendar" ? "md:col-span-2" : "md:col-span-3"}>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            Rendez-vous du {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            <Badge variant="secondary">{dailyAppointments.length}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {dailyAppointments.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>Aucun rendez-vous ce jour</p>
                                <Button variant="link" onClick={handleNewAppointment} className="mt-2">
                                    <Plus className="w-3 h-3 mr-1" /> Ajouter un rendez-vous
                                </Button>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {dailyAppointments.map((apt: any) => (
                                    <div key={apt.id} className="p-4 hover:bg-muted/50 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-start gap-4">
                                                <div className="bg-primary/10 p-2.5 rounded-full">
                                                    <Clock className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-lg">
                                                            {new Date(apt.appointment_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {getStatusBadge(apt.status)}
                                                    </div>
                                                    <p className="font-medium flex items-center gap-1">
                                                        <User className="w-3 h-3" /> {apt.client_name}
                                                    </p>
                                                    {apt.phone_number && (
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                            <Phone className="w-3 h-3" /> {apt.phone_number}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="secondary" className="text-[10px]">{apt.appointment_type}</Badge>
                                                    </div>
                                                    {apt.notes && (
                                                        <p className="text-sm text-muted-foreground mt-2 italic">{apt.notes}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditAppointment(apt)} title="Modifier">
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(apt.id)} title="Supprimer" className="text-destructive hover:text-destructive">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Upcoming appointments (list view or extra section) */}
            {view === "list" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Tous les prochains rendez-vous</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {appointments
                                .filter((a: any) => new Date(a.appointment_date) >= new Date(new Date().setHours(0, 0, 0, 0)))
                                .map((apt: any) => (
                                    <div
                                        key={apt.id}
                                        className="p-3 flex items-center justify-between hover:bg-muted/50 cursor-pointer transition-colors"
                                        onClick={() => {
                                            setSelectedDate(new Date(apt.appointment_date));
                                            setView("calendar");
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="text-center min-w-[50px]">
                                                <p className="text-xs text-muted-foreground">{new Date(apt.appointment_date).toLocaleDateString('fr-FR', { weekday: 'short' })}</p>
                                                <p className="text-xl font-bold">{new Date(apt.appointment_date).getDate()}</p>
                                                <p className="text-[10px] text-muted-foreground">{new Date(apt.appointment_date).toLocaleDateString('fr-FR', { month: 'short' })}</p>
                                            </div>
                                            <div>
                                                <p className="font-medium">{apt.client_name}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(apt.appointment_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} — {apt.appointment_type}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(apt.status)}
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <CreateAppointmentDialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) setEditingAppointment(null);
                }}
                onSuccess={() => {
                    refetch();
                    queryClient.invalidateQueries({ queryKey: ["appointments"] });
                }}
                initialData={editingAppointment}
            />
        </div>
    );
}

```


## File: src\components\appointments\CreateAppointmentDialog.tsx

```tsx
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Calendar, Clock } from "lucide-react";

export function CreateAppointmentDialog({
    open,
    onOpenChange,
    onSuccess,
    initialData = null
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    initialData?: any;
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [clientName, setClientName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [appointmentDate, setAppointmentDate] = useState("");
    const [appointmentTime, setAppointmentTime] = useState("");
    const [appointmentType, setAppointmentType] = useState("Visite technique");
    const [status, setStatus] = useState("pending");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (initialData && open) {
            setClientName(initialData.client_name || "");
            setPhoneNumber(initialData.phone_number || "");
            if (initialData.appointment_date) {
                const d = new Date(initialData.appointment_date);
                setAppointmentDate(d.toISOString().split('T')[0]);
                setAppointmentTime(d.toTimeString().slice(0, 5));
            }
            setAppointmentType(initialData.appointment_type || "Visite technique");
            setStatus(initialData.status || "pending");
            setNotes(initialData.notes || "");
        } else if (open && !initialData) {
            const now = new Date();
            setClientName("");
            setPhoneNumber("");
            setAppointmentDate(now.toISOString().split('T')[0]);
            setAppointmentTime("09:00");
            setAppointmentType("Visite technique");
            setStatus("pending");
            setNotes("");
        }
    }, [initialData, open]);

    const handleSubmit = async () => {
        if (!clientName.trim()) {
            toast.error("Le nom du client est requis.");
            return;
        }
        if (!appointmentDate || !appointmentTime) {
            toast.error("Veuillez sélectionner une date et une heure.");
            return;
        }

        setIsLoading(true);
        try {
            const dateTime = new Date(`${appointmentDate}T${appointmentTime}:00`).toISOString();
            const data = {
                client_name: clientName,
                phone_number: phoneNumber,
                appointment_date: dateTime,
                appointment_type: appointmentType,
                status,
                notes,
            };

            if (initialData?.id) {
                // Update existing
                await (supabase.from("appointments") as any).update(data).eq("id", initialData.id);
                toast.success("Rendez-vous modifié !");
            } else {
                // Create new
                await supabase.from("appointments").insert(data);
                toast.success("Rendez-vous créé !");
            }

            onSuccess?.();
            onOpenChange(false);
        } catch (err: any) {
            toast.error("Erreur: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        {initialData ? "Modifier le rendez-vous" : "Nouveau Rendez-vous"}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Client</Label>
                            <Input
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                placeholder="Nom du client"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Téléphone</Label>
                            <Input
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="+33 6 00 00 00 00"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input
                                type="date"
                                value={appointmentDate}
                                onChange={(e) => setAppointmentDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Heure</Label>
                            <Input
                                type="time"
                                value={appointmentTime}
                                onChange={(e) => setAppointmentTime(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Type de rendez-vous</Label>
                            <Select value={appointmentType} onValueChange={setAppointmentType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Visite technique">Visite technique</SelectItem>
                                    <SelectItem value="Devis sur place">Devis sur place</SelectItem>
                                    <SelectItem value="Début de chantier">Début de chantier</SelectItem>
                                    <SelectItem value="Suivi de chantier">Suivi de chantier</SelectItem>
                                    <SelectItem value="Réception des travaux">Réception des travaux</SelectItem>
                                    <SelectItem value="Autre">Autre</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Statut</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">En attente</SelectItem>
                                    <SelectItem value="confirmed">Confirmé</SelectItem>
                                    <SelectItem value="cancelled">Annulé</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Notes complémentaires..."
                            className="min-h-[80px]"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                        <Button onClick={handleSubmit} disabled={isLoading}>
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {initialData ? "Enregistrer" : "Créer le RDV"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

```


## File: src\components\crm\ClientsCRM.tsx

```tsx
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

```


## File: src\components\debug\DebugConsole.tsx

```tsx
import { useState, useEffect, useRef } from "react";
import { Terminal, X, Trash2, ChevronUp, ChevronDown, Bug, Info, AlertTriangle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type LogEntry = {
    id: string;
    timestamp: Date;
    level: "info" | "warn" | "error" | "debug";
    module: string;
    message: string;
    data?: any;
};

export function DebugConsole() {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Hook into console.log and other methods
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        const addLog = (level: LogEntry["level"], args: any[]) => {
            const entry: LogEntry = {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: new Date(),
                level,
                module: "System",
                message: args.map(arg => typeof arg === "object" ? JSON.stringify(arg) : String(arg)).join(" "),
                data: args.length > 1 ? args.slice(1) : undefined
            };
            setLogs(prev => [...prev, entry].slice(-100)); // Keep last 100 logs
        };

        console.log = (...args) => {
            originalLog(...args);
            addLog("info", args);
        };
        console.warn = (...args) => {
            originalWarn(...args);
            addLog("warn", args);
        };
        console.error = (...args) => {
            originalError(...args);
            addLog("error", args);
        };

        return () => {
            console.log = originalLog;
            console.warn = originalWarn;
            console.error = originalError;
        };
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, isOpen]);

    const getLevelIcon = (level: LogEntry["level"]) => {
        switch (level) {
            case "info": return <Info className="w-3 h-3 text-blue-500" />;
            case "warn": return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
            case "error": return <AlertCircle className="w-3 h-3 text-red-500" />;
            default: return <Bug className="w-3 h-3 text-gray-500" />;
        }
    };

    if (!isOpen) {
        return (
            <Button
                variant="outline"
                size="sm"
                className="fixed bottom-4 right-4 z-50 rounded-full bg-background/80 backdrop-blur border-primary/20 shadow-lg hover:bg-primary/5 gap-2"
                onClick={() => setIsOpen(true)}
            >
                <Terminal className="w-4 h-4" /> Console
                {logs.filter(l => l.level === "error").length > 0 && (
                    <Badge variant="destructive" className="h-4 min-w-[1rem] p-0 flex items-center justify-center text-[10px]">
                        {logs.filter(l => l.level === "error").length}
                    </Badge>
                )}
            </Button>
        );
    }

    return (
        <div className={`fixed bottom-0 right-0 z-50 w-full md:w-[600px] transition-all duration-300 ${isExpanded ? 'h-full md:h-[600px]' : 'h-[300px]'} bg-zinc-950 text-zinc-300 border-t md:border-l border-zinc-800 shadow-2xl flex flex-col font-mono text-xs overflow-hidden`}>
            <div className="flex items-center justify-between p-2 bg-zinc-900 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-primary" />
                    <span className="font-bold uppercase tracking-widest text-[10px]">AMG DEBUG CONSOLE</span>
                    <Badge variant="outline" className="text-[9px] border-zinc-700 text-zinc-500 bg-transparent">
                        {logs.length} entries
                    </Badge>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white" onClick={() => setLogs([])}>
                        <Trash2 className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white" onClick={() => setIsExpanded(!isExpanded)}>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white" onClick={() => setIsOpen(false)}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                    {logs.map((log) => (
                        <div key={log.id} className="flex gap-2 py-0.5 border-b border-zinc-900/50 hover:bg-zinc-900/40 rounded px-1 group transition-colors">
                            <span className="text-zinc-600 whitespace-nowrap">{format(log.timestamp, "HH:mm:ss")}</span>
                            <span className="flex items-center gap-1">
                                {getLevelIcon(log.level)}
                            </span>
                            <span className={`flex-1 break-all ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-zinc-300'}`}>
                                {log.message}
                            </span>
                        </div>
                    ))}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            <div className="p-1 px-3 bg-zinc-900/50 text-[9px] text-zinc-500 flex justify-between">
                <span>AMG Rénovation Management System v1.0.0</span>
                <span>Active Session: {Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
            </div>
        </div>
    );
}

```


## File: src\components\facebook\FacebookAutoPost.tsx

```tsx
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    Facebook, Share2, Plus, Clock, Send, Image as ImageIcon,
    Loader2, Calendar, Eye, CheckCircle2, XCircle
} from "lucide-react";

export function FacebookAutoPost({ companySettings }: { companySettings: any }) {
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [caption, setCaption] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [scheduledDate, setScheduledDate] = useState("");

    // Fetch posts from localStorage
    const { data: posts = [], refetch } = useQuery({
        queryKey: ["facebook-posts"],
        queryFn: async () => {
            const { data } = await supabase
                .from("facebook_posts")
                .select("*")
                .order("created_at", { ascending: false });
            return (data || []) as any[];
        },
    });

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmitPost = async () => {
        if (!caption.trim()) {
            toast.error("Veuillez écrire une légende pour le post.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Save post to localStorage
            const postData = {
                caption,
                image_url: imagePreview || null,
                scheduled_at: scheduledDate || null,
                status: scheduledDate ? "scheduled" : "published",
                created_at: new Date().toISOString(),
            };

            await supabase.from("facebook_posts").insert(postData);

            // Attempt to call n8n webhook
            const n8nConfig = (companySettings as any)?.n8n_config as any;
            const n8nBase = n8nConfig?.webhook_base || (import.meta as any).env.VITE_N8N_WEBHOOK_BASE;
            const webhookUrl = n8nBase ? n8nBase + (n8nConfig?.facebook_autopost_webhook || '/facebook-autopost') : null;

            if (webhookUrl) {
                try {
                    await fetch(webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            caption,
                            image_url: imagePreview,
                            scheduled_at: scheduledDate,
                            company_name: companySettings?.company_name || "AMG Rénovation"
                        })
                    });
                    toast.success("Post envoyé à N8N pour publication !");
                } catch {
                    toast.warning("Post enregistré mais N8N non joignable.");
                }
            } else {
                toast.success("Post enregistré localement !");
            }

            // Reset form
            setCaption("");
            setImageFile(null);
            setImagePreview(null);
            setScheduledDate("");
            setIsCreateOpen(false);
            refetch();
        } catch (err: any) {
            toast.error("Erreur: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'published': return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Publié</Badge>;
            case 'scheduled': return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Clock className="w-3 h-3 mr-1" /> Programmé</Badge>;
            case 'failed': return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" /> Échoué</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <Facebook className="w-8 h-8 text-[#1877F2]" />
                        Facebook Auto-Post
                    </h2>
                    <p className="text-muted-foreground mt-1">Planifiez et publiez automatiquement sur Facebook</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-[#1877F2] hover:bg-[#166FE5]">
                    <Plus className="w-4 h-4 mr-2" /> Nouveau Post
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{posts.filter((p: any) => p.status === 'published').length}</p>
                            <p className="text-xs text-muted-foreground">Posts publiés</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{posts.filter((p: any) => p.status === 'scheduled').length}</p>
                            <p className="text-xs text-muted-foreground">Posts programmés</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                            <Share2 className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{posts.length}</p>
                            <p className="text-xs text-muted-foreground">Total posts</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Posts List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-card border-2 border-dashed rounded-xl">
                        <Facebook className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                        <h3 className="text-xl font-medium">Aucun post planifié</h3>
                        <p className="text-muted-foreground">Cliquez sur "Nouveau Post" pour commencer.</p>
                    </div>
                ) : (
                    posts.map((post: any) => (
                        <Card key={post.id} className="group overflow-hidden hover:shadow-lg transition-all">
                            {post.image_url && (
                                <div className="h-48 overflow-hidden bg-muted">
                                    <img src={post.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                </div>
                            )}
                            <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    {getStatusBadge(post.status)}
                                    <span className="text-[10px] text-muted-foreground">
                                        {new Date(post.created_at).toLocaleDateString('fr-FR')}
                                    </span>
                                </div>
                                <p className="text-sm line-clamp-3">{post.caption}</p>
                                {post.scheduled_at && (
                                    <div className="flex items-center gap-1 text-xs text-blue-600">
                                        <Calendar className="w-3 h-3" />
                                        Programmé le {new Date(post.scheduled_at).toLocaleDateString('fr-FR')} à {new Date(post.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Create Post Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Facebook className="w-5 h-5 text-[#1877F2]" />
                            Nouveau Post Facebook
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {/* Image upload */}
                        <div className="space-y-2">
                            <Label>Image (optionnel)</Label>
                            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover rounded-lg" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <ImageIcon className="w-8 h-8" />
                                        <span className="text-sm">Cliquez pour ajouter une image</span>
                                    </div>
                                )}
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                            </label>
                        </div>

                        {/* Caption */}
                        <div className="space-y-2">
                            <Label>Légende du post</Label>
                            <Textarea
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Découvrez notre dernière réalisation ! 🏠✨ Rénovation complète d'une salle de bain..."
                                className="min-h-[120px]"
                            />
                            <p className="text-[10px] text-muted-foreground">{caption.length} caractères</p>
                        </div>

                        {/* Schedule */}
                        <div className="space-y-2">
                            <Label>Programmer la publication (optionnel)</Label>
                            <Input
                                type="datetime-local"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground italic">
                                Laissez vide pour publier immédiatement
                            </p>
                        </div>

                        {/* Preview */}
                        {caption && (
                            <Card className="bg-muted/30 border-dashed">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs flex items-center gap-1 text-muted-foreground">
                                        <Eye className="w-3 h-3" /> Aperçu
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">AMG</div>
                                        <div>
                                            <p className="text-xs font-bold">AMG Rénovation</p>
                                            <p className="text-[10px] text-muted-foreground">{scheduledDate ? new Date(scheduledDate).toLocaleDateString('fr-FR') : "Maintenant"}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">{caption}</p>
                                    {imagePreview && <img src={imagePreview} alt="" className="rounded-lg w-full max-h-40 object-cover" />}
                                </CardContent>
                            </Card>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
                            <Button onClick={handleSubmitPost} disabled={isSubmitting} className="bg-[#1877F2] hover:bg-[#166FE5]">
                                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                {scheduledDate ? "Programmer" : "Publier"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

```


## File: src\components\files\FileManager.tsx

```tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Receipt, Image as ImageIcon, File, ExternalLink, Search, Clock, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function FileManager() {
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState<string | null>(null);

    const { data: files = [], isLoading } = useQuery({
        queryKey: ["company-files"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("company_files")
                .select(`
                    *,
                    clients (
                        firstname,
                        lastname
                    )
                `)
                .order("uploaded_at", { ascending: false });
            if (error) throw error;
            return data as any[];
        },
    });

    const categories = [
        { id: 'devis', label: 'Devis', icon: FileText },
        { id: 'facture', label: 'Factures', icon: Receipt },
        { id: 'photo', label: 'Photos', icon: ImageIcon },
        { id: 'other', label: 'Autres', icon: File },
    ];

    const filteredFiles = files.filter(f => {
        const matchesSearch = f.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (f.clients?.lastname || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !filterCategory || f.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const getFileIcon = (category: string | null) => {
        switch (category) {
            case 'devis': return <FileText className="w-5 h-5 text-blue-500" />;
            case 'facture': return <Receipt className="w-5 h-5 text-green-500" />;
            case 'photo': return <ImageIcon className="w-5 h-5 text-purple-500" />;
            default: return <File className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-foreground">Gestion des Fichiers</h2>
                <Button variant="outline" className="gap-2">
                    <Filter className="w-4 h-4" /> Filtres avancés
                </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher par nom ou client..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    <Button
                        variant={filterCategory === null ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterCategory(null)}
                    >
                        Tous
                    </Button>
                    {categories.map(cat => (
                        <Button
                            key={cat.id}
                            variant={filterCategory === cat.id ? "secondary" : "outline"}
                            size="sm"
                            className="gap-2"
                            onClick={() => setFilterCategory(cat.id)}
                        >
                            <cat.icon className="w-4 h-4" />
                            {cat.label}
                        </Button>
                    ))}
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-12 text-center text-muted-foreground">Chargement des fichiers...</div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">
                            <File className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Aucun fichier trouvé</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {filteredFiles.map((file) => (
                                <div key={(file as any).id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-background border flex items-center justify-center shadow-sm">
                                            {getFileIcon((file as any).category)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{(file as any).file_name}</p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                                                {(file as any).clients ? `${(file as any).clients.firstname} ${(file as any).clients.lastname}` : "Général"}
                                                <span>•</span>
                                                <Clock className="w-3 h-3" />
                                                {new Date((file as any).uploaded_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-primary hover:text-primary hover:bg-primary/5"
                                            onClick={() => window.open((file as any).file_url, '_blank')}
                                        >
                                            <ExternalLink className="w-4 h-4 mr-2" /> Ouvrir
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

```


## File: src\components\invoices\CreateInvoiceDialog.tsx

```tsx
import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Reusing the same structure as QuoteDialog but for Invoices
export function CreateInvoiceDialog({
    open,
    onOpenChange,
    onSuccess,
    initialData = null
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    initialData?: any;
}) {
    const [isLoading, setIsLoading] = useState(false);

    const { register, control, handleSubmit, watch, reset, setValue } = useForm({
        defaultValues: {
            client_name: "",
            client_email: "",
            items: [{ description: "", quantity: 1, unit_price: 0 }]
        }
    });

    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: "items"
    });

    // Populate form if initialData is provided (Convert from Quote)
    useEffect(() => {
        if (initialData && open) {
            console.log("Initializing Invoice with data:", initialData);
            setValue("client_name", initialData.client_name || "");
            setValue("client_email", initialData.client_email || "");
            if (initialData.items && initialData.items.length > 0) {
                replace(initialData.items);
            }
        } else if (open && !initialData) {
            reset({
                client_name: "",
                client_email: "",
                items: [{ description: "", quantity: 1, unit_price: 0 }]
            });
        }
    }, [initialData, open, replace, reset, setValue]);

    const items = watch("items");
    const totalHT = items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    const tva = totalHT * 0.20;
    const totalTTC = totalHT + tva;

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            // 1. Get/Create Client
            let clientId = initialData?.client_id;

            if (!clientId) {
                const { data: clientData, error: clientError } = await (supabase
                    .from('clients') as any)
                    .insert({
                        firstname: data.client_name.split(' ')[0] || 'Unknown',
                        lastname: data.client_name.split(' ').slice(1).join(' ') || 'Client',
                        email: data.client_email
                    })
                    .select()
                    .single();
                if (clientError) throw clientError;
                clientId = clientData.id;
            }

            // 2. Create Invoice
            const invoiceNumber = `FAC-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

            const { error: invoiceError } = await (supabase
                .from('invoices') as any)
                .insert({
                    client_id: clientId,
                    quote_id: initialData?.id || null, // Link to quote if exists
                    invoice_number: invoiceNumber,
                    total_ht: totalHT,
                    total_ttc: totalTTC,
                    status: 'pending',
                    items: data.items,
                    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 days
                    clients: { firstname: data.client_name.split(' ')[0] || 'Client', lastname: data.client_name.split(' ').slice(1).join(' ') || '', email: data.client_email }
                })
                .select()
                .single();

            if (invoiceError) throw invoiceError;

            // 3. Trigger N8N (Facture)
            const { data: settingsData } = await (supabase.from('company_settings') as any).select('n8n_config').single();
            const n8nConfig = settingsData?.n8n_config as any;
            const n8nBase = n8nConfig?.webhook_base || (import.meta as any).env.VITE_N8N_WEBHOOK_BASE;
            const n8nWebhookUrl = n8nBase ? n8nBase + (n8nConfig?.facture_webhook || '/envoi-facture') : null;

            if (n8nWebhookUrl) {
                const legacyPayload = {
                    "Date": new Date().toLocaleDateString('fr-FR'),
                    "Nom": data.client_name.split(' ').slice(1).join(' ') || 'Client',
                    "Prénom": data.client_name.split(' ')[0] || 'Unknown',
                    "Email": data.client_email,
                    "Prix HT": totalHT,
                    "TVA": 20,
                    "Prix TTC": totalTTC,
                    "Description": data.items.map((i: any) => `${i.description} (x${i.quantity})`).join('\n'),
                    "Numéro de facture": invoiceNumber,
                    "Numéro de devis": initialData?.quote_number || "N/A"
                };

                await fetch(n8nWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(legacyPayload)
                });
                toast.success("Facture envoyée à N8N !");
            } else {
                toast.warning("Facture enregistrée (N8N non configuré)");
            }

            // 4. Update Quote status if converting
            if (initialData?.id) {
                await (supabase.from('quotes') as any).update({ status: 'accepted' }).eq('id', initialData.id);
            }

            onSuccess?.();
            onOpenChange(false);
            reset();

        } catch (error: any) {
            console.error('Error:', error);
            toast.error("Erreur: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-primary" />
                        {initialData ? `Convertir Devis ${initialData.quote_number} en Facture` : "Créer une Nouvelle Facture"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Client</Label>
                            <Input {...register("client_name", { required: true })} placeholder="Nom du client" />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input {...register("client_email")} placeholder="Email" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-muted/50 p-2 rounded-lg">
                            <Label className="font-semibold text-base">Lignes de la facture</Label>
                            <Button type="button" variant="secondary" size="sm" onClick={() => append({ description: "", quantity: 1, unit_price: 0 })}>
                                <Plus className="w-4 h-4 mr-2" /> Ajouter
                            </Button>
                        </div>

                        <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-2">
                            <div className="col-span-6">Description</div>
                            <div className="col-span-2 text-right">Qté</div>
                            <div className="col-span-3 text-right">Prix Unit. (€)</div>
                            <div className="col-span-1"></div>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-12 gap-2 items-start group">
                                    <div className="col-span-6">
                                        <Textarea
                                            {...register(`items.${index}.description` as const, { required: true })}
                                            className="min-h-[40px] resize-none"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Input type="number" {...register(`items.${index}.quantity` as const, { valueAsNumber: true })} className="text-right" step="0.1" />
                                    </div>
                                    <div className="col-span-3">
                                        <Input type="number" {...register(`items.${index}.unit_price` as const, { valueAsNumber: true })} className="text-right" step="0.01" />
                                    </div>
                                    <div className="col-span-1 text-right">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="opacity-50 group-hover:opacity-100 hover:text-destructive">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 pt-4 border-t">
                        <div className="flex justify-between w-48 font-bold text-lg">
                            <span>Total TTC:</span>
                            <span className="text-primary">{totalTTC.toFixed(2)} €</span>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                        <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {initialData ? "Valider & Transformer" : "Créer Facture"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

```


## File: src\components\leads\AlloVoisinLeads.tsx

```tsx
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, MapPin, Euro, ArrowRight, ExternalLink, Timer, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export function AlloVoisinLeads({ onConvertToQuote }: { onConvertToQuote: (lead: any) => void }) {
    const { data: leads = [], refetch, isLoading } = useQuery({
        queryKey: ["allovoisin-leads"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("allovoisin_leads")
                .select("*")
                .order("email_date", { ascending: false });
            if (error) throw error;
            return data as any[];
        },
    });

    const handleUpdateStatus = async (leadId: string, status: string) => {
        try {
            const { error } = await (supabase.from('allovoisin_leads') as any).update({ status }).eq('id', leadId);
            if (error) throw error;
            toast.success("Statut mis à jour");
            refetch();
        } catch (error: any) {
            toast.error("Erreur: " + error.message);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'interested': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'converted': return 'bg-green-100 text-green-800 border-green-200';
            case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-foreground">Opportunités AlloVoisin</h2>
                <div className="flex gap-2">
                    <Badge variant="outline" className="bg-blue-50">
                        {leads.filter(l => l.status === 'pending').length} Nouveaux
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {isLoading ? (
                    [...Array(6)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="h-24 bg-muted" />
                            <CardContent className="h-48" />
                        </Card>
                    ))
                ) : leads.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-card border-2 border-dashed rounded-xl overflow-hidden">
                        <Mail className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                        <h3 className="text-xl font-medium">Aucun lead trouvé</h3>
                        <p className="text-muted-foreground">Les opportunités Gmail s'afficheront ici automatiquement.</p>
                    </div>
                ) : (
                    leads.map((lead) => (
                        <Card key={lead.id} className={`group overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] border-t-0 border-r-0 border-b-0 border-l-4 ${lead.status === 'pending' ? 'border-l-amber-500 bg-gradient-to-br from-amber-50/50 to-transparent' :
                            lead.status === 'interested' ? 'border-l-indigo-500 bg-gradient-to-br from-indigo-50/50 to-transparent' :
                                lead.status === 'converted' ? 'border-l-emerald-500 bg-gradient-to-br from-emerald-50/50 to-transparent' :
                                    'border-l-slate-400 bg-slate-50/50'
                            }`}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="outline" className={`${getStatusColor(lead.status)} shadow-sm`}>
                                        {lead.status === 'pending' ? 'Nouveau' :
                                            lead.status === 'interested' ? 'Intéressé' :
                                                lead.status === 'converted' ? 'Converti' : 'Refusé'}
                                    </Badge>
                                    <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-full flex items-center gap-1">
                                        <Timer className="w-3 h-3" />
                                        {new Date(lead.email_date).toLocaleDateString()}
                                    </span>
                                </div>
                                <CardTitle className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">{lead.project_type || "Travaux"}</CardTitle>
                                <CardDescription className="flex items-center gap-1 font-medium text-zinc-600">
                                    <User className="w-3 h-3 text-zinc-400" /> {lead.client_name}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-3 rounded-xl bg-white/40 border border-white/60 space-y-2 backdrop-blur-sm shadow-inner">
                                    <div className="flex items-center gap-2 text-sm">
                                        <MapPin className="w-4 h-4 text-indigo-500" />
                                        <span className="font-semibold text-zinc-700">{lead.city}</span>
                                        <span className="text-zinc-400 text-xs">({lead.postal_code})</span>
                                        {lead.distance_km && <span className="ml-auto text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded cursor-help" title="Distance de votre atelier">{lead.distance_km} km</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Euro className="w-4 h-4 text-emerald-600" />
                                        <span className="font-bold text-zinc-900">{lead.estimated_price_min}€ - {lead.estimated_price_max}€</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 pt-2">
                                    {lead.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                                                onClick={() => handleUpdateStatus(lead.id, 'interested')}
                                            >
                                                <CheckCircle2 className="w-4 h-4 mr-2" /> Intéressé
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                                                onClick={() => handleUpdateStatus(lead.id, 'rejected')}
                                            >
                                                <XCircle className="w-4 h-4 mr-2" /> Refuser
                                            </Button>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        {lead.status !== 'converted' && (
                                            <Button
                                                className="flex-1 bg-primary hover:bg-primary/90"
                                                onClick={() => onConvertToQuote(lead)}
                                            >
                                                <ArrowRight className="w-4 h-4 mr-2" /> Créer Devis
                                            </Button>
                                        )}
                                        {lead.original_link && (
                                            <Button variant="ghost" size="icon" title="Ouvrir sur AlloVoisin" onClick={() => window.open(lead.original_link, '_blank')}>
                                                <ExternalLink className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}

// Import Lucide User icon
import { User } from "lucide-react";

```


## File: src\components\leads\FacebookProspecting.tsx

```tsx
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Facebook, MessageSquare, ExternalLink, ShieldCheck, ShieldAlert, Clock, User } from "lucide-react";
import { toast } from "sonner";

export function FacebookProspecting() {
    const { data: prospects = [], refetch, isLoading } = useQuery({
        queryKey: ["facebook-prospects"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("facebook_prospects")
                .select("*")
                .order("scraped_at", { ascending: false });
            if (error) throw error;
            return data as any[];
        },
    });

    const handleUpdateStatus = async (prospectId: string, status: string) => {
        try {
            const { error } = await (supabase.from('facebook_prospects') as any).update({ status }).eq('id', prospectId);
            if (error) throw error;
            toast.success("Statut mis à jour");
            refetch();
        } catch (error: any) {
            toast.error("Erreur: " + error.message);
        }
    };

    const getScoreColor = (analysis: string | null) => {
        if (!analysis) return "text-gray-400";
        if (analysis.toLowerCase().includes("high") || analysis.toLowerCase().includes("excellent")) return "text-green-500";
        if (analysis.toLowerCase().includes("medium")) return "text-blue-500";
        return "text-orange-500";
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-foreground">Prospection Facebook</h2>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <Facebook className="w-3 h-3 mr-1" /> Meta Groups
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    [...Array(6)].map((_, i) => <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />)
                ) : prospects.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-card border-2 border-dashed rounded-xl">
                        <Facebook className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                        <h3 className="text-xl font-medium">Aucun prospect détecté</h3>
                        <p className="text-muted-foreground">Les publications Facebook analysées par N8N apparaîtront ici.</p>
                    </div>
                ) : (
                    prospects.map((p) => (
                        <Card key={p.id} className="group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] border-none bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-900 dark:to-zinc-950 shadow-md">
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Facebook className="w-12 h-12 rotate-12" />
                            </div>
                            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border-2 border-white dark:border-zinc-800 shadow-sm">
                                            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold tracking-tight">{p.author_name || "Auteur inconnu"}</CardTitle>
                                            <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {new Date(p.scraped_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant={p.status === 'qualified' ? 'default' : 'outline'} className={
                                        p.status === 'qualified' ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-none' : 'text-[10px] font-bold tracking-wider uppercase'
                                    }>
                                        {p.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="bg-zinc-100/50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 shadow-inner">
                                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed italic line-clamp-4">
                                        "{p.post_content || "Pas de contenu disponible"}"
                                    </p>
                                </div>

                                {p.analysis_result && (
                                    <div className={`border rounded-xl p-3 space-y-2 bg-white dark:bg-zinc-900 shadow-sm transition-all group-hover:border-blue-300 dark:group-hover:border-blue-900 ${getScoreColor(p.analysis_result).replace('text-', 'border-')}`}>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Expert Analysis</span>
                                            {p.status === 'qualified' ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : <ShieldAlert className="w-4 h-4 text-amber-500" />}
                                        </div>
                                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{p.analysis_result}</p>
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        className="flex-1 bg-[#1877F2] hover:bg-[#166FE5] text-white shadow-lg shadow-blue-500/20"
                                        onClick={() => window.open(p.post_url, '_blank')}
                                    >
                                        <ExternalLink className="w-4 h-4 mr-2" /> Voir le Post
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950 transition-colors"
                                        onClick={() => handleUpdateStatus(p.id, 'contacted')}
                                    >
                                        <MessageSquare className="w-4 h-4 mr-2" /> Contacté
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}

```


## File: src\components\quotes\CreateQuoteDialog.tsx

```tsx
import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"; // You'll need to create this ui component or use standard dialog
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Placeholder for the Dialog UI components since we haven't created them yet
// I will create the Dialog component file next.

export function CreateQuoteDialog({
    open,
    onOpenChange,
    onSuccess,
    initialData = null
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    initialData?: any;
}) {
    const [isLoading, setIsLoading] = useState(false);

    const { register, control, handleSubmit, watch, setValue, reset } = useForm({
        defaultValues: {
            client_name: "",
            client_email: "",
            items: [{ description: "", quantity: 1, unit_price: 0 }]
        }
    });

    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: "items"
    });

    // Handle initialData pre-filling
    useEffect(() => {
        if (initialData && open) {
            setValue("client_name", initialData.client_name || "");
            setValue("client_email", initialData.client_email || "");
            if (initialData.items) {
                replace(initialData.items);
            }
        } else if (open && !initialData) {
            reset({
                client_name: "",
                client_email: "",
                items: [{ description: "", quantity: 1, unit_price: 0 }]
            });
        }
    }, [initialData, open, setValue, replace, reset]);

    const items = watch("items");
    const totalHT = items.reduce((acc, item) => acc + (item.quantity * (item.unit_price || 0)), 0);
    const tva = totalHT * 0.20;
    const totalTTC = totalHT + tva;

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            // 1. Create/Get Client (simplified for now)
            // In a real app, you'd select from existing clients or create new
            const { data: clientData, error: clientError } = await (supabase
                .from('clients') as any)
                .insert({
                    firstname: data.client_name.split(' ')[0] || 'Unknown',
                    lastname: data.client_name.split(' ').slice(1).join(' ') || 'Client',
                    email: data.client_email
                })
                .select()
                .single();

            if (clientError) throw clientError;

            // 2. Create Quote in Supabase
            const quoteNumber = `DEV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

            const { data: quoteData, error: quoteError } = await (supabase
                .from('quotes') as any)
                .insert({
                    client_id: clientData.id,
                    quote_number: quoteNumber,
                    total_ht: totalHT,
                    total_ttc: totalTTC,
                    status: 'draft',
                    items: data.items,
                    clients: { firstname: clientData.firstname, lastname: clientData.lastname, email: clientData.email }
                })
                .select()
                .single();

            if (quoteError) throw quoteError;

            // 3. Trigger N8N Webhook (using URL from database settings)
            const { data: settingsData } = await supabase
                .from('company_settings')
                .select('n8n_config')
                .single();

            const n8nConfig = (settingsData as any)?.n8n_config as any;
            const n8nBase = n8nConfig?.webhook_base || (import.meta as any).env.VITE_N8N_WEBHOOK_BASE;
            const url = n8nBase ? n8nBase + (n8nConfig?.devis_webhook || '/generer-devis') : null;

            // Attempt to call N8N with LEGACY PAYLOAD FORMAT
            try {
                if (url) {
                    const legacyPayload = {
                        "Date": new Date().toLocaleDateString('fr-FR'),
                        "Nom": data.client_name.split(' ').slice(1).join(' ') || 'Client',
                        "Prénom": data.client_name.split(' ')[0] || 'Unknown',
                        "Adresse": "",
                        "Email": data.client_email,
                        "Prix HT": totalHT,
                        "TVA": 20,
                        "Prix TTC": totalTTC,
                        "Description": data.items.map((i: any) => `${i.description} (x${i.quantity})`).join('\n'),
                        "Délai": "1 mois",
                        "Type de travaux": "Rénovation",
                        "Validité": "30 jours",
                        "Numéro de devis": quoteNumber
                    };

                    await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(legacyPayload)
                    });
                    toast.success("Devis créé et envoyé à N8N pour génération PDF !");
                } else {
                    toast.warning("Devis enregistré mais URL N8N non configurée.");
                }
            } catch (err) {
                console.error("N8N Error", err);
                toast.error("Erreur de connexion avec N8N");
            }

            onSuccess?.();
            onOpenChange(false);
            reset();

        } catch (error: any) {
            console.error('Error:', error);
            toast.error("Erreur lors de la création du devis: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Créer un Nouveau Devis</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="client_name">Nom du Client</Label>
                            <Input id="client_name" {...register("client_name", { required: true })} placeholder="Ex: Jean Dupont" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="client_email">Email</Label>
                            <Input id="client_email" type="email" {...register("client_email")} placeholder="client@email.com" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-muted/50 p-2 rounded-lg">
                            <Label className="font-semibold text-base">Éléments du devis</Label>
                            <Button type="button" variant="secondary" size="sm" onClick={() => append({ description: "", quantity: 1, unit_price: 0 })}>
                                <Plus className="w-4 h-4 mr-2" /> Ajouter une ligne
                            </Button>
                        </div>

                        {/* Table Headers */}
                        <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground px-2">
                            <div className="col-span-6">Description</div>
                            <div className="col-span-2 text-right">Qté</div>
                            <div className="col-span-3 text-right">Prix Unit. (€)</div>
                            <div className="col-span-1"></div>
                        </div>

                        {/* Items List */}
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-12 gap-2 items-start group">
                                    <div className="col-span-6">
                                        <Textarea
                                            {...register(`items.${index}.description` as const, { required: true })}
                                            placeholder="Description de la prestation..."
                                            className="min-h-[40px] resize-none"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Input
                                            type="number"
                                            {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                                            className="text-right"
                                            step="0.1"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <Input
                                            type="number"
                                            {...register(`items.${index}.unit_price` as const, { valueAsNumber: true })}
                                            className="text-right"
                                            step="0.01"
                                        />
                                    </div>
                                    <div className="col-span-1 text-right">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="opacity-50 group-hover:opacity-100 hover:text-destructive">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 pt-4 border-t">
                        <div className="flex justify-between w-48 text-sm">
                            <span className="text-muted-foreground">Total HT:</span>
                            <span>{totalHT.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between w-48 text-sm">
                            <span className="text-muted-foreground">TVA (20%):</span>
                            <span>{tva.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between w-48 font-bold text-lg">
                            <span>Total TTC:</span>
                            <span className="text-primary">{totalTTC.toFixed(2)} €</span>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Créer le Devis
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

```


## File: src\components\reviews\ReviewsManager.tsx

```tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Mail, Send, Loader2, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

export function ReviewsManager({ companySettings }: { companySettings: any }) {
    const [isSending, setIsSending] = useState(false);

    // Fetch reviews with client names
    const { data: reviews = [], refetch, isLoading } = useQuery({
        queryKey: ["reviews"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("reviews")
                .select(`
                    *,
                    clients (
                        firstname,
                        lastname,
                        email
                    )
                `)
                .order("sent_at", { ascending: false });

            if (error) throw error;
            return data as any[]; // Cast to any because the nested join type is complex
        },
    });

    const handleSendRequest = async (reviewId: string) => {
        setIsSending(true);
        try {
            // Get review and client data
            const review = reviews.find(r => r.id === reviewId);
            if (!review) throw new Error("Review not found");

            const n8nConfig = companySettings?.n8n_config as any;
            const n8nBase = n8nConfig?.webhook_base || (import.meta as any).env.VITE_N8N_WEBHOOK_BASE;
            const n8nWebhookUrl = n8nBase ? n8nBase + (n8nConfig?.avis_webhook || '/demande-avis-client') : null;

            if (n8nWebhookUrl) {
                const payload = {
                    client_name: `${review.clients?.firstname} ${review.clients?.lastname}`,
                    client_email: review.clients?.email,
                    company_name: companySettings?.company_name || "AMG Rénovation",
                    review_id: review.id
                };

                const response = await fetch(n8nWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error("N8N Webhook failed");

                // Update status to pending if it was just created
                await (supabase.from('reviews') as any).update({ status: 'pending', sent_at: new Date().toISOString() }).eq('id', reviewId);

                toast.success("Demande d'avis envoyée !");
                refetch();
            } else {
                toast.warning("N8N non configuré pour les avis");
            }
        } catch (error: any) {
            console.error('Error sending review request:', error);
            toast.error("Erreur: " + error.message);
        } finally {
            setIsSending(false);
        }
    };

    const stats = {
        average: reviews.length > 0 ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.filter(r => r.rating).length || 0).toFixed(1) : 0,
        total: reviews.filter(r => r.status === 'received' || r.status === 'published').length,
        pending: reviews.filter(r => r.status === 'pending').length
    };

    const handleBulkFollowUp = async () => {
        setIsSending(true);
        try {
            // 1. Get all clients who have invoices
            const { data: invoices, error: invError } = await supabase
                .from('invoices')
                .select('client_id');

            if (invError) throw invError;

            const clientIdsWithInvoices = Array.from(new Set((invoices as any[]).map(i => i.client_id)));

            // 2. Filter clients who already have a review
            const { data: existingReviews, error: revError } = await supabase
                .from('reviews')
                .select('client_id');

            if (revError) throw revError;

            const clientIdsWithReviews = new Set((existingReviews as any[]).map(r => r.client_id));
            const targetClientIds = clientIdsWithInvoices.filter(id => !clientIdsWithReviews.has(id));

            if (targetClientIds.length === 0) {
                toast.info("Tous les clients avec factures ont déjà été sollicités.");
                return;
            }

            // 3. For each target client, create a review entry and send request
            let successCount = 0;
            for (const clientId of targetClientIds) {
                const { data: clientData, error: clientError } = await supabase.from('clients').select('*').eq('id', clientId).single();
                if (clientError || !clientData) continue;

                const client = clientData as any;

                // Create review entry
                const { data: newReviewData, error: createError } = await (supabase.from('reviews') as any).insert({
                    client_id: clientId,
                    status: 'pending',
                    sent_at: new Date().toISOString()
                }).select().single();

                if (createError || !newReviewData) continue;

                const newReview = newReviewData as any;

                // Send request via N8N
                const n8nConfig = companySettings?.n8n_config as any;
                const n8nBase = n8nConfig?.webhook_base || (import.meta as any).env.VITE_N8N_WEBHOOK_BASE;
                const n8nWebhookUrl = n8nBase ? n8nBase + (n8nConfig?.avis_webhook || '/demande-avis-client') : null;

                if (n8nWebhookUrl) {
                    await fetch(n8nWebhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            client_name: `${client.firstname} ${client.lastname}`,
                            client_email: client.email,
                            company_name: companySettings?.company_name || "AMG Rénovation",
                            review_id: newReview.id
                        })
                    });
                    successCount++;
                }
            }

            toast.success(`${successCount} demandes d'avis envoyées !`);
            refetch();
        } catch (error: any) {
            console.error('Error in bulk follow-up:', error);
            toast.error("Erreur: " + error.message);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-foreground">Avis Clients</h2>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                        onClick={handleBulkFollowUp}
                        disabled={isSending}
                    >
                        {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Relancer les factures
                    </Button>
                    <Button variant="outline" onClick={() => refetch()}>Actualiser</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Note Moyenne</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <div className="text-3xl font-bold">{stats.average}</div>
                            <div className="flex text-yellow-500">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-4 h-4 ${i < Math.round(Number(stats.average)) ? "fill-current" : ""}`} />
                                ))}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Basé sur {reviews.filter(r => r.rating).length} avis</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avis Reçus</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">{stats.total}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total des avis collectés</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">En attente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-orange-500">{stats.pending}</div>
                        <p className="text-xs text-muted-foreground mt-1">Demandes envoyées sans réponse</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historique des demandes</CardTitle>
                    <CardDescription>Suivez l'état des demandes d'avis envoyées à vos clients.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-12 text-center text-muted-foreground">
                            <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />
                            <p>Chargement des avis...</p>
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">
                            <Star className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Aucun avis ou demande pour le moment.</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {reviews.map((review: any) => (
                                <div key={review.id} className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full ${review.status === 'received' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {review.status === 'received' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="font-bold">
                                                {review.clients?.firstname} {review.clients?.lastname}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Envoyé le {new Date(review.sent_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                        {review.status === 'received' ? (
                                            <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                                <span className="font-bold text-yellow-700">{review.rating}/5</span>
                                            </div>
                                        ) : (
                                            <Badge variant="outline" className="px-3 py-1 bg-orange-50 text-orange-700 border-orange-200">
                                                En attente
                                            </Badge>
                                        )}

                                        <div className="flex gap-2">
                                            {review.status !== 'received' && (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handleSendRequest(review.id)}
                                                    disabled={isSending}
                                                >
                                                    <Send className="w-4 h-4 mr-2" /> Relancer
                                                </Button>
                                            )}
                                            <Button size="sm" variant="ghost" title="Voir l'email">
                                                <Mail className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

```


## File: src\components\ThemeToggle.tsx

```tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
    const [theme, setTheme] = useState<"light" | "dark">(() => {
        return (localStorage.getItem("theme") as "light" | "dark") || "light";
    });

    useEffect(() => {
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
        localStorage.setItem("theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(theme === "light" ? "dark" : "light");
    };

    return (
        <Button
            variant="outline"
            size="icon"
            className="rounded-full bg-background"
            onClick={toggleTheme}
            title="Changer de thème"
        >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Changer de thème</span>
        </Button>
    );
}

```


## File: src\components\ui\badge.tsx

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
                secondary:
                    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive:
                    "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
                outline: "text-foreground",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }

```


## File: src\components\ui\button.tsx

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:bg-primary/90",
                destructive:
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                outline:
                    "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                ghost: "hover:bg-accent hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 rounded-md px-3",
                lg: "h-11 rounded-md px-8",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }

```


## File: src\components\ui\calendar.tsx

```tsx
import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background group/calendar p-3 [--cell-size:2rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-[--cell-size] w-[--cell-size] select-none p-0 aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-[--cell-size] w-[--cell-size] select-none p-0 aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-[--cell-size] w-full items-center justify-center px-[--cell-size]",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-[--cell-size] w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "has-focus:border-ring border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] relative rounded-md border",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "bg-popover absolute inset-0 opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label"
            ? "text-sm"
            : "[&>svg]:text-muted-foreground flex h-8 items-center gap-1 rounded-md pl-2 pr-1 text-sm [&>svg]:size-3.5",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground flex-1 select-none rounded-md text-[0.8rem] font-normal",
          defaultClassNames.weekday
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-[--cell-size] select-none",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-muted-foreground select-none text-[0.8rem]",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full select-none p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md",
          defaultClassNames.day
        ),
        range_start: cn(
          "bg-accent rounded-l-md",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("bg-accent rounded-r-md", defaultClassNames.range_end),
        today: cn(
          "bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-[--cell-size] items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 flex aspect-square h-auto w-full min-w-[--cell-size] flex-col gap-1 font-normal leading-none data-[range-end=true]:rounded-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }

```


## File: src\components\ui\card.tsx

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "rounded-lg border bg-card text-card-foreground shadow-sm",
            className
        )}
        {...props}
    />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 p-6", className)}
        {...props}
    />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "text-2xl font-semibold leading-none tracking-tight",
            className
        )}
        {...props}
    />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex items-center p-6 pt-0", className)}
        {...props}
    />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

```


## File: src\components\ui\dialog.tsx

```tsx
import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
            "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            className
        )}
        {...props}
    />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
    <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
            ref={ref}
            className={cn(
                "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
                className
            )}
            {...props}
        >
            {children}
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
        </DialogPrimitive.Content>
    </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col space-y-1.5 text-center sm:text-left",
            className
        )}
        {...props}
    />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
            className
        )}
        {...props}
    />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Title
        ref={ref}
        className={cn(
            "text-lg font-semibold leading-none tracking-tight",
            className
        )}
        {...props}
    />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Description
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
    Dialog,
    DialogPortal,
    DialogOverlay,
    DialogClose,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
}

```


## File: src\components\ui\input.tsx

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input }

```


## File: src\components\ui\label.tsx

```tsx
import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
    "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
    React.ElementRef<typeof LabelPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
    <LabelPrimitive.Root
        ref={ref}
        className={cn(labelVariants(), className)}
        {...props}
    />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }

```


## File: src\components\ui\scroll-area.tsx

```tsx
import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
    React.ElementRef<typeof ScrollAreaPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
    <ScrollAreaPrimitive.Root
        ref={ref}
        className={cn("relative overflow-hidden", className)}
        {...props}
    >
        <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
            {children}
        </ScrollAreaPrimitive.Viewport>
        <ScrollBar />
        <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
    React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
    React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
        ref={ref}
        orientation={orientation}
        className={cn(
            "flex touch-none select-none transition-colors",
            orientation === "vertical" &&
            "h-full w-2.5 border-l border-l-transparent p-[1px]",
            orientation === "horizontal" &&
            "h-2.5 flex-col border-t border-t-transparent p-[1px]",
            className
        )}
        {...props}
    >
        <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }

```


## File: src\components\ui\select.tsx

```tsx
import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
    <SelectPrimitive.Trigger
        ref={ref}
        className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
            className
        )}
        {...props}
    >
        {children}
        <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-4 w-4 opacity-50" />
        </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
    <SelectPrimitive.ScrollUpButton
        ref={ref}
        className={cn(
            "flex cursor-default items-center justify-center py-1",
            className
        )}
        {...props}
    >
        <ChevronUp className="h-4 w-4" />
    </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
    <SelectPrimitive.ScrollDownButton
        ref={ref}
        className={cn(
            "flex cursor-default items-center justify-center py-1",
            className
        )}
        {...props}
    >
        <ChevronDown className="h-4 w-4" />
    </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
    SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
    <SelectPrimitive.Portal>
        <SelectPrimitive.Content
            ref={ref}
            className={cn(
                "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                position === "popper" &&
                "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
                className
            )}
            position={position}
            {...props}
        >
            <SelectScrollUpButton />
            <SelectPrimitive.Viewport
                className={cn(
                    "p-1",
                    position === "popper" &&
                    "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
                )}
            >
                {children}
            </SelectPrimitive.Viewport>
            <SelectScrollDownButton />
        </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Label>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
    <SelectPrimitive.Label
        ref={ref}
        className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
        {...props}
    />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item
        ref={ref}
        className={cn(
            "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
            className
        )}
        {...props}
    >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            <SelectPrimitive.ItemIndicator>
                <Check className="h-4 w-4" />
            </SelectPrimitive.ItemIndicator>
        </span>

        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
    React.ElementRef<typeof SelectPrimitive.Separator>,
    React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
    <SelectPrimitive.Separator
        ref={ref}
        className={cn("-mx-1 my-1 h-px bg-muted", className)}
        {...props}
    />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
    Select,
    SelectGroup,
    SelectValue,
    SelectTrigger,
    SelectContent,
    SelectLabel,
    SelectItem,
    SelectSeparator,
    SelectScrollUpButton,
    SelectScrollDownButton,
}

```


## File: src\components\ui\sonner.tsx

```tsx
import * as React from "react"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast:
                        "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
                    description: "group-[.toast]:text-muted-foreground",
                    actionButton:
                        "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                    cancelButton:
                        "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                },
            }}
            {...props}
        />
    )
}

export { Toaster }

```


## File: src\components\ui\tabs.tsx

```tsx
import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.List>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
    <TabsPrimitive.List
        ref={ref}
        className={cn(
            "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
            className
        )}
        {...props}
    />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
        ref={ref}
        className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
            className
        )}
        {...props}
    />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
    <TabsPrimitive.Content
        ref={ref}
        className={cn(
            "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className
        )}
        {...props}
    />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }

```


## File: src\components\ui\textarea.tsx

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Textarea.displayName = "Textarea"

export { Textarea }

```


## File: src\components\ui\toast.tsx

```tsx
import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Viewport>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Viewport
        ref={ref}
        className={cn(
            "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
            className
        )}
        {...props}
    />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
    "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
    {
        variants: {
            variant: {
                default: "border bg-background text-foreground",
                destructive:
                    "destructive group border-destructive bg-destructive text-destructive-foreground",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

const Toast = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Root>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
    return (
        <ToastPrimitives.Root
            ref={ref}
            className={cn(toastVariants({ variant }), className)}
            {...props}
        />
    )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Action>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Action
        ref={ref}
        className={cn(
            "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
            className
        )}
        {...props}
    />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Close>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Close
        ref={ref}
        className={cn(
            "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
            className
        )}
        toast-close=""
        {...props}
    >
        <X className="h-4 w-4" />
    </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Title>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Title
        ref={ref}
        className={cn("text-sm font-semibold", className)}
        {...props}
    />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Description>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Description
        ref={ref}
        className={cn("text-sm opacity-90", className)}
        {...props}
    />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
    type ToastProps,
    type ToastActionElement,
    ToastProvider,
    ToastViewport,
    Toast,
    ToastTitle,
    ToastDescription,
    ToastClose,
    ToastAction,
}

```


## File: src\components\ui\toaster.tsx

```tsx
import { useToast } from "@/hooks/use-toast"
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"

export function Toaster() {
    const { toasts } = useToast()

    return (
        <ToastProvider>
            {toasts.map(function ({ id, title, description, action, ...props }) {
                return (
                    <Toast key={id} {...props}>
                        <div className="grid gap-1">
                            {title && <ToastTitle>{title}</ToastTitle>}
                            {description && (
                                <ToastDescription>{description}</ToastDescription>
                            )}
                        </div>
                        {action}
                        <ToastClose />
                    </Toast>
                )
            })}
            <ToastViewport />
        </ToastProvider>
    )
}

```


## File: src\components\ui\tooltip.tsx

```tsx
import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
    React.ElementRef<typeof TooltipPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
    <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
            "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            className
        )}
        {...props}
    />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }

```


## File: src\components\voice\VoiceCommander.tsx

```tsx
import { useState, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VoiceCommanderProps {
    onCommand: (command: string) => void;
}

export function VoiceCommander({ onCommand }: VoiceCommanderProps) {
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recog = new SpeechRecognition();
            recog.continuous = false;
            recog.interimResults = false;
            recog.lang = 'fr-FR';

            recog.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript.toLowerCase();
                console.log("Voice Command:", transcript);
                processCommand(transcript);
                setIsListening(false);
            };

            recog.onerror = (event: any) => {
                console.error("Speech Recognition Error:", event.error);
                setIsListening(false);
                if (event.error === 'not-allowed') {
                    toast.error("Microphone non autorisé");
                }
            };

            recog.onend = () => {
                setIsListening(false);
            };

            setRecognition(recog);
        }
    }, [onCommand]);

    const processCommand = (text: string) => {
        toast.info(`Commande reçue: "${text}"`);

        // Simple mapping
        if (text.includes("tableau de bord") || text.includes("dashboard")) onCommand("dashboard");
        else if (text.includes("whatsapp") || text.includes("message")) onCommand("whatsapp");
        else if (text.includes("devis")) onCommand("devis");
        else if (text.includes("facture")) onCommand("factures");
        else if (text.includes("avis")) onCommand("avis");
        else if (text.includes("ia") || text.includes("image")) onCommand("ia");
        else if (text.includes("opportunité") || text.includes("leads")) onCommand("allovoisin");
        else if (text.includes("prospection")) onCommand("prospection");
        else if (text.includes("fichier")) onCommand("fichiers");
        else if (text.includes("paramètre")) onCommand("parametres");
        else if (text.includes("rendez-vous") || text.includes("rdv")) onCommand("rdv");
    };

    const toggleListening = () => {
        if (!recognition) {
            toast.error("Votre navigateur ne supporte pas la reconnaissance vocale.");
            return;
        }

        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
            setIsListening(true);
            toast("Écoute en cours...", { icon: <Mic className="w-4 h-4 text-primary animate-pulse" /> });
        }
    };

    return (
        <Button
            variant={isListening ? "default" : "outline"}
            size="icon"
            className={`rounded-full transition-all ${isListening ? 'ring-4 ring-primary/20 scale-110' : ''}`}
            onClick={toggleListening}
            title="Commande Vocale (Français)"
        >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </Button>
    );
}

```


## File: src\hooks\use-toast.ts

```ts
import * as React from "react"

import type { ToastActionElement, ToastProps } from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
    id: string
    title?: React.ReactNode
    description?: React.ReactNode
    action?: ToastActionElement
}

const actionTypes = {
    ADD_TOAST: "ADD_TOAST",
    UPDATE_TOAST: "UPDATE_TOAST",
    DISMISS_TOAST: "DISMISS_TOAST",
    REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
    count = (count + 1) % Number.MAX_SAFE_INTEGER
    return count.toString()
}

type ActionType = typeof actionTypes

type Action =
    | {
        type: ActionType["ADD_TOAST"]
        toast: ToasterToast
    }
    | {
        type: ActionType["UPDATE_TOAST"]
        toast: Partial<ToasterToast>
    }
    | {
        type: ActionType["DISMISS_TOAST"]
        toastId?: ToasterToast["id"]
    }
    | {
        type: ActionType["REMOVE_TOAST"]
        toastId?: ToasterToast["id"]
    }

interface State {
    toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
    if (toastTimeouts.has(toastId)) {
        return
    }

    const timeout = setTimeout(() => {
        toastTimeouts.delete(toastId)
        dispatch({
            type: "REMOVE_TOAST",
            toastId: toastId,
        })
    }, TOAST_REMOVE_DELAY)

    toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case "ADD_TOAST":
            return {
                ...state,
                toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
            }

        case "UPDATE_TOAST":
            return {
                ...state,
                toasts: state.toasts.map((t) =>
                    t.id === action.toast.id ? { ...t, ...action.toast } : t
                ),
            }

        case "DISMISS_TOAST": {
            const { toastId } = action

            if (toastId) {
                addToRemoveQueue(toastId)
            } else {
                state.toasts.forEach((toast) => {
                    addToRemoveQueue(toast.id)
                })
            }

            return {
                ...state,
                toasts: state.toasts.map((t) =>
                    t.id === toastId || toastId === undefined
                        ? {
                            ...t,
                            open: false,
                        }
                        : t
                ),
            }
        }
        case "REMOVE_TOAST":
            if (action.toastId === undefined) {
                return {
                    ...state,
                    toasts: [],
                }
            }
            return {
                ...state,
                toasts: state.toasts.filter((t) => t.id !== action.toastId),
            }
    }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
    memoryState = reducer(memoryState, action)
    listeners.forEach((listener) => {
        listener(memoryState)
    })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
    const id = genId()

    const update = (props: ToasterToast) =>
        dispatch({
            type: "UPDATE_TOAST",
            toast: { ...props, id },
        })
    const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

    dispatch({
        type: "ADD_TOAST",
        toast: {
            ...props,
            id,
            open: true,
            onOpenChange: (open) => {
                if (!open) dismiss()
            },
        },
    })

    return {
        id: id,
        dismiss,
        update,
    }
}

function useToast() {
    const [state, setState] = React.useState<State>(memoryState)

    React.useEffect(() => {
        listeners.push(setState)
        return () => {
            const index = listeners.indexOf(setState)
            if (index > -1) {
                listeners.splice(index, 1)
            }
        }
    }, [state])

    return {
        ...state,
        toast,
        dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
    }
}

export { useToast, toast }

```


## File: src\hooks\useLocalStorage.ts

```ts
import { useState, useEffect, useCallback } from "react";

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch {
            return initialValue;
        }
    });

    const setValue = useCallback((value: T | ((prev: T) => T)) => {
        setStoredValue(prev => {
            const valueToStore = value instanceof Function ? value(prev) : value;
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
            return valueToStore;
        });
    }, [key]);

    // Sync across tabs
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === key && e.newValue) {
                setStoredValue(JSON.parse(e.newValue));
            }
        };
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, [key]);

    return [storedValue, setValue];
}

```


## File: src\index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* AMG Rénovation Design System - Modern, Professional, Dynamic */

@layer base {
    :root {
        /* Core palette - Professional blue for renovation business */
        --background: 210 20% 99%;
        --foreground: 215 25% 15%;

        --card: 0 0% 100%;
        --card-foreground: 215 25% 15%;

        --popover: 0 0% 100%;
        --popover-foreground: 215 25% 15%;

        /* Primary - Professional blue */
        --primary: 215 75% 45%;
        --primary-foreground: 0 0% 100%;

        /* Secondary - Light gray */
        --secondary: 210 20% 95%;
        --secondary-foreground: 215 75% 35%;

        /* Muted - Light gray with blue tint */
        --muted: 210 15% 95%;
        --muted-foreground: 215 15% 45%;

        /* Accent - Orange for CTAs */
        --accent: 25 90% 55%;
        --accent-foreground: 0 0% 100%;

        /* Status colors */
        --success: 142 70% 45%;
        --success-foreground: 0 0% 100%;

        --warning: 38 95% 55%;
        --warning-foreground: 38 95% 20%;

        --destructive: 0 72% 55%;
        --destructive-foreground: 0 0% 100%;

        --border: 210 15% 90%;
        --input: 210 15% 90%;
        --ring: 215 75% 45%;

        --radius: 0.75rem;

        /* Custom gradients */
        --gradient-hero: linear-gradient(135deg, hsl(215 75% 45%) 0%, hsl(220 70% 55%) 50%, hsl(210 65% 50%) 100%);
        --gradient-card: linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(210 20% 98%) 100%);
        --gradient-accent: linear-gradient(135deg, hsl(25 90% 55%) 0%, hsl(30 85% 50%) 100%);
        --gradient-magic: linear-gradient(135deg, hsl(270 70% 60%) 0%, hsl(240 75% 55%) 100%);

        /* Shadows */
        --shadow-soft: 0 2px 8px -2px hsl(215 25% 15% / 0.08);
        --shadow-card: 0 4px 20px -4px hsl(215 25% 15% / 0.1);
        --shadow-elevated: 0 8px 30px -6px hsl(215 25% 15% / 0.15);
        --shadow-glow: 0 0 40px -10px hsl(215 75% 45% / 0.3);
    }

    .dark {
        --background: 215 25% 8%;
        --foreground: 210 15% 95%;

        --card: 215 25% 10%;
        --card-foreground: 210 15% 95%;

        --popover: 215 25% 10%;
        --popover-foreground: 210 15% 95%;

        --primary: 215 70% 55%;
        --primary-foreground: 215 25% 8%;

        --secondary: 215 25% 15%;
        --secondary-foreground: 215 70% 55%;

        --muted: 215 25% 15%;
        --muted-foreground: 210 15% 65%;

        --accent: 25 85% 50%;
        --accent-foreground: 0 0% 100%;

        --success: 142 65% 45%;
        --success-foreground: 0 0% 100%;

        --warning: 38 90% 50%;
        --warning-foreground: 38 95% 10%;

        --destructive: 0 65% 50%;
        --destructive-foreground: 0 0% 100%;

        --border: 215 25% 18%;
        --input: 215 25% 18%;
        --ring: 215 70% 55%;
    }
}

@layer base {
    * {
        @apply border-border;
    }

    body {
        @apply bg-background text-foreground antialiased;
        font-feature-settings: "rlig" 1, "calt" 1;
    }
}

@layer utilities {
    .shadow-card {
        box-shadow: var(--shadow-card);
    }

    .shadow-soft {
        box-shadow: var(--shadow-soft);
    }

    .shadow-elevated {
        box-shadow: var(--shadow-elevated);
    }

    .shadow-glow {
        box-shadow: var(--shadow-glow);
    }

    .gradient-hero {
        background: var(--gradient-hero);
    }

    .gradient-card {
        background: var(--gradient-card);
    }

    .gradient-accent {
        background: var(--gradient-accent);
    }

    .gradient-magic {
        background: var(--gradient-magic);
    }

    .text-gradient {
        background: var(--gradient-hero);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }

    .animate-in {
        animation: fadeIn 0.3s ease-in;
    }

    .slide-in-from-right {
        animation: slideInRight 0.3s ease-out;
    }

    .slide-in-from-bottom-5 {
        animation: slideInBottom 0.3s ease-out;
    }

    .fade-in {
        animation: fadeIn 0.5s ease-in;
    }

    .fade-in-up {
        animation: fadeInUp 0.6s ease-out;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }

        to {
            opacity: 1;
        }
    }

    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }

        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes slideInRight {
        from {
            transform: translateX(100%);
        }

        to {
            transform: translateX(0);
        }
    }

    @keyframes slideInBottom {
        from {
            transform: translateY(100%);
        }

        to {
            transform: translateY(0);
        }
    }
}
```


## File: src\integrations\supabase\client.ts

```ts
// localStorage-backed Supabase client mock
// All data persists in the browser's localStorage

function generateId(): string {
    return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9);
}

function getTable(table: string): any[] {
    try {
        const raw = localStorage.getItem(`amg_${table}`);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function setTable(table: string, data: any[]): void {
    localStorage.setItem(`amg_${table}`, JSON.stringify(data));
}

// Seed demo data if empty
function seedIfEmpty() {
    if (getTable('clients').length === 0) {
        setTable('clients', [
            { id: generateId(), firstname: "Jean", lastname: "Dupont", email: "jean.dupont@email.com", phone: "+33 6 12 34 56 78", created_at: new Date().toISOString() },
            { id: generateId(), firstname: "Marie", lastname: "Curie", email: "marie.curie@email.com", phone: "+33 6 98 76 54 32", created_at: new Date().toISOString() },
            { id: generateId(), firstname: "Pierre", lastname: "Martin", email: "pierre.martin@email.com", phone: "+33 7 11 22 33 44", created_at: new Date().toISOString() },
        ]);
    }
    if (getTable('quotes').length === 0) {
        const clients = getTable('clients');
        setTable('quotes', [
            { id: generateId(), quote_number: "D-2024-001", total_ht: 3750, total_ttc: 4500, status: "sent", created_at: new Date().toISOString(), client_id: clients[0]?.id, items: [{ description: "Rénovation salle de bain complète", quantity: 1, unit_price: 3750 }], clients: { firstname: clients[0]?.firstname, lastname: clients[0]?.lastname, email: clients[0]?.email } },
            { id: generateId(), quote_number: "D-2024-002", total_ht: 1000, total_ttc: 1200, status: "draft", created_at: new Date(Date.now() - 86400000).toISOString(), client_id: clients[1]?.id, items: [{ description: "Peinture salon", quantity: 1, unit_price: 1000 }], clients: { firstname: clients[1]?.firstname, lastname: clients[1]?.lastname, email: clients[1]?.email } }
        ]);
    }
    if (getTable('invoices').length === 0) {
        const clients = getTable('clients');
        setTable('invoices', [
            { id: generateId(), invoice_number: "F-2024-001", total_ht: 3750, total_ttc: 4500, status: "pending", created_at: new Date().toISOString(), client_id: clients[0]?.id, items: [{ description: "Rénovation salle de bain complète", quantity: 1, unit_price: 3750 }], clients: { firstname: clients[0]?.firstname, lastname: clients[0]?.lastname } }
        ]);
    }
    if (getTable('appointments').length === 0) {
        const clients = getTable('clients');
        const today = new Date();
        setTable('appointments', [
            { id: generateId(), client_name: `${clients[0]?.firstname} ${clients[0]?.lastname}`, phone_number: clients[0]?.phone, appointment_date: today.toISOString(), appointment_type: "Visite technique", status: "confirmed", notes: "Salle de bain - 2ème étage" },
            { id: generateId(), client_name: `${clients[1]?.firstname} ${clients[1]?.lastname}`, phone_number: clients[1]?.phone, appointment_date: today.toISOString(), appointment_type: "Devis sur place", status: "pending", notes: "Rénovation cuisine" },
        ]);
    }
    if (getTable('whatsapp_messages').length === 0) {
        setTable('whatsapp_messages', [
            { id: generateId(), sender: "user", phone_number: "+33 6 12 34 56 78", message_content: "Bonjour, j'aimerais un devis pour une rénovation de salle de bain.", received_at: new Date().toISOString() },
            { id: generateId(), sender: "assistant", phone_number: "+33 6 12 34 56 78", message_content: "Bonjour ! Bien sûr, quelle est la surface de la salle de bain ?", received_at: new Date(Date.now() - 1000 * 60).toISOString() },
        ]);
    }
    if (getTable('reviews').length === 0) {
        const clients = getTable('clients');
        setTable('reviews', [
            { id: generateId(), client_id: clients[0]?.id, status: "received", rating: 5, sent_at: new Date(Date.now() - 86400000 * 10).toISOString(), comment: "Travail impeccable, très professionnel !", clients: { firstname: clients[0]?.firstname, lastname: clients[0]?.lastname, email: clients[0]?.email } },
            { id: generateId(), client_id: clients[1]?.id, status: "received", rating: 4, sent_at: new Date(Date.now() - 86400000 * 5).toISOString(), comment: "Bon travail dans l'ensemble, délai respecté.", clients: { firstname: clients[1]?.firstname, lastname: clients[1]?.lastname, email: clients[1]?.email } },
            { id: generateId(), client_id: clients[2]?.id, status: "pending", rating: null, sent_at: new Date(Date.now() - 86400000 * 2).toISOString(), comment: null, clients: { firstname: clients[2]?.firstname, lastname: clients[2]?.lastname, email: clients[2]?.email } },
        ]);
    }
    if (getTable('facebook_prospects').length === 0) {
        setTable('facebook_prospects', [
            { id: generateId(), author_name: "Sophie Lemaire", post_content: "Bonjour, je cherche un artisan pour rénover ma cuisine à Paris 15ème. Budget environ 8000€. Quelqu'un a une recommandation ?", post_url: "https://facebook.com/groups/renovation/post1", scraped_at: new Date().toISOString(), status: "new", analysis_result: "High relevance — Kitchen renovation, good budget" },
            { id: generateId(), author_name: "Michel Berger", post_content: "Besoin d'un plombier pour refaire la salle de bain dans mon appart à Boulogne. Devis SVP.", post_url: "https://facebook.com/groups/renovation/post2", scraped_at: new Date(Date.now() - 86400000).toISOString(), status: "qualified", analysis_result: "Medium — Bathroom plumbing, local area" },
            { id: generateId(), author_name: "Claire Fontaine", post_content: "Qui connaît un bon peintre pour un appartement 3 pièces à Neuilly ? Merci !", post_url: "https://facebook.com/groups/renovation/post3", scraped_at: new Date(Date.now() - 86400000 * 2).toISOString(), status: "new", analysis_result: "Medium relevance — Painting job, premium area" },
            { id: generateId(), author_name: "Julien Roche", post_content: "Rénovation complète d'une maison 120m² à Vincennes. Cherche entreprise sérieuse, budget 45000€.", post_url: "https://facebook.com/groups/renovation/post4", scraped_at: new Date(Date.now() - 86400000 * 3).toISOString(), status: "contacted", analysis_result: "Excellent — Full renovation, large budget, nearby" },
        ]);
    }
    if (getTable('allovoisin_leads').length === 0) {
        setTable('allovoisin_leads', [
            { id: generateId(), client_name: "Famille Moreau", project_type: "Rénovation salle de bain", city: "Paris 12ème", postal_code: "75012", estimated_price_min: 5000, estimated_price_max: 8000, distance_km: 5, status: "pending", email_date: new Date().toISOString(), original_link: "https://allovoisin.com/mission/12345" },
            { id: generateId(), client_name: "M. Laurent", project_type: "Peinture appartement 60m²", city: "Boulogne-Billancourt", postal_code: "92100", estimated_price_min: 2000, estimated_price_max: 3500, distance_km: 8, status: "interested", email_date: new Date(Date.now() - 86400000).toISOString(), original_link: "https://allovoisin.com/mission/12346" },
            { id: generateId(), client_name: "Mme Petit", project_type: "Carrelage cuisine + crédence", city: "Vincennes", postal_code: "94300", estimated_price_min: 1500, estimated_price_max: 2500, distance_km: 3, status: "pending", email_date: new Date(Date.now() - 86400000 * 2).toISOString(), original_link: "https://allovoisin.com/mission/12347" },
        ]);
    }
    if (getTable('company_files').length === 0) {
        const clients = getTable('clients');
        setTable('company_files', [
            { id: generateId(), file_name: "Devis-D2024-001.pdf", file_url: "#", category: "devis", uploaded_at: new Date().toISOString(), client_id: clients[0]?.id, clients: { firstname: clients[0]?.firstname, lastname: clients[0]?.lastname } },
            { id: generateId(), file_name: "Facture-F2024-001.pdf", file_url: "#", category: "facture", uploaded_at: new Date(Date.now() - 86400000).toISOString(), client_id: clients[0]?.id, clients: { firstname: clients[0]?.firstname, lastname: clients[0]?.lastname } },
            { id: generateId(), file_name: "Photo-SDB-avant.jpg", file_url: "#", category: "photo", uploaded_at: new Date(Date.now() - 86400000 * 3).toISOString(), client_id: clients[1]?.id, clients: { firstname: clients[1]?.firstname, lastname: clients[1]?.lastname } },
            { id: generateId(), file_name: "Attestation-assurance-2024.pdf", file_url: "#", category: "other", uploaded_at: new Date(Date.now() - 86400000 * 7).toISOString(), client_id: null, clients: null },
        ]);
    }
    if (getTable('company_settings').length === 0) {
        setTable('company_settings', [
            { id: generateId(), company_name: "AMG Rénovation", email: "contact@amg-renovation.fr", phone: "+33 6 12 34 56 78", address: "15 Rue de la Rénovation, 75012 Paris", siret: "123 456 789 00012", tva_number: "FR12345678901", n8n_config: { webhook_base: "https://app.n8nproagentvocal.com/webhook", devis_webhook: "/generer-devis", facture_webhook: "/envoi-facture", avis_webhook: "/demande-avis-client", ia_webhook: "/visualisation-ia", allovoisin_webhook: "/allovoisin-leads", facebook_webhook: "/facebook-prospects" } }
        ]);
    }
    if (getTable('facebook_posts').length === 0) {
        setTable('facebook_posts', [
            { id: generateId(), caption: "🏠✨ Nouvelle réalisation ! Rénovation complète d'une salle de bain à Paris 12ème. Carrelage, plomberie, peinture — tout a été repensé pour un résultat moderne et fonctionnel. #AMGRénovation #SalleDeBain #Rénovation", image_url: null, scheduled_at: null, status: "published", created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
            { id: generateId(), caption: "🎨 Avant / Après — Peinture complète d'un salon 35m² à Boulogne. Couleurs modernes, finitions soignées. Contactez-nous pour un devis gratuit ! 📞", image_url: null, scheduled_at: new Date(Date.now() + 86400000 * 2).toISOString(), status: "scheduled", created_at: new Date(Date.now() - 86400000).toISOString() },
        ]);
    }
}

seedIfEmpty();

// Chainable query builder that mimics Supabase's API
class QueryBuilder {
    private table: string;
    private operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
    private payload: any = null;
    private filters: Array<{ column: string; value: any }> = [];
    private orderColumn: string | null = null;
    private orderAsc = true;
    private limitCount: number | null = null;
    private selectColumns = '*';
    private isSingle = false;
    private isMaybeSingle = false;
    private returnData = false;

    constructor(table: string) {
        this.table = table;
    }

    select(columns = '*') {
        // If called after insert/update/upsert, don't change the operation
        // Just flag that we want data returned (Supabase's .insert().select() pattern)
        if (this.operation === 'insert' || this.operation === 'update' || this.operation === 'upsert') {
            this.returnData = true;
            this.selectColumns = columns;
            return this;
        }
        this.operation = 'select';
        this.selectColumns = columns;
        return this;
    }

    insert(data: any) {
        this.operation = 'insert';
        this.payload = Array.isArray(data) ? data : [data];
        return this;
    }

    update(data: any) {
        this.operation = 'update';
        this.payload = data;
        return this;
    }

    delete() {
        this.operation = 'delete';
        return this;
    }

    upsert(data: any) {
        this.operation = 'upsert';
        this.payload = Array.isArray(data) ? data : [data];
        return this;
    }

    eq(column: string, value: any) {
        this.filters.push({ column, value });
        return this;
    }

    order(column: string, opts?: { ascending?: boolean }) {
        this.orderColumn = column;
        this.orderAsc = opts?.ascending !== false;
        return this;
    }

    limit(count: number) {
        this.limitCount = count;
        return this;
    }

    single() {
        this.isSingle = true;
        return this.execute();
    }

    maybeSingle() {
        this.isMaybeSingle = true;
        return this.execute();
    }

    // Auto-execute when awaited via then()
    then(resolve: (value: any) => void, reject?: (reason?: any) => void) {
        return this.execute().then(resolve, reject);
    }

    private execute(): Promise<{ data: any; error: any }> {
        try {
            let records = getTable(this.table);

            switch (this.operation) {
                case 'select': {
                    // Apply filters
                    for (const f of this.filters) {
                        records = records.filter(r => r[f.column] === f.value);
                    }
                    // Apply order
                    if (this.orderColumn) {
                        const col = this.orderColumn;
                        const asc = this.orderAsc;
                        records.sort((a, b) => {
                            if (a[col] < b[col]) return asc ? -1 : 1;
                            if (a[col] > b[col]) return asc ? 1 : -1;
                            return 0;
                        });
                    }
                    // Apply limit
                    if (this.limitCount !== null) {
                        records = records.slice(0, this.limitCount);
                    }
                    if (this.isSingle) {
                        return Promise.resolve({ data: records[0] || null, error: records.length === 0 ? { message: 'No rows found' } : null });
                    }
                    if (this.isMaybeSingle) {
                        return Promise.resolve({ data: records[0] || null, error: null });
                    }
                    return Promise.resolve({ data: records, error: null });
                }

                case 'insert': {
                    const newRecords = this.payload.map((item: any) => ({
                        ...item,
                        id: item.id || generateId(),
                        created_at: item.created_at || new Date().toISOString(),
                    }));
                    const all = [...records, ...newRecords];
                    setTable(this.table, all);

                    // If chained with .select(), return the inserted data
                    if (this.isSingle) {
                        return Promise.resolve({ data: newRecords[0], error: null });
                    }
                    return Promise.resolve({ data: newRecords, error: null });
                }

                case 'update': {
                    let updated: any = null;
                    const updatedRecords = records.map(r => {
                        const matches = this.filters.every(f => r[f.column] === f.value);
                        if (matches) {
                            updated = { ...r, ...this.payload };
                            return updated;
                        }
                        return r;
                    });
                    setTable(this.table, updatedRecords);
                    return Promise.resolve({ data: updated, error: null });
                }

                case 'delete': {
                    const filtered = records.filter(r =>
                        !this.filters.every(f => r[f.column] === f.value)
                    );
                    setTable(this.table, filtered);
                    return Promise.resolve({ data: null, error: null });
                }

                case 'upsert': {
                    const currentRecords = [...records];
                    for (const item of this.payload) {
                        const idx = currentRecords.findIndex(r => r.id === item.id);
                        if (idx >= 0) {
                            currentRecords[idx] = { ...currentRecords[idx], ...item };
                        } else {
                            currentRecords.push({ ...item, id: item.id || generateId(), created_at: new Date().toISOString() });
                        }
                    }
                    setTable(this.table, currentRecords);
                    return Promise.resolve({ data: this.payload, error: null });
                }

                default:
                    return Promise.resolve({ data: null, error: null });
            }
        } catch (err: any) {
            return Promise.resolve({ data: null, error: { message: err.message } });
        }
    }
}

export const supabase = {
    from: (table: string) => new QueryBuilder(table),
    auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
        signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
        signOut: () => Promise.resolve({ error: null })
    },
    storage: {
        from: () => ({
            upload: () => Promise.resolve({ data: null, error: null }),
            getPublicUrl: () => ({ data: { publicUrl: "" } }),
            list: () => Promise.resolve({ data: [], error: null }),
        })
    }
} as any;

```


## File: src\integrations\supabase\types.ts

```ts
// Database types for Supabase tables
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            company_settings: {
                Row: {
                    id: string
                    company_name: string
                    company_address: string | null
                    company_phone: string | null
                    company_email: string | null
                    working_hours: string | null
                    services: string[] | null
                    about_company: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['company_settings']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Database['public']['Tables']['company_settings']['Insert']>
            }
            clients: {
                Row: {
                    id: string
                    firstname: string
                    lastname: string
                    email: string | null
                    phone: string | null
                    address: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Database['public']['Tables']['clients']['Insert']>
            }
            whatsapp_messages: {
                Row: {
                    id: string
                    phone_number: string
                    sender: 'user' | 'assistant'
                    message_content: string
                    received_at: string
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['whatsapp_messages']['Row'], 'id' | 'created_at'>
                Update: Partial<Database['public']['Tables']['whatsapp_messages']['Insert']>
            }
            appointments: {
                Row: {
                    id: string
                    client_name: string
                    phone_number: string
                    appointment_date: string | null
                    appointment_type: string | null
                    status: 'pending' | 'confirmed' | 'cancelled'
                    notes: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['appointments']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Database['public']['Tables']['appointments']['Insert']>
            }
            quotes: {
                Row: {
                    id: string
                    client_id: string
                    quote_number: string
                    total_ht: number
                    total_ttc: number
                    tva_rate: number
                    status: 'draft' | 'sent' | 'accepted' | 'rejected'
                    pdf_url: string | null
                    items: Json
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['quotes']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Database['public']['Tables']['quotes']['Insert']>
            }
            invoices: {
                Row: {
                    id: string
                    quote_id: string | null
                    client_id: string
                    invoice_number: string
                    total_ht: number
                    total_ttc: number
                    tva_rate: number
                    status: 'unpaid' | 'paid' | 'overdue'
                    pdf_url: string | null
                    items: Json
                    created_at: string
                    updated_at: string
                    paid_at: string | null
                }
                Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Database['public']['Tables']['invoices']['Insert']>
            }
            ai_renderings: {
                Row: {
                    id: string
                    client_id: string | null
                    original_image_url: string
                    generated_image_url: string
                    prompt: string
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['ai_renderings']['Row'], 'id' | 'created_at'>
                Update: Partial<Database['public']['Tables']['ai_renderings']['Insert']>
            }
            allovoisin_leads: {
                Row: {
                    id: string
                    email_date: string
                    client_name: string
                    project_type: string
                    city: string
                    postal_code: string
                    distance_km: number | null
                    estimated_price_min: number | null
                    estimated_price_max: number | null
                    original_link: string | null
                    status: 'pending' | 'interested' | 'rejected' | 'converted'
                    notes: string | null
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['allovoisin_leads']['Row'], 'id' | 'created_at'>
                Update: Partial<Database['public']['Tables']['allovoisin_leads']['Insert']>
            }
            facebook_prospects: {
                Row: {
                    id: string
                    post_title: string
                    post_description: string | null
                    author_name: string | null
                    contact_info: string | null
                    post_url: string
                    relevance_score: number
                    location: string | null
                    status: 'new' | 'contacted' | 'qualified' | 'rejected'
                    created_at: string
                }
                Insert: Omit<Database['public']['Tables']['facebook_prospects']['Row'], 'id' | 'created_at'>
                Update: Partial<Database['public']['Tables']['facebook_prospects']['Insert']>
            }
            reviews: {
                Row: {
                    id: string
                    client_id: string
                    rating: number | null
                    comment: string | null
                    platform: string | null
                    status: 'pending' | 'received' | 'published'
                    sent_at: string
                    received_at: string | null
                }
                Insert: Omit<Database['public']['Tables']['reviews']['Row'], 'id'>
                Update: Partial<Database['public']['Tables']['reviews']['Insert']>
            }
            company_files: {
                Row: {
                    id: string
                    file_type: 'system_prompt' | 'pricing' | 'quote_template' | 'invoice_template' | 'document' | 'photo' | 'plan'
                    file_name: string
                    file_content: string | null
                    file_url: string | null
                    client_id: string | null
                    category: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: Omit<Database['public']['Tables']['company_files']['Row'], 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Database['public']['Tables']['company_files']['Insert']>
            }
        }
        Views: {}
        Functions: {}
    }
}

```


## File: src\lib\utils.ts

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

```


## File: src\main.tsx

```tsx
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

```


## File: src\pages\Dashboard.tsx

```tsx
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
    Share2,
    Facebook,
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
import { ClientsCRM } from "@/components/crm/ClientsCRM";
import { FacebookAutoPost } from "@/components/facebook/FacebookAutoPost";
import { useAuth } from "@/pages/Login";

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [whatsappInput, setWhatsappInput] = useState("");
    const queryClient = useQueryClient();
    const { logout, getUser } = useAuth();

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
        const endpoint = type === 'quote' ? (n8nConfig?.devis_webhook || '/generer-devis') : (n8nConfig?.facture_webhook || '/envoi-facture');
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

    const menuItems = [
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
        { id: "fichiers", icon: FolderOpen, label: "Fichiers" },
        { id: "parametres", icon: SettingsIcon, label: "Paramètres" },
    ];

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
                            <p className="text-xs text-muted-foreground truncate">{getUser()}</p>
                        </div>
                        <button
                            onClick={logout}
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
                        {activeTab === "parametres" && <Settings />}
                        {activeTab === "allovoisin" && <AlloVoisinLeads onConvertToQuote={handleConvertLeadToQuote} />}
                        {activeTab === "prospection" && <FacebookProspecting />}
                        {activeTab === "facebook" && <FacebookAutoPost companySettings={companySettings} />}
                        {activeTab === "fichiers" && <FileManager />}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;

```


## File: src\pages\Login.tsx

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, LogIn, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

// Default credentials (change these)
const DEFAULT_EMAIL = "admin@amg-renovation.fr";
const DEFAULT_PASSWORD = "amg2024!";

export function useAuth() {
    const isLoggedIn = () => localStorage.getItem("amg_auth") === "true";
    const login = () => localStorage.setItem("amg_auth", "true");
    const logout = () => {
        localStorage.removeItem("amg_auth");
        window.location.reload();
    };
    const getUser = () => localStorage.getItem("amg_user") || "Admin";
    return { isLoggedIn, login, logout, getUser };
}

export function LoginPage({ onLogin }: { onLogin: () => void }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 800));

        if (email === DEFAULT_EMAIL && password === DEFAULT_PASSWORD) {
            localStorage.setItem("amg_auth", "true");
            localStorage.setItem("amg_user", email);
            toast.success("Connexion réussie !");
            onLogin();
        } else {
            toast.error("Email ou mot de passe incorrect");
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl animate-pulse" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
            </div>

            <Card className="w-full max-w-md relative z-10 border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl shadow-black/20">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">AMG Rénovation</CardTitle>
                    <CardDescription className="text-white/60">
                        Connectez-vous pour accéder à votre tableau de bord
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-white/80">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@amg-renovation.fr"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-blue-400 focus:ring-blue-400/30"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-white/80">Mot de passe</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-blue-400 focus:ring-blue-400/30 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-5 shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            ) : (
                                <LogIn className="w-5 h-5 mr-2" />
                            )}
                            {isLoading ? "Connexion..." : "Se connecter"}
                        </Button>
                    </form>

                    <div className="mt-6 pt-4 border-t border-white/10">
                        <p className="text-center text-white/30 text-xs">
                            Accès réservé aux administrateurs AMG Rénovation
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

```


## File: src\pages\Settings.tsx

```tsx
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

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

    return (
        <div className="space-y-6 animate-in fade-in">
            <h2 className="text-3xl font-bold text-foreground">Paramètres Entreprise</h2>

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

```


## File: n8n\activate_workflows.js

```js
import fs from 'fs';
import path from 'path';

const N8N_HOST = 'https://app.n8nproagentvocal.com';
const PUBLIC_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYzQ2YjA3Mi1lZDFmLTQ2NDgtODQ0NC01YjdkOGVlZjU0Y2EiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5Njg2NjgyLCJleHAiOjE3NzIyMzMyMDB9.66Z4Slu5B2c0XYcunpekKZLw6_dZEqCp7NVPYzAl33U';

async function activateWorkflows() {
    const targetIds = [
        'LVxyboyvTl30r7nf', 'm8e1uiT9iVzlJulk', 'S8HBsWTjvBFHu9F0',
        'iRvZ5VBDSWwjh7dh', 'rUmLAdE8d4b4FVEm', 'jAcYlND522basZBL'
    ];

    console.log(`Starting activation for ${targetIds.length} workflows...`);

    for (const id of targetIds) {
        try {
            console.log(`Activating ID: ${id}...`);
            const response = await fetch(`${N8N_HOST}/api/v1/workflows/${id}/activate`, {
                method: 'POST',
                headers: {
                    'X-N8N-API-KEY': PUBLIC_API_KEY,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok) {
                console.log(`[SUCCESS] Workflow ${id} activated.`);
            } else {
                console.error(`[FAILED] Workflow ${id} activation:`, result.message || result);
            }
        } catch (error) {
            console.error(`Error activating ${id}:`, error);
        }
    }
}

activateWorkflows();

```


## File: n8n\ai_visualisation.json

```json
{
    "name": "AMG - Visualisation IA (Webhook)",
    "nodes": [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "visualisation-ia",
                "options": {}
            },
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 1,
            "position": [
                250,
                300
            ]
        },
        {
            "parameters": {
                "content": "Ce workflow devrait :\n1. Recevoir l'image et le prompt\n2. Appeler l'API Gemini ou Replicate\n3. Stocker le résultat dans Supabase Bucket\n4. Créer une entrée dans la table ai_renderings",
                "height": 194,
                "width": 313
            },
            "name": "Note",
            "type": "n8n-nodes-base.stickyNote",
            "typeVersion": 1,
            "position": [
                450,
                250
            ]
        }
    ],
    "connections": {}
}
```


## File: n8n\allovoisin_scraper.json

```json
{
    "name": "AMG - Scraper AlloVoisin (Webhook)",
    "nodes": [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "allovoisin-leads",
                "responseMode": "responseNode",
                "options": {}
            },
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 1.1,
            "position": [
                250,
                300
            ],
            "webhookId": "allovoisin-leads"
        },
        {
            "parameters": {
                "jsCode": "const input = $input.first().json.body || $input.first().json;\n\n// Process leads from AlloVoisin emails or API\nconst leads = input.leads || [input];\n\nconst processedLeads = leads.map(lead => {\n  const projectType = lead.project_type || lead.title || 'Travaux divers';\n  const city = lead.city || lead.location || 'Paris';\n  const clientName = lead.client_name || lead.name || 'Client AlloVoisin';\n  \n  // Simple distance estimation (would use Google Maps API in production)\n  const postalCode = lead.postal_code || '75000';\n  const isLocal = postalCode.startsWith('75') || postalCode.startsWith('92') || postalCode.startsWith('93') || postalCode.startsWith('94');\n  const estimatedDistance = isLocal ? Math.floor(Math.random() * 15) + 1 : Math.floor(Math.random() * 30) + 15;\n  \n  // Price estimation based on project type\n  let priceMin = 500, priceMax = 2000;\n  const type = projectType.toLowerCase();\n  if (type.includes('rénovation') || type.includes('renovation')) { priceMin = 3000; priceMax = 15000; }\n  else if (type.includes('salle de bain') || type.includes('cuisine')) { priceMin = 4000; priceMax = 12000; }\n  else if (type.includes('peinture')) { priceMin = 1000; priceMax = 4000; }\n  else if (type.includes('carrelage')) { priceMin = 1500; priceMax = 5000; }\n  else if (type.includes('plomberie')) { priceMin = 500; priceMax = 3000; }\n  \n  return {\n    client_name: clientName,\n    project_type: projectType,\n    city: city,\n    postal_code: postalCode,\n    estimated_price_min: lead.estimated_price_min || priceMin,\n    estimated_price_max: lead.estimated_price_max || priceMax,\n    distance_km: estimatedDistance,\n    status: 'pending',\n    email_date: lead.email_date || new Date().toISOString(),\n    original_link: lead.original_link || lead.url || null,\n    is_local: isLocal\n  };\n});\n\nreturn [{ json: { success: true, total: processedLeads.length, local: processedLeads.filter(l => l.is_local).length, leads: processedLeads } }];"
            },
            "name": "Process AlloVoisin Leads",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [
                480,
                300
            ]
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": "={{ $json }}"
            },
            "name": "Respond to Webhook",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1,
            "position": [
                700,
                300
            ]
        }
    ],
    "connections": {
        "Webhook": {
            "main": [
                [
                    {
                        "node": "Process AlloVoisin Leads",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        },
        "Process AlloVoisin Leads": {
            "main": [
                [
                    {
                        "node": "Respond to Webhook",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        }
    },
    "settings": {
        "executionOrder": "v1",
        "saveManualExecutions": true,
        "callerPolicy": "workflowsFromSameOwner"
    }
}
```


## File: n8n\deploy_all_workflows.js

```js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const N8N_HOST = 'https://app.n8nproagentvocal.com';
const PUBLIC_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYzQ2YjA3Mi1lZDFmLTQ2NDgtODQ0NC01YjdkOGVlZjU0Y2EiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5Njg2NjgyLCJleHAiOjE3NzIyMzMyMDB9.66Z4Slu5B2c0XYcunpekKZLw6_dZEqCp7NVPYzAl33U';

const WORKFLOWS = [
    'quote_generation.json',
    'invoice_generation.json',
    'facebook_autopost.json',
    'review_request.json',
    'facebook_scraper.json',
    'allovoisin_scraper.json',
];

async function deployAllWorkflows() {
    console.log(`\n🚀 Deploying ${WORKFLOWS.length} workflows to ${N8N_HOST}\n`);
    const results = [];

    for (const filename of WORKFLOWS) {
        const filePath = path.join(__dirname, filename);

        if (!fs.existsSync(filePath)) {
            console.error(`  ❌ File not found: ${filename}`);
            continue;
        }

        const workflowData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Remove any existing ID so n8n creates a new one
        delete workflowData.id;

        // Ensure settings
        workflowData.settings = workflowData.settings || {
            executionOrder: 'v1',
            saveManualExecutions: true,
            callerPolicy: 'workflowsFromSameOwner'
        };

        try {
            console.log(`  📤 Importing: ${workflowData.name}...`);

            const importResponse = await fetch(`${N8N_HOST}/api/v1/workflows`, {
                method: 'POST',
                headers: {
                    'X-N8N-API-KEY': PUBLIC_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(workflowData)
            });

            const importResult = await importResponse.json();

            if (!importResponse.ok) {
                console.error(`  ❌ Import failed for ${filename}:`, importResult.message || JSON.stringify(importResult));
                continue;
            }

            console.log(`  ✅ Imported: ${importResult.name} (ID: ${importResult.id})`);

            // Activate the workflow
            console.log(`  🔌 Activating...`);
            const activateResponse = await fetch(`${N8N_HOST}/api/v1/workflows/${importResult.id}/activate`, {
                method: 'POST',
                headers: {
                    'X-N8N-API-KEY': PUBLIC_API_KEY,
                    'Content-Type': 'application/json'
                }
            });

            if (activateResponse.ok) {
                console.log(`  ⚡ Activated!`);
            } else {
                const activateError = await activateResponse.json();
                console.warn(`  ⚠️ Activation warning:`, activateError.message || JSON.stringify(activateError));
            }

            // Extract webhook URL if applicable
            const webhookNode = workflowData.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
            if (webhookNode) {
                const webhookUrl = `${N8N_HOST}/webhook/${webhookNode.parameters.path}`;
                console.log(`  🔗 Webhook URL: ${webhookUrl}`);
                results.push({ name: workflowData.name, id: importResult.id, webhook: webhookUrl });
            } else {
                results.push({ name: workflowData.name, id: importResult.id, webhook: '(no webhook)' });
            }

            console.log('');
        } catch (error) {
            console.error(`  ❌ Error deploying ${filename}:`, error.message);
        }
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════');
    console.log('📋 DEPLOYMENT SUMMARY');
    console.log('═══════════════════════════════════════════════');
    for (const r of results) {
        console.log(`  ${r.name}`);
        console.log(`    ID: ${r.id}`);
        console.log(`    URL: ${r.webhook}`);
    }
    console.log(`\n✅ ${results.length}/${WORKFLOWS.length} workflows deployed successfully.\n`);
}

deployAllWorkflows();

```


## File: n8n\deploy_workflow.js

```js
import fs from 'fs';
import path from 'path';

const N8N_HOST = 'https://app.n8nproagentvocal.com';
const PUBLIC_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYzQ2YjA3Mi1lZDFmLTQ2NDgtODQ0NC01YjdkOGVlZjU0Y2EiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5Njg2NjgyLCJleHAiOjE3NzIyMzMyMDB9.66Z4Slu5B2c0XYcunpekKZLw6_dZEqCp7NVPYzAl33U';
const WORKFLOW_PATH = 'c:/Users/SAMUEL SIBONY/antigravity/amg-renovation/n8n/ai_visualisation.json';

async function importWorkflow() {
    try {
        console.log(`Importing workflow to ${N8N_HOST}...`);

        const workflowData = JSON.parse(fs.readFileSync(WORKFLOW_PATH, 'utf8'));

        // Ensure required fields are present
        workflowData.name = "AMG - Visualisation IA (Imported)";
        workflowData.settings = workflowData.settings || {
            executionOrder: 'v1',
            saveExecutionProgress: true,
            saveManualExecutions: true,
            callerPolicy: 'workflowsFromSameOwner'
        };

        delete workflowData.id; // Ensure it's treated as new

        const response = await fetch(`${N8N_HOST}/api/v1/workflows`, {
            method: 'POST',
            headers: {
                'X-N8N-API-KEY': PUBLIC_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(workflowData)
        });

        const result = await response.json();

        if (response.ok) {
            console.log('Workflow IMPORTED successfully!');
            console.log('New Workflow ID:', result.id);
            console.log('Workflow Name:', result.name);
        } else {
            console.error('Failed to import workflow:', result);
        }
    } catch (error) {
        console.error('Error during workflow import:', error);
    }
}

importWorkflow();

```


## File: n8n\discover_mcp_tools.js

```js
const MCP_URL = 'https://app.n8nproagentvocal.com/mcp-server/http';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYzQ2YjA3Mi1lZDFmLTQ2NDgtODQ0NC01YjdkOGVlZjU0Y2EiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6IjdlM2Y1YzMwLTI1MzktNGViMy05NDEyLWUwY2RkZjkwZWY5NiIsImlhdCI6MTc2OTY4NTgyN30.jrad4pppjwRuZDs8SKObNE2o89XknzbpcyTK1hZqNlY';

async function discoverTools() {
    try {
        console.log(`Querying tools from ${MCP_URL} with NEW token and headers...`);
        const response = await fetch(MCP_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream'
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'tools/list',
                params: {},
                id: 1
            })
        });

        const text = await response.text();
        console.log(`Status: ${response.status}`);
        console.log(`Response: ${text.substring(0, 1000)}${text.length > 1000 ? '...' : ''}`);

    } catch (error) {
        console.error('Error discovering tools:', error);
    }
}

discoverTools();

```


## File: n8n\facebook_autopost.json

```json
{
    "name": "AMG - Facebook Auto-Post (Webhook)",
    "nodes": [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "facebook-autopost",
                "responseMode": "responseNode",
                "options": {}
            },
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 1.1,
            "position": [
                250,
                300
            ],
            "webhookId": "facebook-autopost"
        },
        {
            "parameters": {
                "jsCode": "const input = $input.first().json.body || $input.first().json;\n\nconst caption = input.caption || '';\nconst imageUrl = input.image_url || null;\nconst scheduledAt = input.scheduled_at || null;\nconst companyName = input.company_name || 'AMG Rénovation';\n\n// Prepare Facebook Graph API payload\nconst fbPayload = {\n  message: caption,\n  published: !scheduledAt,\n};\n\nif (scheduledAt) {\n  fbPayload.scheduled_publish_time = Math.floor(new Date(scheduledAt).getTime() / 1000);\n  fbPayload.published = false;\n}\n\nif (imageUrl) {\n  fbPayload.url = imageUrl;\n}\n\nconst response = {\n  success: true,\n  action: scheduledAt ? 'scheduled' : 'published',\n  scheduled_at: scheduledAt,\n  caption_preview: caption.substring(0, 100) + (caption.length > 100 ? '...' : ''),\n  company: companyName,\n  processed_at: new Date().toISOString(),\n  fb_payload: fbPayload,\n  note: 'To enable actual Facebook posting, add your Page Access Token and configure the HTTP Request node to POST to https://graph.facebook.com/v18.0/{page-id}/feed'\n};\n\nreturn [{ json: response }];"
            },
            "name": "Prepare FB Post",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [
                480,
                300
            ]
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": "={{ $json }}"
            },
            "name": "Respond to Webhook",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1,
            "position": [
                700,
                300
            ]
        }
    ],
    "connections": {
        "Webhook": {
            "main": [
                [
                    {
                        "node": "Prepare FB Post",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        },
        "Prepare FB Post": {
            "main": [
                [
                    {
                        "node": "Respond to Webhook",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        }
    },
    "settings": {
        "executionOrder": "v1",
        "saveManualExecutions": true,
        "callerPolicy": "workflowsFromSameOwner"
    }
}
```


## File: n8n\facebook_scraper.json

```json
{
    "name": "AMG - Scraper Facebook (Marketplace)",
    "nodes": [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "facebook-scrape-webhook",
                "responseMode": "responseNode",
                "options": {}
            },
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 1.1,
            "position": [
                250,
                300
            ],
            "webhookId": "facebook-scrape-webhook"
        },
        {
            "parameters": {
                "jsCode": "const input = $input.first().json.body || $input.first().json;\n\n// Expect data from external scraper (e.g., Browsing AI or manual)\nconst posts = input.posts || [input];\n\nconst qualifiedResults = posts.map(post => {\n  const content = (post.post_content || post.content || '').toLowerCase();\n  const author = post.author_name || post.author || 'Inconnu';\n  const url = post.post_url || post.url || '';\n  \n  // Simple keyword-based qualification\n  const renovationKeywords = ['rénovation', 'rénover', 'travaux', 'peinture', 'carrelage', 'salle de bain', 'cuisine', 'plomberie', 'artisan', 'devis'];\n  const matchCount = renovationKeywords.filter(kw => content.includes(kw)).length;\n  \n  let relevance = 'Low';\n  let score = matchCount;\n  if (matchCount >= 3) relevance = 'Excellent';\n  else if (matchCount >= 2) relevance = 'High';\n  else if (matchCount >= 1) relevance = 'Medium';\n  \n  // Check for budget mentions\n  const budgetMatch = content.match(/(\\d+)\\s*€|(\\d+)\\s*euros/i);\n  const hasBudget = !!budgetMatch;\n  if (hasBudget) score += 2;\n  \n  return {\n    author_name: author,\n    post_content: post.post_content || post.content || '',\n    post_url: url,\n    analysis_result: `${relevance} relevance — ${matchCount} keyword matches${hasBudget ? ', budget mentioned' : ''}`,\n    status: matchCount >= 2 ? 'qualified' : 'new',\n    relevance_score: score,\n    scraped_at: new Date().toISOString()\n  };\n});\n\nreturn [{ json: { success: true, total: qualifiedResults.length, qualified: qualifiedResults.filter(r => r.status === 'qualified').length, prospects: qualifiedResults } }];"
            },
            "name": "Qualify Prospects",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [
                480,
                300
            ]
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": "={{ $json }}"
            },
            "name": "Respond to Webhook",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1,
            "position": [
                700,
                300
            ]
        }
    ],
    "connections": {
        "Webhook": {
            "main": [
                [
                    {
                        "node": "Qualify Prospects",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        },
        "Qualify Prospects": {
            "main": [
                [
                    {
                        "node": "Respond to Webhook",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        }
    },
    "settings": {
        "executionOrder": "v1",
        "saveManualExecutions": true,
        "callerPolicy": "workflowsFromSameOwner"
    }
}
```


## File: n8n\get_webhooks.js

```js
import fs from 'fs';

const N8N_HOST = 'https://app.n8nproagentvocal.com';
const PUBLIC_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlYzQ2YjA3Mi1lZDFmLTQ2NDgtODQ0NC01YjdkOGVlZjU0Y2EiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY5Njg2NjgyLCJleHAiOjE3NzIyMzMyMDB9.66Z4Slu5B2c0XYcunpekKZLw6_dZEqCp7NVPYzAl33U';

async function getWebhookUrls() {
    const targetIds = [
        'LVxyboyvTl30r7nf', 'm8e1uiT9iVzlJulk', 'S8HBsWTjvBFHu9F0',
        'iRvZ5VBDSWwjh7dh', 'rUmLAdE8d4b4FVEm', 'jAcYlND522basZBL'
    ];

    console.log(`Extracting webhook URLs for ${targetIds.length} workflows...`);

    for (const id of targetIds) {
        try {
            const response = await fetch(`${N8N_HOST}/api/v1/workflows/${id}`, {
                method: 'GET',
                headers: { 'X-N8N-API-KEY': PUBLIC_API_KEY }
            });

            const data = await response.json();
            if (response.ok) {
                const webhookNode = data.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
                if (webhookNode) {
                    const path = webhookNode.parameters.path;
                    const method = webhookNode.parameters.httpMethod || 'GET';
                    // Construct production URL (n8n standard format)
                    const prodUrl = `${N8N_HOST}/webhook/${path}`;
                    console.log(`- ${data.name}: ${method} ${prodUrl}`);
                } else {
                    console.log(`- ${data.name}: (No Webhook Node found - might be Cron)`);
                }
            }
        } catch (error) {
            console.error(`Error processing ${id}:`, error);
        }
    }
}

getWebhookUrls();

```


## File: n8n\invoice_generation.json

```json
{
    "name": "AMG - Envoi Facture (Webhook)",
    "nodes": [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "envoi-facture",
                "responseMode": "responseNode",
                "options": {}
            },
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 1.1,
            "position": [
                250,
                300
            ],
            "webhookId": "envoi-facture"
        },
        {
            "parameters": {
                "jsCode": "const input = $input.first().json.body || $input.first().json;\n\nconst date = input['Date'] || new Date().toLocaleDateString('fr-FR');\nconst nom = input['Nom'] || 'Client';\nconst prenom = input['Prénom'] || '';\nconst email = input['Email'] || '';\nconst prixHT = input['Prix HT'] || 0;\nconst tva = input['TVA'] || 20;\nconst prixTTC = input['Prix TTC'] || (prixHT * (1 + tva/100));\nconst numFacture = input['Numéro de facture'] || 'F-' + Date.now();\nconst numDevis = input['Numéro de devis'] || 'N/A';\nconst description = input['Description'] || 'Travaux de rénovation';\n\nconst html = `\n<!DOCTYPE html>\n<html>\n<head><meta charset=\"utf-8\"><style>\n  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #333; }\n  .header { display: flex; justify-content: space-between; border-bottom: 3px solid #16a34a; padding-bottom: 20px; margin-bottom: 30px; }\n  .company { font-size: 24px; font-weight: bold; color: #16a34a; }\n  .facture-num { font-size: 14px; color: #666; }\n  .client-info { background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 30px; }\n  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }\n  th { background: #16a34a; color: white; padding: 12px; text-align: left; }\n  td { padding: 12px; border-bottom: 1px solid #e2e8f0; }\n  .total-row { font-weight: bold; font-size: 18px; color: #16a34a; }\n  .payment { background: #fefce8; padding: 15px; border-radius: 8px; border: 1px solid #fde047; margin-top: 20px; }\n  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #666; }\n</style></head>\n<body>\n  <div class=\"header\">\n    <div class=\"company\">AMG Rénovation</div>\n    <div><div class=\"facture-num\">Facture ${numFacture}</div><div>Date: ${date}</div><div>Réf. Devis: ${numDevis}</div></div>\n  </div>\n  <div class=\"client-info\">\n    <strong>Client:</strong> ${prenom} ${nom}<br>\n    <strong>Email:</strong> ${email}\n  </div>\n  <table>\n    <thead><tr><th>Description</th><th>Montant HT</th></tr></thead>\n    <tbody><tr><td>${description}</td><td>${prixHT.toLocaleString('fr-FR')} €</td></tr></tbody>\n  </table>\n  <table>\n    <tr><td>Total HT</td><td><strong>${prixHT.toLocaleString('fr-FR')} €</strong></td></tr>\n    <tr><td>TVA (${tva}%)</td><td>${(prixTTC - prixHT).toLocaleString('fr-FR')} €</td></tr>\n    <tr class=\"total-row\"><td>Total TTC</td><td>${prixTTC.toLocaleString('fr-FR')} €</td></tr>\n  </table>\n  <div class=\"payment\">⚠️ <strong>Paiement attendu sous 30 jours</strong> par virement bancaire.<br>IBAN: FR76 1234 5678 9012 3456 7890 123 — BIC: AMGFRPPXXX</div>\n  <div class=\"footer\">AMG Rénovation — SIRET: 123 456 789 00012 — TVA: FR12345678901</div>\n</body>\n</html>`;\n\nreturn [{ json: { success: true, document_type: 'facture', numero: numFacture, client: `${prenom} ${nom}`, total_ttc: prixTTC, html: html } }];"
            },
            "name": "Generate Invoice HTML",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [
                480,
                300
            ]
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": "={{ $json }}"
            },
            "name": "Respond to Webhook",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1,
            "position": [
                700,
                300
            ]
        }
    ],
    "connections": {
        "Webhook": {
            "main": [
                [
                    {
                        "node": "Generate Invoice HTML",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        },
        "Generate Invoice HTML": {
            "main": [
                [
                    {
                        "node": "Respond to Webhook",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        }
    },
    "settings": {
        "executionOrder": "v1",
        "saveManualExecutions": true,
        "callerPolicy": "workflowsFromSameOwner"
    }
}
```


## File: n8n\quote_generation.json

```json
{
    "name": "AMG - Génération Devis (Webhook)",
    "nodes": [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "generer-devis",
                "responseMode": "responseNode",
                "options": {}
            },
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 1.1,
            "position": [
                250,
                300
            ],
            "webhookId": "generer-devis"
        },
        {
            "parameters": {
                "jsCode": "const input = $input.first().json.body || $input.first().json;\n\nconst date = input['Date'] || new Date().toLocaleDateString('fr-FR');\nconst nom = input['Nom'] || 'Client';\nconst prenom = input['Prénom'] || '';\nconst email = input['Email'] || '';\nconst prixHT = input['Prix HT'] || 0;\nconst tva = input['TVA'] || 20;\nconst prixTTC = input['Prix TTC'] || (prixHT * (1 + tva/100));\nconst numDevis = input['Numéro de devis'] || 'D-' + Date.now();\nconst description = input['Description'] || 'Travaux de rénovation';\nconst validite = input['Validité'] || '30 jours';\n\nconst html = `\n<!DOCTYPE html>\n<html>\n<head><meta charset=\"utf-8\"><style>\n  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #333; }\n  .header { display: flex; justify-content: space-between; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }\n  .company { font-size: 24px; font-weight: bold; color: #2563eb; }\n  .devis-num { font-size: 14px; color: #666; }\n  .client-info { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }\n  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }\n  th { background: #2563eb; color: white; padding: 12px; text-align: left; }\n  td { padding: 12px; border-bottom: 1px solid #e2e8f0; }\n  .total-row { font-weight: bold; font-size: 18px; }\n  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #666; }\n</style></head>\n<body>\n  <div class=\"header\">\n    <div class=\"company\">AMG Rénovation</div>\n    <div><div class=\"devis-num\">Devis ${numDevis}</div><div>Date: ${date}</div><div>Validité: ${validite}</div></div>\n  </div>\n  <div class=\"client-info\">\n    <strong>Client:</strong> ${prenom} ${nom}<br>\n    <strong>Email:</strong> ${email}\n  </div>\n  <table>\n    <thead><tr><th>Description</th><th>Montant HT</th></tr></thead>\n    <tbody><tr><td>${description}</td><td>${prixHT.toLocaleString('fr-FR')} €</td></tr></tbody>\n  </table>\n  <table>\n    <tr><td>Total HT</td><td><strong>${prixHT.toLocaleString('fr-FR')} €</strong></td></tr>\n    <tr><td>TVA (${tva}%)</td><td>${(prixTTC - prixHT).toLocaleString('fr-FR')} €</td></tr>\n    <tr class=\"total-row\"><td>Total TTC</td><td>${prixTTC.toLocaleString('fr-FR')} €</td></tr>\n  </table>\n  <div class=\"footer\">AMG Rénovation — SIRET: 123 456 789 00012 — TVA: FR12345678901</div>\n</body>\n</html>`;\n\nreturn [{ json: { success: true, document_type: 'devis', numero: numDevis, client: `${prenom} ${nom}`, total_ttc: prixTTC, html: html } }];"
            },
            "name": "Generate Quote HTML",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [
                480,
                300
            ]
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": "={{ $json }}"
            },
            "name": "Respond to Webhook",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1,
            "position": [
                700,
                300
            ]
        }
    ],
    "connections": {
        "Webhook": {
            "main": [
                [
                    {
                        "node": "Generate Quote HTML",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        },
        "Generate Quote HTML": {
            "main": [
                [
                    {
                        "node": "Respond to Webhook",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        }
    },
    "settings": {
        "executionOrder": "v1",
        "saveManualExecutions": true,
        "callerPolicy": "workflowsFromSameOwner"
    }
}
```


## File: n8n\review_request.json

```json
{
    "name": "AMG - Demande Avis (Webhook)",
    "nodes": [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "demande-avis-client",
                "responseMode": "responseNode",
                "options": {}
            },
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 1.1,
            "position": [
                250,
                300
            ],
            "webhookId": "demande-avis-client"
        },
        {
            "parameters": {
                "jsCode": "const input = $input.first().json.body || $input.first().json;\n\nconst clientName = input.client_name || 'Client';\nconst clientEmail = input.client_email || '';\nconst companyName = input.company_name || 'AMG Rénovation';\nconst reviewId = input.review_id || '';\n\n// Google Review link (replace with actual link)\nconst googleReviewLink = 'https://g.page/r/amg-renovation/review';\n\nconst emailSubject = `${companyName} — Votre avis compte !`;\n\nconst emailBody = `Bonjour ${clientName},\\n\\nMerci d'avoir choisi ${companyName} pour vos travaux de rénovation !\\n\\nVotre satisfaction est notre priorité. Pourriez-vous prendre quelques secondes pour nous laisser un avis sur Google ?\\n\\n👉 ${googleReviewLink}\\n\\nVotre retour nous aide à améliorer nos services et aide d'autres personnes à nous trouver.\\n\\nMerci beaucoup !\\n\\nCordialement,\\nL'équipe ${companyName}`;\n\nconst whatsappMessage = `Bonjour ${clientName} ! 😊 Merci d'avoir fait confiance à ${companyName}. Si vous êtes satisfait de nos travaux, un petit avis Google nous aiderait énormément : ${googleReviewLink} Merci !`;\n\nreturn [{ json: {\n  success: true,\n  review_id: reviewId,\n  client_name: clientName,\n  client_email: clientEmail,\n  email_subject: emailSubject,\n  email_body: emailBody,\n  whatsapp_message: whatsappMessage,\n  google_review_link: googleReviewLink,\n  processed_at: new Date().toISOString(),\n  note: 'To enable actual email/WhatsApp sending, connect a Gmail node or Twilio node after this Code node.'\n} }];"
            },
            "name": "Compose Review Request",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [
                480,
                300
            ]
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": "={{ $json }}"
            },
            "name": "Respond to Webhook",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1,
            "position": [
                700,
                300
            ]
        }
    ],
    "connections": {
        "Webhook": {
            "main": [
                [
                    {
                        "node": "Compose Review Request",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        },
        "Compose Review Request": {
            "main": [
                [
                    {
                        "node": "Respond to Webhook",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        }
    },
    "settings": {
        "executionOrder": "v1",
        "saveManualExecutions": true,
        "callerPolicy": "workflowsFromSameOwner"
    }
}
```


## File: n8n\tools_list.json

```json
��Q u e r y i n g   t o o l s   f r o m   h t t p s : / / a p p . n 8 n p r o a g e n t v o c a l . c o m / m c p - s e r v e r / h t t p . . .  
 
```


## File: n8n\tools_list_full.json

```json
﻿Querying tools from https://app.n8nproagentvocal.com/mcp-server/http with NEW token and headers...
Status: 200
Response: event: message
data: {"result":{"tools":[{"name":"search_workflows","description":"Search for workflows with optional filters. Returns a preview of each workflow.","inputSchema":{"type":"object","properties":{"limit":{"type":"integer","exclusiveMinimum":0,"maximum":200,"description":"Limit the number of results (max 200)"},"query":{"type":"string","description":"Filter by name or description"},"projectId":{"type":"string"}},"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"},"annotations":{"title":"Search Workflows","readOnlyHint":true,"destructiveHint":false,"idempotentHint":true,"openWorldHint":false},"execution":{"taskSupport":"forbidden"},"outputSchema":{"type":"object","properties":{"data":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string","description":"The unique identifier of the workflow"},"name":{"type":["string","null"],"description":"The name of the workflow"},"description":{"type":["string","null"],"description":"The ...

```


## File: index.html

```html
<!doctype html>
<html lang="fr">

<head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AMG Rénovation - Gestion d'Artisan</title>
</head>

<body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
</body>

</html>
```


## File: package.json

```json
{
    "name": "amg-renovation",
    "private": true,
    "version": "1.0.0",
    "type": "module",
    "scripts": {
        "dev": "vite",
        "build": "vite build",
        "lint": "eslint .",
        "preview": "vite preview"
    },
    "dependencies": {
        "@hookform/resolvers": "^3.10.0",
        "@radix-ui/react-accordion": "^1.2.11",
        "@radix-ui/react-alert-dialog": "^1.1.14",
        "@radix-ui/react-avatar": "^1.1.10",
        "@radix-ui/react-checkbox": "^1.3.2",
        "@radix-ui/react-dialog": "^1.1.14",
        "@radix-ui/react-dropdown-menu": "^2.1.15",
        "@radix-ui/react-label": "^2.1.7",
        "@radix-ui/react-popover": "^1.1.14",
        "@radix-ui/react-scroll-area": "^1.2.9",
        "@radix-ui/react-select": "^2.2.5",
        "@radix-ui/react-separator": "^1.1.7",
        "@radix-ui/react-slot": "^1.2.3",
        "@radix-ui/react-switch": "^1.2.5",
        "@radix-ui/react-tabs": "^1.1.12",
        "@radix-ui/react-toast": "^1.2.14",
        "@radix-ui/react-tooltip": "^1.2.7",
        "@supabase/supabase-js": "^2.93.2",
        "@tanstack/react-query": "^5.83.0",
        "class-variance-authority": "^0.7.1",
        "clsx": "^2.1.1",
        "date-fns": "^3.6.0",
        "lucide-react": "^0.462.0",
        "react": "^18.3.1",
        "react-day-picker": "^9.13.2",
        "react-dom": "^18.3.1",
        "react-hook-form": "^7.61.1",
        "react-router-dom": "^6.30.1",
        "sonner": "^1.7.4",
        "tailwind-merge": "^2.6.0",
        "tailwindcss-animate": "^1.0.7",
        "zod": "^3.25.76"
    },
    "devDependencies": {
        "@types/node": "^22.16.5",
        "@types/react": "^18.3.23",
        "@types/react-dom": "^18.3.7",
        "@vitejs/plugin-react-swc": "^3.11.0",
        "autoprefixer": "^10.4.21",
        "postcss": "^8.5.6",
        "tailwindcss": "^3.4.17",
        "typescript": "^5.8.3",
        "vite": "^5.4.19"
    }
}

```


## File: tsconfig.json

```json
{
    "compilerOptions": {
        "target": "ES2020",
        "useDefineForClassFields": true,
        "lib": [
            "ES2020",
            "DOM",
            "DOM.Iterable"
        ],
        "module": "ESNext",
        "skipLibCheck": true,
        /* Bundler mode */
        "moduleResolution": "bundler",
        "allowImportingTsExtensions": true,
        "isolatedModules": true,
        "moduleDetection": "force",
        "noEmit": true,
        "jsx": "react-jsx",
        /* Linting */
        "strict": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noFallthroughCasesInSwitch": true,
        /* Path mapping */
        "baseUrl": ".",
        "paths": {
            "@/*": [
                "./src/*"
            ]
        }
    },
    "include": [
        "src"
    ]
}
```


## File: vite.config.ts

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    server: {
        host: '::',
        port: 8080,
    },
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});

```


## File: tailwind.config.js

```js
/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                success: {
                    DEFAULT: "hsl(var(--success))",
                    foreground: "hsl(var(--success-foreground))",
                },
                warning: {
                    DEFAULT: "hsl(var(--warning))",
                    foreground: "hsl(var(--warning-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
}

```


## File: postcss.config.js

```js
export default {
    plugins: {
        tailwindcss: {},
        autoprefixer: {},
    },
}

```


## File: .env

```txt
VITE_SUPABASE_URL=https://pjpgvxwmlrizpolondxo.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_pmMEInsWkcxztvY-RfUlSg_jJQ0kabK
VITE_N8N_WEBHOOK_BASE=https://app.n8nproagentvocal.com/webhook

```


## File: DEPLOY.md

```md
# Déploiement AMG Rénovation

Ce projet contient l'application React complète, le backend mocké (localStorage), et les workflows n8n.

## 1. Mise en ligne (GitHub Pages / Vercel / Netlify)

Le moyen le plus simple est d'utiliser **Vercel** ou **Netlify** gratuitement.

1. Créez un compte sur [Vercel](https://vercel.com) ou [Netlify](https://netlify.com).
2. **Méthode recommandée** :
   - Depuis le dossier `amg-renovation`, créez un ZIP du dossier `dist`.
   - Glissez ce ZIP (ou le dossier `dist`) sur <https://app.netlify.com/drop>.

L'application sera en ligne immédiatement avec une URL publique (ex: `amg-renovation.vercel.app`).

## 2. Export vers GitHub

Si vous voulez mettre le code source sur GitHub :

1. Créez un nouveau repository sur [GitHub](https://github.com/new).
2. Ouvrez un terminal dans ce dossier et lancez :

```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/VOTRE-NOM-UTILISATEUR/amg-renovation.git
git push -u origin main
```

## 3. Workflows N8N

Les workflows n8n sont dans le dossier `n8n/`.
Pour les déployer sur votre instance n8n pro :

```powershell
cd n8n
node deploy_all_workflows.js
```

## 4. Authentification

L'application est protégée par un login.
**Identifiants par défaut :**

- Email : `admin@amg-renovation.fr`
- Mot de passe : `amg2024!`

Pour modifier cela, éditez `src/pages/Login.tsx`.

## 5. Export Manuel

Si le script de zip automatique a échoué :

- Code Source : Zippez tout le dossier `amg-renovation` **sauf** `node_modules` et `.git`.
- Build (Production) : Zippez uniquement le dossier `dist` pour le déploiement.

```
