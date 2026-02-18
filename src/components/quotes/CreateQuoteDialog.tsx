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
