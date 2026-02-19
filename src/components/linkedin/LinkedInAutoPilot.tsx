import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CircleHelp, Linkedin, Link as LinkIcon, Save, Send, Settings2, Wrench } from "lucide-react";

export function LinkedInAutoPilot({ companySettings, onUpdated }: { companySettings: any; onUpdated?: () => void }) {
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [helpModal, setHelpModal] = useState<"how" | "vars" | "tech" | null>(null);

  const cfg = useMemo(() => {
    const n8n = (companySettings?.n8n_config || {}) as any;
    return {
      theme: n8n?.linkedin_autopost?.theme || "Automatisation n8n pour freelances",
      expertise: n8n?.linkedin_autopost?.expertise || "Automatisation commerciale, CRM, relances, onboarding",
      audience: n8n?.linkedin_autopost?.audience || "Freelances qui cherchent des missions en automatisation",
      cadence: n8n?.linkedin_autopost?.cadence || "weekly",
      cta: n8n?.linkedin_autopost?.cta || "Écris-moi 'AUTOMATION' et je t’envoie un plan concret.",
      defaultAccount: n8n?.linkedin_default_account || "",
    };
  }, [companySettings]);

  const [theme, setTheme] = useState(cfg.theme);
  const [expertise, setExpertise] = useState(cfg.expertise);
  const [audience, setAudience] = useState(cfg.audience);
  const [cta, setCta] = useState(cfg.cta);
  const [customPostText, setCustomPostText] = useState("");

  const n8nConfig = (companySettings?.n8n_config || {}) as any;
  const n8nBase = n8nConfig?.webhook_base || (import.meta as any).env.VITE_N8N_WEBHOOK_BASE;
  const connectUrl = n8nBase ? `${n8nBase}/linkedin-connect` : `${window.location.origin}/webhook/linkedin-connect`;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkedInStatus = params.get("linkedin");
    if (linkedInStatus === "connected") {
      toast.success("LinkedIn connecté ✅");
      params.delete("linkedin");
      const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash || ""}`;
      window.history.replaceState({}, "", next);
    }
  }, []);

  const buildPost = () => {
    return [
      `🎯 ${theme}`,
      "",
      `Si tu es ${audience.toLowerCase()}, voici 3 automatisations à mettre en place cette semaine :`,
      "1) Capture + qualification automatique des leads",
      "2) Relance intelligente des prospects/devis",
      "3) Suivi client + reporting automatique",
      "",
      `Mon expertise : ${expertise}.`,
      cta,
    ].join("\n");
  };

  const generatedPost = buildPost();
  const effectivePostText = (customPostText || generatedPost).trim();

  useEffect(() => {
    if (!customPostText) setCustomPostText(generatedPost);
  }, [generatedPost]);

  const saveProfile = async () => {
    if (!companySettings?.id) {
      toast.error("Paramètres société introuvables");
      return;
    }

    setSaving(true);
    try {
      const n8nConfig = { ...(companySettings?.n8n_config || {}) } as any;
      n8nConfig.linkedin_autopost = {
        theme,
        expertise,
        audience,
        cadence: "weekly",
        cta,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("company_settings")
        .update({ n8n_config: n8nConfig } as any)
        .eq("id", companySettings.id);

      if (error) throw error;
      toast.success("Profil LinkedIn auto enregistré");
      onUpdated?.();
    } catch (e: any) {
      toast.error(`Erreur sauvegarde: ${e.message || "inconnue"}`);
    } finally {
      setSaving(false);
    }
  };

  const postNow = async () => {
    if (!effectivePostText) {
      toast.error("Le texte du post est vide");
      return;
    }

    setPosting(true);
    try {
      const n8nConfig = (companySettings?.n8n_config || {}) as any;
      const base = n8nConfig?.webhook_base || (import.meta as any).env.VITE_N8N_WEBHOOK_BASE;
      if (!base) {
        toast.error("Webhook n8n non configuré");
        return;
      }

      const res = await fetch(`${base}/linkedin-post-secure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: effectivePostText, email: n8nConfig?.linkedin_default_account || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      toast.success("Post LinkedIn publié ✅");
    } catch (e: any) {
      toast.error(`Échec publication: ${e.message || "inconnu"}`);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Linkedin className="w-8 h-8 text-[#0A66C2]" />
            Auto-Post LinkedIn
          </h2>
          <p className="text-muted-foreground">Connecte le compte, définis le thème métier, et publie automatiquement chaque semaine.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href={connectUrl} target="_blank" rel="noreferrer">
            <Button variant="outline"><LinkIcon className="w-4 h-4 mr-2" />Connecter LinkedIn</Button>
          </a>
          <Badge variant="secondary">Cible par défaut: Freelances automation</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Guides rapides</CardTitle>
          <CardDescription>Fenêtres d’explication : quoi fait quoi et quoi modifier.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setHelpModal("how")}><CircleHelp className="w-4 h-4 mr-2" />Comment ça marche</Button>
          <Button variant="outline" onClick={() => setHelpModal("vars")}><Settings2 className="w-4 h-4 mr-2" />Variables à changer</Button>
          <Button variant="outline" onClick={() => setHelpModal("tech")}><Wrench className="w-4 h-4 mr-2" />Workflow technique</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profil de contenu</CardTitle>
          <CardDescription>Ce profil sert de base aux posts hebdo automatiques.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Thème principal</Label>
              <Input value={theme} onChange={(e) => setTheme(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cible client</Label>
              <Input value={audience} onChange={(e) => setAudience(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Expertise</Label>
            <Textarea value={expertise} onChange={(e) => setExpertise(e.target.value)} className="min-h-[90px]" />
          </div>

          <div className="space-y-2">
            <Label>Call-to-action</Label>
            <Input value={cta} onChange={(e) => setCta(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Texte réellement posté (modifiable)</Label>
            <Textarea
              value={customPostText}
              onChange={(e) => setCustomPostText(e.target.value)}
              className="min-h-[180px]"
            />
            <p className="text-xs text-muted-foreground">Le bouton Publier et Publier un test envoient exactement ce texte.</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={saveProfile} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? "Sauvegarde..." : "Enregistrer"}</Button>
            <Button onClick={postNow} disabled={posting}><Send className="w-4 h-4 mr-2" />{posting ? "Publication..." : "Publier"}</Button>
            <Button variant="secondary" onClick={postNow} disabled={posting}><Send className="w-4 h-4 mr-2" />{posting ? "Publication..." : "Publier un test"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aperçu post hebdo</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm bg-muted/40 rounded-lg p-4 border">{effectivePostText}</pre>
        </CardContent>
      </Card>

      <Dialog open={helpModal === "how"} onOpenChange={(o) => !o && setHelpModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Comment ça marche</DialogTitle></DialogHeader>
          <div className="text-sm space-y-2">
            <p>1) Le client clique sur <b>Connecter LinkedIn</b> pour autoriser son compte.</p>
            <p>2) Tu définis le thème, la cible, l’expertise et le CTA dans cette page.</p>
            <p>3) Le workflow hebdo n8n génère un post et l’envoie à <code>/linkedin-post-secure</code>.</p>
            <p>4) LinkedIn publie automatiquement sur le compte connecté par défaut.</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={helpModal === "vars"} onOpenChange={(o) => !o && setHelpModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Variables à changer</DialogTitle></DialogHeader>
          <div className="text-sm space-y-2">
            <p><b>Thème principal</b> : sujet de contenu (ex: “Automatisation pour agences”).</p>
            <p><b>Cible client</b> : audience précise (ex: freelances automation).</p>
            <p><b>Expertise</b> : ce que tu sais livrer concrètement.</p>
            <p><b>Call-to-action</b> : phrase qui pousse à te contacter.</p>
            <p>Ces variables sont sauvegardées dans <code>company_settings.n8n_config.linkedin_autopost</code>.</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={helpModal === "tech"} onOpenChange={(o) => !o && setHelpModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Workflow technique (dev)</DialogTitle></DialogHeader>
          <div className="text-sm space-y-2">
            <p><b>/linkedin-connect</b> : lance OAuth LinkedIn.</p>
            <p><b>/linkedin-oauth-callback</b> : récupère le token et l’enregistre en base.</p>
            <p><b>/linkedin-post-secure</b> : publie un texte via API LinkedIn.</p>
            <p><b>AMG - LinkedIn Weekly AutoPost</b> : déclenchement automatique hebdo + génération du post.</p>
            <p>Pour changer la fréquence : éditer le nœud <b>Schedule Trigger</b> dans n8n.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
