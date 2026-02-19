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

            // Accept multiple response formats from n8n workflows
            const imageUrl = result.image_url || result.resultImage || result.generated_url;
            if (imageUrl) {
                setResultUrl(imageUrl);
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
