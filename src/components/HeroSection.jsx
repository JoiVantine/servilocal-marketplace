import { Search, Building2, ChevronRight, MapPin } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { useState } from 'react';

const LOGO_URL = "/logo.png";

export default function HeroSection() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSelectRole = (role) => {
    navigate(role === 'client' ? '/client/welcome' : '/provider/welcome');
  };


  return (
    <section className="flex flex-col items-center px-4 pt-8 pb-12">
      {/* Brand */}
      <div className="flex items-center gap-2 mb-3">
        <img src={LOGO_URL} alt="ServiLocal" className="w-8 h-8 object-contain" />
        <span className="text-xl font-body font-semibold tracking-tight text-foreground">
          servi<span className="font-normal">Local</span>
        </span>
      </div>

      {/* Tagline pill */}
      <div className="flex items-center gap-1.5 bg-secondary/60 text-muted-foreground text-sm px-4 py-1.5 rounded-full mb-8">
        <MapPin className="w-3.5 h-3.5 text-primary" />
        Da sua cidade, para a sua cidade
      </div>

      {/* Illustration */}
      <div className="w-44 h-44 mb-8">
        <img
          src={LOGO_URL}
          alt="Ilustração cidade"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Headline */}
      <h1 className="font-heading text-2xl sm:text-3xl text-center leading-tight mb-3 max-w-md">
        Encontre profissionais{" "}
        <span className="text-primary">da sua cidade</span>
      </h1>

      <p className="text-muted-foreground text-center text-sm sm:text-base max-w-sm mb-8 leading-relaxed">
        Conectamos clientes e prestadores locais de forma simples, rápida e direta.
      </p>

      {/* CTAs */}
      <div className="w-full max-w-sm flex flex-col gap-3">
        <button
          onClick={() => handleSelectRole('client')}
          disabled={loading}
          className="flex items-center w-full bg-primary text-primary-foreground rounded-xl px-5 py-4 text-left font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-70"
        >
          <span className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center mr-3">
            <Search className="w-4 h-4" />
          </span>
          <span className="flex-1">Quero contratar um serviço</span>
          <ChevronRight className="w-5 h-5 opacity-70" />
        </button>

        <button
          onClick={() => handleSelectRole('provider')}
          disabled={loading}
          className="flex items-center w-full bg-card border border-border rounded-xl px-5 py-4 text-left font-medium text-sm hover:bg-secondary/50 transition-colors disabled:opacity-70"
        >
          <span className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center mr-3">
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </span>
          <span className="flex-1 text-foreground">Quero oferecer meu serviço</span>
          <ChevronRight className="w-5 h-5 text-muted-foreground opacity-70" />
        </button>
      </div>
    </section>
  );
}