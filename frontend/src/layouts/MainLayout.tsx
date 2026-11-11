import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  History,
  Info,
  Menu,
  Moon,
  Radar,
  Shield,
  Sun,
  X,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { phishGuardApi } from "@/services/api";
import type { HealthResponse } from "@/types/api";
import { cn } from "@/utils/cn";

const NAV_ITEMS = [
  { to: "/", label: "Overview", icon: Shield, end: true },
  { to: "/scanner", label: "URL Scanner", icon: Radar },
  { to: "/history", label: "Scan History", icon: History },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/model-insights", label: "Model Insights", icon: BrainCircuit },
  { to: "/about", label: "About", icon: Info },
];

export function MainLayout() {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let mounted = true;
    phishGuardApi
      .getHealth()
      .then((res) => {
        if (mounted) setHealth(res);
      })
      .catch(() => {
        if (mounted) setHealth(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#060B16] text-slate-900 dark:text-slate-100 cyber-grid-bg">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#060B16]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-cyber-glow">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                PhishGuard{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">
                  AI
                </span>
              </span>
              <span className="hidden sm:block text-[10px] font-medium text-slate-500 dark:text-slate-400 -mt-0.5">
                ML Threat Intelligence
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav
            aria-label="Main Navigation"
            className="hidden lg:flex items-center gap-1"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all",
                      isActive
                        ? "bg-gradient-to-r from-blue-600/15 to-cyan-500/15 text-blue-600 dark:text-cyan-300 border border-cyan-500/30"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right Controls: Live Engine Status + Theme Toggle + Mobile Menu */}
          <div className="flex items-center gap-2.5">
            <div
              title={
                health?.model_loaded
                  ? `ML Engine Active (${health.model_version})`
                  : "Connecting to ML Engine"
              }
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/90 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  health?.model_loaded
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-amber-500"
                )}
              />
              <Activity className="h-3.5 w-3.5 text-cyan-500" />
              <span className="font-mono text-[11px]">
                {health?.model_loaded
                  ? `Engine ${health.model_version}`
                  : "API Standby"}
              </span>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-cyan-500/40 transition-colors"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle mobile navigation"
              aria-expanded={mobileMenuOpen}
              className="lg:hidden h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 flex items-center justify-center text-slate-600 dark:text-slate-300"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <nav
            aria-label="Mobile Navigation"
            className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1221] px-4 py-3 space-y-1"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                      isActive
                        ? "bg-cyan-500/15 text-blue-600 dark:text-cyan-300 border border-cyan-500/30"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-[#060B16]/90 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  PhishGuard AI
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                An Intelligent Machine Learning-Based Phishing URL Detection
                System. Detect Threats. Protect Your Digital World.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
                Platform Modules
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Link to="/scanner" className="hover:text-cyan-400">
                  URL Scanner
                </Link>
                <Link to="/analytics" className="hover:text-cyan-400">
                  Analytics Dashboard
                </Link>
                <Link to="/history" className="hover:text-cyan-400">
                  Scan History
                </Link>
                <Link to="/model-insights" className="hover:text-cyan-400">
                  Model Insights
                </Link>
                <Link to="/about" className="hover:text-cyan-400">
                  Security &amp; Privacy
                </Link>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Passive Security Guarantee
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                PhishGuard AI analyzes lexical and structural URL features
                purely in memory. It never visits, opens, or executes submitted
                URLs. Machine learning predictions are statistical estimates and
                cannot guarantee that a website is safe.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              &copy; {new Date().getFullYear()} PhishGuard AI. All rights reserved.
            </span>
            <span className="font-mono text-[11px]">
              Model: XGBoost v1.0.0 &bull; 24 Lexical Features &bull; CC BY 4.0 Verified Corpus
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
