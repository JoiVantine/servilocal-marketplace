import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, X } from 'lucide-react';
import { TERMS_TEXT as TERMS_HTML, PRIVACY_TEXT as PRIVACY_HTML } from '@/lib/legalContent';

const LOGO_URL = '/logo.png';

export default function ClientWelcome() {
  const navigate = useNavigate();
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!acceptedTerms) return;
    setLoading(true);
    navigate('/client/onboarding');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <button
          onClick={() => navigate('/')}
          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-heading text-lg font-bold">serviLocal</h1>
        <div className="w-8" />
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col h-[calc(100vh-80px)]">
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Illustration */}
          <div className="w-40 h-40 mb-8">
            <img
              src={LOGO_URL}
              alt="Ilustração cidade"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Headline */}
          <h2 className="font-heading text-2xl text-center mb-2 text-foreground">
            Encontre <span className="text-primary">profissionais</span>
            <br />
            da sua cidade
          </h2>

          <p className="text-center text-muted-foreground text-sm mb-6">
            Contrате quem está perto, com poucos cliques.
          </p>

          {/* Benefits */}
          <div className="space-y-3 w-full mb-8">
            {[
              'Cadastro em menos de 2 minutos',
              'Profissionais da sua região',
              'Seus dados ficam protegidos',
            ].map(text => (
              <div key={text} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <p className="text-sm text-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Terms Checkbox */}
        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="w-5 h-5 rounded border-border mt-0.5 cursor-pointer accent-primary"
            />
            <span className="text-xs text-muted-foreground">
              Li e concordo com os{' '}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setShowTerms(true);
                }}
                className="text-primary hover:underline font-medium"
              >
                Termos de Uso
              </button>{' '}
              e{' '}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setShowPrivacy(true);
                }}
                className="text-primary hover:underline font-medium"
              >
                Política de Privacidade
              </button>
            </span>
          </label>

          {/* CTA */}
          <button
            onClick={handleContinue}
            disabled={!acceptedTerms || loading}
            className="w-full px-4 py-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Começar cadastro
          </button>

          <p className="text-xs text-muted-foreground text-center">
            Sem dados são protegidos e nunca serão compartilhados.
          </p>
        </div>
      </div>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg w-full max-w-sm max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Termos de Uso</h3>
              <button
                onClick={() => setShowTerms(false)}
                className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-xs text-muted-foreground whitespace-pre-wrap">
              {TERMS_HTML}
            </div>
            <div className="p-4 border-t border-border">
              <button
                onClick={() => setShowTerms(false)}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg w-full max-w-sm max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Política de Privacidade</h3>
              <button
                onClick={() => setShowPrivacy(false)}
                className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-xs text-muted-foreground whitespace-pre-wrap">
              {PRIVACY_HTML}
            </div>
            <div className="p-4 border-t border-border">
              <button
                onClick={() => setShowPrivacy(false)}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}