import { useState, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VoiceCommanderProps {
    onCommand: (command: string) => void;
}

export function VoiceCommander({ onCommand }: VoiceCommanderProps) {
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recog = new SpeechRecognition();
            recog.continuous = false;
            recog.interimResults = false;
            recog.lang = 'fr-FR';

            recog.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript.toLowerCase();
                console.log("Voice Command:", transcript);
                processCommand(transcript);
                setIsListening(false);
            };

            recog.onerror = (event: any) => {
                console.error("Speech Recognition Error:", event.error);
                setIsListening(false);
                if (event.error === 'not-allowed') {
                    toast.error("Microphone non autorisé");
                }
            };

            recog.onend = () => {
                setIsListening(false);
            };

            setRecognition(recog);
        }
    }, [onCommand]);

    const processCommand = (text: string) => {
        toast.info(`Commande reçue: "${text}"`);

        // Simple mapping
        if (text.includes("tableau de bord") || text.includes("dashboard")) onCommand("dashboard");
        else if (text.includes("whatsapp") || text.includes("message")) onCommand("whatsapp");
        else if (text.includes("devis")) onCommand("devis");
        else if (text.includes("facture")) onCommand("factures");
        else if (text.includes("avis")) onCommand("avis");
        else if (text.includes("ia") || text.includes("image")) onCommand("ia");
        else if (text.includes("opportunité") || text.includes("leads")) onCommand("allovoisin");
        else if (text.includes("prospection")) onCommand("prospection");
        else if (text.includes("fichier")) onCommand("fichiers");
        else if (text.includes("paramètre")) onCommand("parametres");
        else if (text.includes("rendez-vous") || text.includes("rdv")) onCommand("rdv");
    };

    const toggleListening = () => {
        if (!recognition) {
            toast.error("Votre navigateur ne supporte pas la reconnaissance vocale.");
            return;
        }

        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
            setIsListening(true);
            toast("Écoute en cours...", { icon: <Mic className="w-4 h-4 text-primary animate-pulse" /> });
        }
    };

    return (
        <Button
            variant={isListening ? "default" : "outline"}
            size="icon"
            className={`rounded-full transition-all ${isListening ? 'ring-4 ring-primary/20 scale-110' : ''}`}
            onClick={toggleListening}
            title="Commande Vocale (Français)"
        >
            {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </Button>
    );
}
