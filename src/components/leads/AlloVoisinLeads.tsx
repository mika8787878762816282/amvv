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
