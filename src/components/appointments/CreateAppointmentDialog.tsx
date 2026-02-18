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
