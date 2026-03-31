import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PenTool, FileText, Receipt, Clock, CheckCircle2, XCircle, Eye, Trash2, Plus } from "lucide-react";
import { SignaturePad } from "./SignaturePad";
import { useAuth } from "@/contexts/AuthContext";

interface SignatureRecord {
    id: string;
    document_type: "quote" | "invoice";
    document_id: string;
    document_number: string;
    client_name: string;
    signer_name: string;
    signer_email: string;
    signature_data: string;
    status: "pending" | "signed" | "refused";
    signed_at: string | null;
    created_at: string;
    ip_address: string | null;
}

export const SignatureManager = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [selectedSignature, setSelectedSignature] = useState<SignatureRecord | null>(null);
    const [selectedDocType, setSelectedDocType] = useState<"quote" | "invoice">("quote");
    const [selectedDocId, setSelectedDocId] = useState("");

    // Fetch signatures from localStorage (simulated storage since no Supabase table yet)
    const { data: signatures = [], refetch: refetchSignatures } = useQuery<SignatureRecord[]>({
        queryKey: ["signatures"],
        queryFn: () => {
            const stored = localStorage.getItem("amg_signatures");
            return stored ? JSON.parse(stored) : [];
        },
    });

    // Fetch quotes for document selection
    const { data: quotes = [] } = useQuery({
        queryKey: ["quotes"],
        queryFn: async () => {
            const { data } = await supabase
                .from("quotes")
                .select("*, clients(*)")
                .order("created_at", { ascending: false });
            return (data || []) as any[];
        },
    });

    // Fetch invoices for document selection
    const { data: invoices = [] } = useQuery({
        queryKey: ["invoices"],
        queryFn: async () => {
            const { data } = await supabase
                .from("invoices")
                .select("*, clients(*)")
                .order("created_at", { ascending: false });
            return (data || []) as any[];
        },
    });

    const availableDocs = selectedDocType === "quote" ? quotes : invoices;

    const selectedDoc = availableDocs.find((d: any) => d.id === selectedDocId);

    const saveSignature = (signatureDataUrl: string) => {
        if (!selectedDoc) {
            toast.error("Veuillez sélectionner un document");
            return;
        }

        const docNumber = selectedDocType === "quote"
            ? selectedDoc.quote_number
            : selectedDoc.invoice_number;

        const clientName = selectedDoc.clients
            ? `${selectedDoc.clients.firstname} ${selectedDoc.clients.lastname}`
            : "Client Inconnu";

        const newSignature: SignatureRecord = {
            id: crypto.randomUUID(),
            document_type: selectedDocType,
            document_id: selectedDoc.id,
            document_number: docNumber,
            client_name: clientName,
            signer_name: clientName,
            signer_email: selectedDoc.clients?.email || "",
            signature_data: signatureDataUrl,
            status: "signed",
            signed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            ip_address: null,
        };

        const existing = localStorage.getItem("amg_signatures");
        const all: SignatureRecord[] = existing ? JSON.parse(existing) : [];
        all.unshift(newSignature);
        localStorage.setItem("amg_signatures", JSON.stringify(all));

        // Update document status
        if (selectedDocType === "quote") {
            supabase.from("quotes").update({ status: "accepted" } as any).eq("id", selectedDoc.id).then(() => {
                queryClient.invalidateQueries({ queryKey: ["quotes"] });
            });
        }

        toast.success(`${selectedDocType === "quote" ? "Devis" : "Facture"} ${docNumber} signé(e) avec succès !`);
        setIsSignDialogOpen(false);
        setSelectedDocId("");
        refetchSignatures();
    };

    const deleteSignature = (id: string) => {
        const existing = localStorage.getItem("amg_signatures");
        const all: SignatureRecord[] = existing ? JSON.parse(existing) : [];
        const updated = all.filter((s) => s.id !== id);
        localStorage.setItem("amg_signatures", JSON.stringify(updated));
        refetchSignatures();
        toast.success("Signature supprimée");
    };

    const viewSignature = (sig: SignatureRecord) => {
        setSelectedSignature(sig);
        setIsViewDialogOpen(true);
    };

    const statusConfig = {
        pending: { label: "En attente", icon: Clock, className: "bg-yellow-100 text-yellow-800" },
        signed: { label: "Signé", icon: CheckCircle2, className: "bg-green-100 text-green-800" },
        refused: { label: "Refusé", icon: XCircle, className: "bg-red-100 text-red-800" },
    };

    const pendingCount = signatures.filter((s) => s.status === "pending").length;
    const signedCount = signatures.filter((s) => s.status === "signed").length;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-foreground">Signatures Electroniques</h2>
                <Button onClick={() => setIsSignDialogOpen(true)} className="bg-violet-600 hover:bg-violet-700">
                    <Plus className="w-4 h-4 mr-2" /> Nouvelle Signature
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Signatures</CardTitle>
                        <PenTool className="w-4 h-4 text-violet-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{signatures.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">En attente</CardTitle>
                        <Clock className="w-4 h-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Signés</CardTitle>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{signedCount}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Signature List */}
            <Card>
                <CardHeader>
                    <CardTitle>Historique des signatures</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {signatures.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <PenTool className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Aucune signature pour le moment</p>
                            <p className="text-sm mt-1">Cliquez sur "Nouvelle Signature" pour signer un devis ou une facture</p>
                        </div>
                    ) : (
                        <ScrollArea className="max-h-[500px]">
                            <div className="divide-y">
                                {signatures.map((sig) => {
                                    const config = statusConfig[sig.status];
                                    const StatusIcon = config.icon;
                                    return (
                                        <div key={sig.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-violet-100 p-2 rounded-full hidden md:block">
                                                    {sig.document_type === "quote" ? (
                                                        <FileText className="w-5 h-5 text-violet-600" />
                                                    ) : (
                                                        <Receipt className="w-5 h-5 text-violet-600" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold">
                                                        {sig.document_type === "quote" ? "Devis" : "Facture"} {sig.document_number}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {sig.client_name} - Signataire: {sig.signer_name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {sig.signed_at
                                                            ? `Signé le ${new Date(sig.signed_at).toLocaleDateString("fr-FR")} à ${new Date(sig.signed_at).toLocaleTimeString("fr-FR")}`
                                                            : `Créé le ${new Date(sig.created_at).toLocaleDateString("fr-FR")}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                                                <Badge className={config.className}>
                                                    <StatusIcon className="w-3 h-3 mr-1" />
                                                    {config.label}
                                                </Badge>
                                                <div className="flex gap-1">
                                                    <Button size="sm" variant="ghost" onClick={() => viewSignature(sig)} title="Voir la signature">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => deleteSignature(sig.id)} title="Supprimer" className="text-destructive hover:text-destructive">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>

            {/* Sign Dialog */}
            <Dialog open={isSignDialogOpen} onOpenChange={setIsSignDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <PenTool className="w-5 h-5 text-violet-600" />
                            Signer un document
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Type de document</label>
                                <Select value={selectedDocType} onValueChange={(v: "quote" | "invoice") => { setSelectedDocType(v); setSelectedDocId(""); }}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="quote">Devis</SelectItem>
                                        <SelectItem value="invoice">Facture</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Document</label>
                                <Select value={selectedDocId} onValueChange={setSelectedDocId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableDocs.map((doc: any) => (
                                            <SelectItem key={doc.id} value={doc.id}>
                                                {selectedDocType === "quote" ? doc.quote_number : doc.invoice_number}
                                                {" - "}
                                                {doc.clients?.firstname} {doc.clients?.lastname}
                                                {" ("}
                                                {doc.total_ttc}€)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {selectedDoc && (
                            <Card className="bg-muted/50">
                                <CardContent className="p-4">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Client: </span>
                                            <span className="font-medium">{selectedDoc.clients?.firstname} {selectedDoc.clients?.lastname}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Email: </span>
                                            <span className="font-medium">{selectedDoc.clients?.email || "N/A"}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Montant HT: </span>
                                            <span className="font-medium">{selectedDoc.total_ht}€</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Montant TTC: </span>
                                            <span className="font-bold text-green-700">{selectedDoc.total_ttc}€</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <div>
                            <label className="text-sm font-medium mb-2 block">Signature</label>
                            <SignaturePad onSave={saveSignature} />
                        </div>

                        <p className="text-xs text-muted-foreground border-t pt-3">
                            En signant ce document, vous acceptez les conditions mentionnées dans le {selectedDocType === "quote" ? "devis" : "la facture"}.
                            La signature sera horodatée et enregistrée de manière sécurisée.
                        </p>
                    </div>
                </DialogContent>
            </Dialog>

            {/* View Signature Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            Signature - {selectedSignature?.document_type === "quote" ? "Devis" : "Facture"} {selectedSignature?.document_number}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedSignature && (
                        <div className="space-y-4">
                            <div className="border rounded-lg p-2 bg-white flex justify-center">
                                <img
                                    src={selectedSignature.signature_data}
                                    alt="Signature"
                                    className="max-w-full h-auto"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Signataire: </span>
                                    <span className="font-medium">{selectedSignature.signer_name}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Email: </span>
                                    <span className="font-medium">{selectedSignature.signer_email || "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Date: </span>
                                    <span className="font-medium">
                                        {selectedSignature.signed_at
                                            ? new Date(selectedSignature.signed_at).toLocaleString("fr-FR")
                                            : "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Statut: </span>
                                    <Badge className={statusConfig[selectedSignature.status].className}>
                                        {statusConfig[selectedSignature.status].label}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
