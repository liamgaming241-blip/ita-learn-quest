import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert } from "lucide-react";

const SubscriptionRequired = () => {
  const { signOut, user } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-lg w-full surface-elevated">
        <CardContent className="p-8 text-center space-y-5">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-accent" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display font-extrabold text-2xl">Assinatura necessária</h1>
            <p className="text-muted-foreground text-sm">
              A conta <span className="text-foreground font-medium">{user?.email}</span> não possui uma assinatura ativa do VANGUARD PREMIUM.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full"><a href="https://kwify.app" target="_blank" rel="noreferrer">Assinar VANGUARD PREMIUM</a></Button>
            <Button variant="ghost" onClick={signOut}>Sair</Button>
            <Link to="/" className="text-xs text-muted-foreground hover:text-accent">Já assinei — atualizar acesso</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
export default SubscriptionRequired;