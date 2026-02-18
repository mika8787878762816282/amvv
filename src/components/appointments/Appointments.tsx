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
