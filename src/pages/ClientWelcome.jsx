import { useNavigate } from 'react-router-dom';

const CITY_ILLUSTRATION = '/logo.png';

export default function ClientWelcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-between px-6 py-12">

      {/* Logo mark topo */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-foreground tracking-tight">
          Servi<span className="text-primary">Local</span>
        </span>
      </div>

      {/* Centro — ilustração + textos */}
      <div className="flex flex-col items-center text-center gap-6 flex-1 justify-center">
        <img
          src={CITY_ILLUSTRATION}
          alt="Centro da cidade"
          className="w-64 h-64 object-contain drop-shadow-md"
        />

        <div className="space-y-3">
          <h1 className="font-heading text-3xl font-bold text-foreground leading-snug">
            Bem-vindo ao ServiLocal
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-xs mx-auto">
            Encontre profissionais da sua cidade para resolver o que você precisa.
          </p>
        </div>
      </div>

      {/* Rodapé — botão + link login */}
      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => navigate('/client')}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-semibold text-base hover:opacity-90 transition-opacity shadow-md"
        >
          Começar
        </button>

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
