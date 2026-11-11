import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BrainCircuit,
  Code2,
  Database,
  EyeOff,
  Lock,
  Radar,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <Badge variant="info">
          <Shield className="h-3.5 w-3.5" />
          System Architecture &amp; Security Principles
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          About PhishGuard AI
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          <strong>PhishGuard AI</strong> (<em>An Intelligent Machine Learning-Based
          Phishing URL Detection System</em>) is a full-stack cybersecurity web
          application designed to identify potentially malicious and phishing
          links through passive lexical and structural URL analysis.
        </p>
      </div>

      {/* Core Engineering Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <EyeOff className="h-5 w-5 text-cyan-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                1. Strictly Passive URL Analysis
              </h2>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-2">
            <p>
              PhishGuard AI never visits, fetches, resolves via DNS, or executes
              submitted URLs. All 24 lexical and structural features are
              computed purely in memory from the parsed URL string.
            </p>
            <p>
              This architectural boundary eliminates Server-Side Request Forgery
              (SSRF) risks and ensures that scanning a phishing link never
              alerts the attacker or triggers tracking tokens embedded in a
              victim&apos;s URL.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <Lock className="h-5 w-5 text-emerald-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                2. Privacy-Preserving Persistence
              </h2>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-2">
            <p>
              Users frequently inspect links that contain sensitive query
              parameters such as session identifiers, password reset tokens, or
              email addresses.
            </p>
            <p>
              Before storing any scan record in the database, PhishGuard AI
              automatically redacts all query parameter values (
              <code className="font-mono">?token=[REDACTED]</code>) and URL
              credentials while preserving structural parameter counts computed
              in volatile memory.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <BrainCircuit className="h-5 w-5 text-blue-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                3. Zero Training–Serving Skew
              </h2>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-2">
            <p>
              Both the offline model training pipeline and the live FastAPI
              inference endpoint import the exact same deterministic Python
              feature extraction module (
              <code className="font-mono">feature_extraction.py</code>).
            </p>
            <p>
              Candidate classifiers (Logistic Regression, Decision Tree, Random
              Forest, and XGBoost) were trained and benchmarked on 14,411
              cleaned, deduplicated raw URLs licensed under CC BY 4.0.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                4. Honest Calibration &amp; Limitations
              </h2>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-2">
            <p>
              Lexical URL analysis evaluates structural patterns in the URL
              string itself. It does not inspect live webpage HTML, visual
              spoofing, or newly compromised pages hosted on clean legitimate
              domains.
            </p>
            <p>
              Therefore, machine learning predictions are statistical estimates
              and cannot guarantee that a website is safe.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Technology Stack Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <Code2 className="h-5 w-5 text-cyan-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Full-Stack Technology Architecture
            </h2>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-cyan-500" />
              Frontend (Vercel)
            </div>
            <p className="text-slate-500">
              React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui patterns,
              Framer Motion, Recharts, Lucide React.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <BrainCircuit className="h-4 w-4 text-blue-500" />
              Backend &amp; ML (Render)
            </div>
            <p className="text-slate-500">
              Python 3.12, FastAPI, Pydantic v2, scikit-learn, XGBoost, Pandas,
              NumPy, Joblib versioned artifact registry.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Database className="h-4 w-4 text-emerald-500" />
              Persistence Layer
            </div>
            <p className="text-slate-500">
              PostgreSQL (production) &amp; SQLite (zero-config local dev),
              SQLAlchemy 2.0 ORM, Alembic schema migrations.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link to="/scanner">
          <Button size="lg">
            <Radar className="h-5 w-5" />
            Launch URL Scanner
          </Button>
        </Link>
        <Link to="/model-insights">
          <Button variant="outline" size="lg">
            Inspect Model Evaluation
          </Button>
        </Link>
      </div>
    </div>
  );
}
