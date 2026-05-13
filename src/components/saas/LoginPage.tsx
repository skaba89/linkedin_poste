'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { apiFetch, ApiClientError } from '@/lib/api';
import { useAppStore } from '@/store/use-app-store';
import { toast } from 'sonner';
import { Linkedin, Loader2, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const setUser = useAppStore((s) => s.setUser);
  const setToken = useAppStore((s) => s.setToken);
  const setView = useAppStore((s) => s.setView);

  useEffect(() => {
    setEmail('');
    setPassword('');
    setName('');
  }, [isRegister]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        await apiFetch<{ message: string }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, name }),
        });
        toast.success('Compte créé avec succès ! Connectez-vous.');
        setIsRegister(false);
      } else {
        const data = await apiFetch<{ user: import('@/types').User; token: string }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setUser(data.user);
        setToken(data.token);
        setView('dashboard');
        toast.success(`Bienvenue, ${data.user.name} !`);
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      } else {
        toast.error('Erreur de connexion au serveur');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo / Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Linkedin className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              LinkedInPost
            </h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Gestion intelligente de contenu LinkedIn
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border-border/50 shadow-xl shadow-black/5 dark:shadow-black/20">
          <CardHeader className="pb-2 pt-6 px-6">
            <h2 className="text-lg font-semibold text-center">
              {isRegister ? 'Créer un compte' : 'Se connecter'}
            </h2>
            <p className="text-sm text-muted-foreground text-center">
              {isRegister
                ? 'Rejoignez votre équipe de gestion de contenu'
                : 'Accédez à votre espace de gestion'}
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet</Label>
                  <Input
                    id="name"
                    placeholder="Jean Dupont"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={loading}
                    className="h-10"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@entreprise.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                  className="h-10"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-10 font-medium"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {isRegister ? 'Création...' : 'Connexion...'}
                  </>
                ) : isRegister ? (
                  'Créer mon compte'
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>

            <div className="mt-5">
              <Separator />
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {isRegister ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-sm font-medium text-primary hover:text-primary/80 mt-1 transition-colors"
                >
                  {isRegister
                    ? 'Se connecter'
                    : 'Créer un compte'}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} LinkedInPost — Gestion de Contenu SaaS
        </p>
      </div>
    </div>
  );
}
