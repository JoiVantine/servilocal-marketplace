import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Search, Building2, ChevronRight } from 'lucide-react';
import HeroSection from "../components/HeroSection";
import HowItWorks from "../components/HowItWorks";
import Benefits from "../components/Benefits";

const LOGO_URL = "https://media.base44.com/images/public/user_6a1b978483783dbaa09aae7d/7e2cd2b0e_ChatGPT_Image_27_de_mai_de_2026__10_42_43-removebg-preview.png";

export default function Home() {
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated, isLoadingAuth } = useAuth();
  const [hasProfile, setHasProfile] = useState(null);
  const [checkingProfile, setCheckingProfile] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !authUser) {
      setHasProfile(null);
      return;
    }
    setCheckingProfile(true);
    base44.entities.UserProfile.filter({ userId: authUser.id })
      .then(profiles => setHasProfile(profiles.some(p => p.onboardingCompleted)))
      .catch(() => setHasProfile(false))
      .finally(() => setCheckingProfile(false));
  }, [isAuthenticated, authUser]);

  const enterAs = async (role) => {
    localStorage.setItem('sl_role', role);
    const profiles = await base44.entities.UserProfile.filter({ userId: authUser.id });
    const profile = profiles.find(
      p => (p.role === role || p.role === 'both') && p.onboardingCompleted
    );
    navigate(profile
      ? (role === 'client' ? '/client' : '/provider')
      : (role === 'client' ? '/client/onboarding' : '/provider/onboarding')
    );
  };

  if (isLoadingAuth || checkingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (authUser && hasProfile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <img src={LOGO_URL} alt="ServiLocal" className="w-20 h-20 object-contain mb-6" />
        <h2 className="font-heading text-2xl font-bold text-foreground mb-1 text-center">
          Bem-vindo de volta!<br />
          <span className="text-primary">{authUser.full_name?.split(' ')[0]}</span>
        </h2>
        <p className="text-sm text-muted-foreground mb-8 text-center">Como você quer entrar hoje?</p>
        <div className="w-full max-w-sm flex flex-col gap-3">
          <button
            onClick={() => enterAs('client')}
            className="flex items-center w-full bg-primary text-primary-foreground rounded-xl px-5 py-4 text-left font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <span className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center mr-3">
              <Search className="w-4 h-4" />
            </span>
            <span className="flex-1">Entrar como Cliente</span>
            <ChevronRight className="w-5 h-5 opacity-70" />
          </button>
          <button
            onClick={() => enterAs('provider')}
            className="flex items-center w-full bg-card border border-border rounded-xl px-5 py-4 text-left font-medium text-sm hover:bg-secondary/50 transition-colors"
          >
            <span className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center mr-3">
              <Building2 className="w-4 h-4 text-muted-foreground" />
            </span>
            <span className="flex-1 text-foreground">Entrar como Prestador</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground opacity-70" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body">
      <div className="max-w-lg mx-auto pb-16">
        <HeroSection />
        <HowItWorks />
        <Benefits />
      </div>
    </div>
  );
}
