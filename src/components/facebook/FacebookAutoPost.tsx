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
            const webhookUrl = n8nBase ? n8nBase + (n8nConfig?.facebook_autopost_webhook || n8nConfig?.facebook_webhook || '/facebook-autopost') : null;

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
