import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useAccess } from "@/hooks/useAccess";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { RefreshCw, PlayCircle, UserPlus, KeyRound, Search, Users, ShieldCheck, ShieldOff } from "lucide-react";

const Admin = () => {
  const Row = ({ label, value, good, bad }: { label: string; value: any; good?: boolean; bad?: boolean }) => (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={good ? "text-success font-medium" : bad ? "text-destructive font-medium" : "text-foreground"}>
        {String(value ?? "—")}
      </span>
    </div>
  );
  const { isLoading } = useAccess();
  const isAdmin = useIsAdmin();
  const [runs, setRuns] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [folderId, setFolderId] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [newLicenseEmail, setNewLicenseEmail] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [granting, setGranting] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPass, setNewUserPass] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [diagEmail, setDiagEmail] = useState("");
  const [diag, setDiag] = useState<any>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  const load = async () => {
    const [{ data: r }, { data: q }, { data: s }, { data: l }] = await Promise.all([
      supabase.from("sync_runs").select("*").order("started_at", { ascending: false }).limit(10),
      supabase.from("processing_queue").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("app_settings").select("*").maybeSingle(),
      supabase.from("licenses").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setRuns(r ?? []);
    setQueue(q ?? []);
    setLicenses(l ?? []);
    if (s?.content_root_folder_id) setFolderId(s.content_root_folder_id);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (isLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const saveFolder = async () => {
    const { data: existing } = await supabase.from("app_settings").select("id").maybeSingle();
    const { error } = existing
      ? await supabase.from("app_settings").update({ content_root_folder_id: folderId }).eq("id", existing.id)
      : await supabase.from("app_settings").insert({ content_root_folder_id: folderId });
    if (error) toast.error(error.message); else toast.success("Pasta raiz salva");
  };

  const runSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-drive", { body: { trigger: "manual" } });
      if (error) throw error;
      toast.success(`Sync: +${data?.added ?? 0} / ~${data?.modified ?? 0} / -${data?.removed ?? 0}`);
      await load();
    } catch (e: any) { toast.error(e?.message ?? "Falha no sync"); }
    finally { setSyncing(false); }
  };

  const grantLicense = async () => {
    const email = newLicenseEmail.trim().toLowerCase();
    if (!email) return;
    const { error } = await supabase.from("licenses").upsert(
      { email, status: "active", product_code: "VANGUARD_PREMIUM" },
      { onConflict: "email" },
    );
    if (error) toast.error(error.message);
    else { toast.success("Licença concedida"); setNewLicenseEmail(""); await load(); }
  };

  const toggleLicense = async (lic: any) => {
    const next = lic.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("licenses").update({ status: next }).eq("id", lic.id);
    if (error) toast.error(error.message); else { toast.success(`Licença ${next}`); await load(); }
  };

  const bulkGrant = async () => {
    const emails = bulkEmails
      .split(/[\s,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (emails.length === 0) { toast.error("Nenhum email válido"); return; }
    setGranting(true);
    try {
      const { data, error } = await supabase.rpc("admin_grant_licenses", { _emails: emails });
      if (error) throw error;
      toast.success(`${data} licenças ativadas`);
      setBulkEmails("");
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setGranting(false); }
  };

  const createStudentAccount = async () => {
    const email = newUserEmail.trim().toLowerCase();
    if (!email || newUserPass.length < 6) { toast.error("Email e senha (6+) obrigatórios"); return; }
    setCreatingUser(true);
    try {
      // Ensure license exists first so the student can log in later even without admin bypass.
      await supabase.from("licenses").upsert(
        { email, status: "active", product_code: "VANGUARD_PREMIUM" },
        { onConflict: "email" },
      );
      const { data, error } = await supabase.functions.invoke("signup-with-license", {
        body: { email, password: newUserPass, display_name: newUserName || undefined, skip_license: true },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success("Conta criada");
      setNewUserEmail(""); setNewUserPass(""); setNewUserName("");
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setCreatingUser(false); }
  };

  const runDiagnostic = async () => {
    const email = diagEmail.trim().toLowerCase();
    if (!email) return;
    setDiagLoading(true);
    setDiag(null);
    try {
      const { data, error } = await supabase.rpc("admin_lookup_access", { _email: email });
      if (error) throw error;
      setDiag(data);
    } catch (e: any) { toast.error(e.message); }
    finally { setDiagLoading(false); }
  };

  return (
    <div className="space-y-6">
      <Card className="surface-elevated"><CardContent className="p-5 space-y-3">
        <h2 className="font-display font-bold text-lg">Configuração do Drive</h2>
        <div className="flex gap-2">
          <Input placeholder="ID da pasta raiz no Google Drive" value={folderId} onChange={e => setFolderId(e.target.value)} />
          <Button onClick={saveFolder} variant="secondary">Salvar</Button>
          <Button onClick={runSync} disabled={syncing || !folderId}>
            {syncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-1" />}
            Sincronizar agora
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Compartilhe a pasta com a conta de serviço (client_email do GOOGLE_SERVICE_ACCOUNT_JSON) como Leitor.
        </p>
      </CardContent></Card>

      {/* Diagnostic */}
      <Card className="surface-elevated"><CardContent className="p-5 space-y-3">
        <h2 className="font-display font-bold text-lg flex items-center gap-2"><Search className="h-4 w-4 text-accent" /> Diagnóstico de acesso</h2>
        <div className="flex gap-2">
          <Input placeholder="email@dominio.com" value={diagEmail} onChange={e => setDiagEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && runDiagnostic()} />
          <Button onClick={runDiagnostic} disabled={diagLoading}>{diagLoading ? "..." : "Consultar"}</Button>
        </div>
        {diag && (
          <div className="text-sm grid gap-1.5 rounded-md border border-border/40 p-3 bg-muted/30">
            <Row label="Email" value={diag.email} />
            <Row label="Conta existe" value={diag.account_exists ? "Sim" : "Não"} good={diag.account_exists} />
            <Row label="Role" value={diag.role ?? "—"} />
            <Row label="Licença" value={diag.license?.status ?? "sem licença"} good={diag.license?.status === 'active'} />
            <Row label="Produto" value={diag.license?.product_code ?? "—"} />
            <Row label="Assinatura" value={diag.subscription?.status ?? "—"} />
            <Row label="Expira em" value={diag.subscription?.current_period_end ? new Date(diag.subscription.current_period_end).toLocaleString() : "—"} />
            <Row label="Tem acesso" value={diag.has_access ? "SIM" : "NÃO"} good={diag.has_access} bad={!diag.has_access} />
          </div>
        )}
      </CardContent></Card>

      <Card className="surface-elevated"><CardContent className="p-5 space-y-3">
        <h2 className="font-display font-bold text-lg flex items-center gap-2"><KeyRound className="h-4 w-4 text-accent" /> Licenças</h2>
        <div className="flex gap-2">
          <Input placeholder="email@dominio.com" value={newLicenseEmail} onChange={e => setNewLicenseEmail(e.target.value)} />
          <Button onClick={grantLicense}><UserPlus className="h-4 w-4 mr-1" /> Conceder</Button>
        </div>
        <div className="space-y-2 pt-2 border-t border-border/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Importação em massa</p>
          <Textarea
            placeholder="Cole vários emails separados por vírgula, espaço ou nova linha"
            value={bulkEmails}
            onChange={e => setBulkEmails(e.target.value)}
            rows={3}
          />
          <Button onClick={bulkGrant} disabled={granting} variant="secondary">
            <Users className="h-4 w-4 mr-1" /> {granting ? "Processando..." : "Ativar todas"}
          </Button>
        </div>
        <div className="text-sm max-h-64 overflow-y-auto">
          {licenses.length === 0 && <p className="text-muted-foreground">Nenhuma licença.</p>}
          {licenses.map(l => (
            <div key={l.id} className="flex justify-between items-center border-b border-border/40 py-1.5">
              <span className="truncate">{l.email} <span className="text-muted-foreground text-xs">· {l.product_code}</span></span>
              <div className="flex items-center gap-2">
                <span className={l.status === 'active' ? 'text-success text-xs' : 'text-destructive text-xs'}>{l.status}</span>
                <Button size="sm" variant="ghost" onClick={() => toggleLicense(l)}>
                  {l.status === 'active' ? 'Desativar' : 'Ativar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent></Card>

      {/* Create student directly */}
      <Card className="surface-elevated"><CardContent className="p-5 space-y-3">
        <h2 className="font-display font-bold text-lg flex items-center gap-2"><UserPlus className="h-4 w-4 text-accent" /> Criar conta de aluno</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input placeholder="Email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
          <Input placeholder="Senha (6+)" type="text" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} />
          <Input placeholder="Nome (opcional)" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
        </div>
        <Button onClick={createStudentAccount} disabled={creatingUser}>
          {creatingUser ? "Criando..." : "Criar conta + ativar licença"}
        </Button>
        <p className="text-xs text-muted-foreground">A licença é ativada automaticamente e o email é confirmado.</p>
      </CardContent></Card>

      <Card className="surface"><CardContent className="p-5">
        <h3 className="font-display font-bold mb-3">Últimas sincronizações</h3>
        <div className="text-sm space-y-1">
          {runs.length === 0 && <p className="text-muted-foreground">Nenhuma execução ainda.</p>}
          {runs.map(r => (
            <div key={r.id} className="flex justify-between border-b border-border/40 py-1.5">
              <span>{new Date(r.started_at).toLocaleString()} · <span className="text-muted-foreground">{r.trigger}</span></span>
              <span className="tabular-nums">+{r.files_added} / ~{r.files_modified} / -{r.files_removed} · <span className={r.status === 'failed' ? 'text-destructive' : 'text-success'}>{r.status}</span></span>
            </div>
          ))}
        </div>
      </CardContent></Card>

      <Card className="surface"><CardContent className="p-5">
        <h3 className="font-display font-bold mb-3">Fila de processamento</h3>
        <div className="text-sm space-y-1">
          {queue.length === 0 && <p className="text-muted-foreground">Fila vazia.</p>}
          {queue.map(j => (
            <div key={j.id} className="flex justify-between border-b border-border/40 py-1.5">
              <span className="truncate">{j.job_type} · {j.drive_file_id.slice(0, 14)}…</span>
              <span className="text-muted-foreground">{j.status} · tentativas {j.attempts}/{j.max_attempts}</span>
            </div>
          ))}
        </div>
      </CardContent></Card>
    </div>
  );
};
export default Admin;