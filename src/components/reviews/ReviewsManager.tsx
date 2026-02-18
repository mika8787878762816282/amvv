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
