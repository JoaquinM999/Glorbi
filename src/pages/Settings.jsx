import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SectionHeader from "@/components/ui/SectionHeader";
import { Save, Eye, EyeOff, Shield } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const queryClient = useQueryClient();
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["userSettings"],
    queryFn: async () => {
      const me = await base44.auth.me();
      const items = await base44.entities.UserSettings.filter({ created_by: me.email });
      return items[0] || null;
    },
  });

  useEffect(() => {
    if (settings) {
      setApiKey(settings.binance_api_key || "");
      setApiSecret(settings.binance_api_secret || "");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings) {
        await base44.entities.UserSettings.update(settings.id, data);
      } else {
        await base44.entities.UserSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userSettings"] });
      toast.success("Claves guardadas correctamente");
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      binance_api_key: apiKey,
      binance_api_secret: apiSecret,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-border border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <SectionHeader title="Configuración" tag="AJUSTES" />

      {/* API Keys section */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-5 h-5 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-mono font-medium text-foreground">Binance API Keys</h2>
            <p className="text-[11px] font-mono text-muted-foreground/50 mt-1">
              Claves de solo lectura para Binance Futures. Glorbi nunca ejecuta órdenes.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              API Key
            </Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Ingresa tu API Key"
                className="bg-secondary border-border font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowKey(!showKey)}
                className="shrink-0 border-border"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              API Secret
            </Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                type={showSecret ? "text" : "password"}
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Ingresa tu API Secret"
                className="bg-secondary border-border font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowSecret(!showSecret)}
                className="shrink-0 border-border"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${apiKey && apiSecret ? "bg-green" : "bg-muted-foreground/30"}`} />
            <span className="text-[10px] font-mono text-muted-foreground">
              {apiKey && apiSecret ? "Claves configuradas" : "Sin claves configuradas"}
            </span>
          </div>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-foreground text-background hover:bg-foreground/90 font-mono text-xs uppercase tracking-wider"
          >
            <Save className="w-3.5 h-3.5 mr-2" />
            {saveMutation.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      {/* Security notice */}
      <div className="bg-yellow/5 border border-yellow/15 rounded-lg p-4">
        <p className="text-[11px] font-mono text-yellow/80 leading-relaxed">
          <strong>Importante:</strong> Asegúrate de que tus claves tengan únicamente permisos de lectura.
          Glorbi es una plataforma de solo lectura — nunca ejecuta operaciones ni retiros en tu cuenta.
        </p>
      </div>
    </div>
  );
}