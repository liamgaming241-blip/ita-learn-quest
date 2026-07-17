import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { VanguardLogo } from "@/components/VanguardLogo";
import {
  LayoutDashboard, BookOpen, FileQuestion, Trophy,
  TrendingDown, FolderSync, LogOut, Menu, Sun, Moon, Radar,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navSections = [
  {
    label: "Mission",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Mission Control" },
    ],
  },
  {
    label: "Estudo",
    items: [
      { to: "/subjects", icon: BookOpen, label: "Aulas" },
      { to: "/questions", icon: FileQuestion, label: "Questões" },
      { to: "/simulados", icon: Trophy, label: "Simulados" },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { to: "/weak-topics", icon: TrendingDown, label: "Pontos Fracos" },
      { to: "/drive-setup", icon: FolderSync, label: "Fontes de Dados" },
    ],
  },
];

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Mission Control", subtitle: "Sua central estratégica de aprovação" },
  "/subjects": { title: "Aulas", subtitle: "Biblioteca de conteúdo por matéria" },
  "/questions": { title: "Questões", subtitle: "Treino direcionado estilo ITA" },
  "/simulados": { title: "Simulados", subtitle: "Provas cronometradas e análise" },
  "/weak-topics": { title: "Pontos Fracos", subtitle: "Onde você deve focar agora" },
  "/drive-setup": { title: "Fontes de Dados", subtitle: "Google Drive e planilhas conectadas" },
};

export const AppLayout = () => {
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const meta = pageTitles[location.pathname] ?? { title: "VANGUARD", subtitle: "" };
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Cadete";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center px-5 border-b border-sidebar-border">
          <VanguardLogo />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/40">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map(({ to, icon: Icon, label }) => {
                  const active = location.pathname === to;
                  return (
                    <li key={to}>
                      <Link
                        to={to}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                          active
                            ? "bg-sidebar-accent text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-primary-foreground"
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-sidebar-primary" />
                        )}
                        <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-primary")} />
                        <span>{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3 space-y-1.5">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-sidebar-accent/50">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-display font-bold text-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-primary-foreground truncate leading-tight">{displayName}</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-primary-foreground text-xs"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="mr-1.5 h-3.5 w-3.5" /> : <Moon className="mr-1.5 h-3.5 w-3.5" />}
              Tema
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 justify-start text-sidebar-foreground/80 hover:bg-destructive/20 hover:text-destructive text-xs"
              onClick={signOut}
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b border-border/60 bg-background/80 backdrop-blur-xl px-4 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden -ml-2"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
              <Radar className="h-3 w-3 text-accent" />
              <span>VANGUARD</span>
              <span className="text-border">/</span>
              <span className="truncate">{meta.title}</span>
            </div>
            <h1 className="font-display font-extrabold text-lg sm:text-xl leading-tight truncate">{meta.title}</h1>
          </div>

          <div className="hidden md:flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 pulse-dot"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
            </span>
            <span className="text-[11px] font-medium text-muted-foreground tracking-wide">Sistemas operacionais</span>
          </div>

          <Button variant="ghost" size="icon" onClick={toggleTheme} className="hidden lg:flex" aria-label="Alternar tema">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 lg:px-8 py-6 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};