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
