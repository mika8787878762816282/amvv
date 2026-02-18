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
