import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { VanguardLogo } from "@/components/VanguardLogo";
import { Target, Radar, Brain, Sparkles } from "lucide-react";

const missionPoints = [
  { icon: Radar, text: "Mission control com telemetria de aprovação" },
  { icon: Brain, text: "IA calibrada para o padrão ITA e IME" },
  { icon: Target, text: "Detecção precisa dos seus pontos fracos" },
];

const Auth = () => {
  const { user, signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [purchaseEmail, setPurchaseEmail] = useState("");
  const [showPurchaseField, setShowPurchaseField] = useState(false);
  const { toast } = useToast();

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normEmail = email.trim().toLowerCase();
    if (!normEmail || !password.trim()) return;
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(normEmail, password);
      } else {
        if (!displayName.trim()) {
          toast({ title: "Nome obrigatório", variant: "destructive" });
          setLoading(false);
          return;
        }
        const body: Record<string, unknown> = { email: normEmail, password, display_name: displayName.trim() };
        if (purchaseEmail.trim()) body.purchase_email = purchaseEmail.trim().toLowerCase();
        const { data, error } = await supabase.functions.invoke("signup-with-license", { body });
        if (error || (data && (data as any).error)) {
          const errData = (data as any) || {};
          const msg = errData.error || error?.message || "Falha no cadastro";
          if (errData.code === "no_license" && !purchaseEmail.trim()) {
            setShowPurchaseField(true);
            toast({ title: "Licença não encontrada", description: errData.hint || msg, variant: "destructive" });
            setLoading(false);
            return;
          }
          throw new Error(msg);
        }
        await signIn(normEmail, password);
        toast({ title: "Bem-vindo à Vanguard", description: "Sua licença foi validada." });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* LEFT — brand panel */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden gradient-hero">
        <div className="absolute inset-0 bg-grid opacity-[0.08]" />
        <motion.div
          aria-hidden
          className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-accent/12 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-primary/40 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.4, 0.65, 0.4] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full text-primary-foreground">
          <VanguardLogo />

          <div className="max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-accent"
            >
              <Sparkles className="h-3 w-3" /> Elite prep intelligence
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }}
              className="mt-6 font-display font-extrabold text-5xl xl:text-6xl leading-[1.02]"
            >
              À frente da <span className="text-gold">aprovação</span>.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.6 }}
              className="mt-5 text-lg text-primary-foreground/70 leading-relaxed"
            >
              A plataforma premium de inteligência de estudos para candidatos ao ITA e IME. Precisão, disciplina e dados a cada movimento.
            </motion.p>

            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.55 } } }}
              className="mt-10 space-y-4"
            >
              {missionPoints.map(({ icon: Icon, text }) => (
                <motion.div
                  key={text}
                  variants={{
                    hidden: { opacity: 0, x: -12 },
                    show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
                  }}
                  className="flex items-center gap-3"
                >
                  <div className="h-10 w-10 shrink-0 rounded-lg border border-accent/25 bg-accent/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-accent" />
                  </div>
                  <span className="text-sm text-primary-foreground/85">{text}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <div className="flex items-center gap-6 text-[11px] text-primary-foreground/40 font-mono uppercase tracking-[0.18em]">
            <span>v.01 · Mission Ready</span>
            <span>·</span>
            <span>ITA · IME</span>
          </div>
        </div>
      </div>

      {/* RIGHT — form */}
      <div className="flex flex-1 items-center justify-center p-5 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
          className="w-full max-w-md space-y-8"
        >
          <div className="lg:hidden">
            <VanguardLogo />
          </div>

          <div>
            <p className="text-[10px] uppercase font-semibold tracking-[0.22em] text-muted-foreground">
              {isLogin ? "Entrar na base" : "Novo cadete"}
            </p>
            <h2 className="font-display font-extrabold text-3xl mt-2">
              {isLogin ? "Acesse sua central." : "Crie sua conta."}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {isLogin
                ? "Continue exatamente de onde parou. Seus dados de missão estão a salvo."
                : "Gratuito. Configure em menos de um minuto e comece a operar."}
            </p>
          </div>

          <Card className="surface-elevated border-border/60">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.3 }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nome</label>
                    <Input
                      placeholder="Como devemos te chamar"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required={!isLogin}
                      autoComplete="name"
                      className="h-11 focus-visible:ring-accent"
                    />
                  </motion.div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    placeholder="cadete@vanguard.app"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-11 focus-visible:ring-accent"
                  />
                </div>
                {!isLogin && showPurchaseField && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-accent">Email usado na compra (Kwify)</label>
                    <Input
                      type="email"
                      placeholder="Se você comprou com outro email, informe aqui"
                      value={purchaseEmail}
                      onChange={(e) => setPurchaseEmail(e.target.value)}
                      autoComplete="email"
                      className="h-11 focus-visible:ring-accent"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Vamos vincular sua compra a este novo email de acesso automaticamente.
                    </p>
                  </motion.div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Senha</label>
                  <Input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    className="h-11 focus-visible:ring-accent"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 gradient-gold text-accent-foreground shadow-gold font-semibold hover:opacity-95 hover:scale-[1.02]"
                  disabled={loading}
                >
                  {loading ? (
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    >
                      Autenticando…
                    </motion.span>
                  ) : isLogin ? "Entrar na base" : "Criar conta"}
                </Button>
              </form>

              <div className="mt-5 text-center">
                <button
                  onClick={() => { setIsLogin(!isLogin); setDisplayName(""); }}
                  className="text-sm text-muted-foreground hover:text-accent"
                >
                  {isLogin ? "Ainda não é cadete? Crie sua conta →" : "← Já tem acesso? Entre"}
                </button>
              </div>
            </CardContent>
          </Card>

          <p className="text-[11px] text-center text-muted-foreground/70">
            Ao continuar você aceita nossos termos e política de privacidade.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;