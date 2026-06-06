import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const SLIDES = [
  {
    img: '/onboarding-city.png',
    title: 'Bem-vindo ao ServiLocal',
    subtitle: 'Encontre profissionais da sua cidade para resolver o que você precisa.',
  },
  {
    img: '/onboarding-map.png',
    title: 'Serviços perto de você',
    subtitle: 'Encontre profissionais da sua região em poucos minutos.',
  },
  {
    img: '/onboarding-chat.png',
    title: 'Converse antes de contratar',
    subtitle: 'Receba propostas, tire dúvidas e escolha o melhor profissional.',
  },
];

export default function ClientWelcome() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const touchStart = useRef(null);
  const isLast = current === SLIDES.length - 1;

  const goTo = (idx) => setCurrent(Math.max(0, Math.min(SLIDES.length - 1, idx)));

  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const delta = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) goTo(current + (delta > 0 ? 1 : -1));
    touchStart.current = null;
  };

  const slide = SLIDES[current];

  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-between px-6 py-12 select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Logo topo */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-foreground tracking-tight">
          Servi<span className="text-primary">Local</span>
        </span>
      </div>

      {/* Conteúdo central */}
      <div className="flex flex-col items-center text-center gap-6 flex-1 justify-center">
        <img
          key={current}
          src={slide.img}
          alt={slide.title}
          className="w-64 h-64 object-contain drop-shadow-md transition-opacity duration-300"
          onError={(e) => { e.currentTarget.src = '/onboarding-city.png'; }}
        />

        <div className="space-y-3">
          <h1 className="font-heading text-3xl font-bold text-foreground leading-snug">
            {slide.title}
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-xs mx-auto">
            {slide.subtitle}
          </p>
        </div>

        {/* Dots */}
        <div className="flex gap-2 mt-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-6 h-2 bg-primary'
                  : 'w-2 h-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Rodapé */}
      <div className="w-full max-w-sm space-y-4">
        {isLast ? (
          <button
            onClick={() => navigate('/client')}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-semibold text-base hover:opacity-90 transition-opacity shadow-md"
          >
            Começar
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/client')}
              className="flex-1 py-4 border border-border text-muted-foreground rounded-2xl font-medium text-base hover:bg-muted/50 transition-colors"
            >
              Pular
            </button>
            <button
              onClick={() => goTo(current + 1)}
              className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-semibold text-base hover:opacity-90 transition-opacity shadow-md"
            >
              Próximo
            </button>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <button
            onClick={() => navigate('/login?role=client')}
            className="text-primary font-semibold hover:underline"
          >
            Entrar
          </button>
        </p>

        <p className="text-center text-xs text-muted-foreground/70 leading-relaxed">
          Ao continuar, você concorda com os{' '}
          <button
            onClick={() => navigate('/client/terms')}
            className="underline hover:text-muted-foreground"
          >
            Termos de Uso
          </button>{' '}
          e a{' '}
          <button
            onClick={() => navigate('/client/privacy')}
            className="underline hover:text-muted-foreground"
          >
            Política de Privacidade
          </button>.
        </p>
      </div>
    </div>
  );
}
