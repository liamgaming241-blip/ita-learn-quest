import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Rocket, BookOpen, Brain, Trophy } from "lucide-react";

const features = [
  { icon: BookOpen, text: "Aulas organizadas automaticamente" },
  { icon: Brain, text: "Questões estilo ITA com IA" },
  { icon: Trophy, text: "Simulados e análise de desempenho" },
];

const Auth = () => {
  const { user, signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        if (!displayName.trim()) {
          toast({ title: "Nome obrigatório", variant: "destructive" });
          setLoading(false);
          return;
        }
        await signUp(email, password, displayName);
        toast({ title: "Conta criada!", description: "Verifique seu email para confirmar." });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel - branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="relative z-10 text-primary-foreground max-w-md">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 mb-8">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-4xl font-bold mb-3 leading-tight">Sua aprovação no ITA começa aqui</h1>
          <p className="text-lg opacity-80 mb-10">
            Plataforma inteligente que transforma seu Google Drive em um sistema completo de estudos com IA.
          </p>
          <div className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm opacity-90">{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-10 -bottom-20 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2 lg:hidden">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary">
              <GraduationCap className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">ITA Study Platform</h1>
            <p className="text-sm text-muted-foreground">Sua plataforma inteligente de estudos</p>
          </div>

          <Card className="glass border-0 shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">{isLogin ? "Entrar" : "Criar Conta"}</CardTitle>
              <CardDescription>
                {isLogin ? "Entre com suas credenciais para continuar" : "Crie sua conta gratuita"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <Input
                    placeholder="Nome completo"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required={!isLogin}
                    autoComplete="name"
                  />
                )}
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                <Input
                  type="password"
                  placeholder="Senha (mínimo 6 caracteres)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <Button type="submit" className="w-full gradient-primary h-11" disabled={loading}>
                  <Rocket className="mr-2 h-4 w-4" />
                  {loading ? "Carregando..." : isLogin ? "Entrar" : "Criar Conta"}
                </Button>
              </form>
              <div className="mt-5 text-center text-sm">
                <button
                  onClick={() => { setIsLogin(!isLogin); setDisplayName(""); }}
                  className="text-primary hover:underline font-medium"
                >
                  {isLogin ? "Não tem conta? Crie gratuitamente" : "Já tem conta? Entre"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;
