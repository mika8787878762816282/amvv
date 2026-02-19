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
                    status: 'unpaid',
                    items: data.items,
                    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // +30 days
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
