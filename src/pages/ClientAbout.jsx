import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import pkg from '../../package.json';
import { ChevronLeft, ChevronRight, X, User, FileText, Lock, Shield } from 'lucide-react';
import { TERMS_TEXT, PRIVACY_TEXT } from '@/lib/legalContent';
import ClientBottomNav from '@/components/ClientBottomNav';

const LOGO_URL = '/onboarding-city.png';

const ABOUT_TEXT = `O ServiLocal é uma plataforma digital que conecta clientes a prestadores de serviços locais da sua cidade.

Nosso objetivo é facilitar o acesso a profissionais qualificados na sua região, com segurança e praticidade.

Versão atual: 1.0.0 — MVP / Beta

Em fase experimental. Funcionalidades podem sofrer ajustes. Para dúvidas, acesse "Ajuda e suporte".`;

const LGPD_TEXT = `LEI GERAL DE PROTEÇÃO DE DADOS — Lei nº 13.709/2018

A LGPD estabelece regras sobre coleta, armazenamento, tratamento e compartilhamento de dados pessoais no Brasil.

SEUS DIREITOS COMO TITULAR
• Acesso aos seus dados pessoais
• Correção de dados incompletos ou incorretos
• Anonimização, bloqueio ou eliminação de dados desnecessários
• Portabilidade dos dados a outro fornecedor
• Eliminação dos dados tratados com seu consentimento
• Informação sobre compartilhamentos realizados
• Revogação do consentimento a qualquer momento

Para exercer seus direitos, entre em contato pelo suporte do aplicativo.`;

function InfoModal({ title, content, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
        <div className="p-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientAbout() {
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);

  const items = [
    {
      icon: User,
      label: 'Sobre o ServiLocal',
      description: 'Saiba mais sobre o aplicativo',
      key: 'about',
    },
    {
      icon: FileText,
      label: 'Termos de uso',
      description: 'Leia os termos de uso do app',
      key: 'terms',
    },
    {
      icon: Lock,
      label: 'Política de privacidade',
      description: 'Entenda como cuidamos dos seus dados',
      key: 'privacy',
    },
    {
      icon: Shield,
      label: 'LGPD',
      description: 'Informações sobre a lei de proteção de dados',
      key: 'lgpd',
    },
  ];

  const modalContent = {
    about:   { title: 'Sobre o ServiLocal',        content: ABOUT_TEXT },
    terms:   { title: 'Termos de Uso',             content: TERMS_TEXT },
    privacy: { title: 'Política de Privacidade',   content: PRIVACY_TEXT },
    lgpd:    { title: 'LGPD',                      content: LGPD_TEXT },
  };

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 bg-background border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-heading text-lg font-bold text-foreground">Sobre o aplicativo</h1>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-3">
        {/* Logo + version */}
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <img src={LOGO_URL} alt="ServiLocal" className="w-14 h-14 object-contain" />
          <div>
            <p className="font-bold text-foreground text-lg">
              Servi<span className="text-primary">Local</span>
            </p>
            <p className="text-sm text-muted-foreground">Versão {pkg.version}</p>
          </div>
        </div>

        {/* Items */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {items.map((item, i) => (
            <button
              key={item.key}
              onClick={() => setModal(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-secondary/30 transition-colors text-left ${
                i > 0 ? 'border-t border-border' : ''
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {modal && (
        <InfoModal
          title={modalContent[modal].title}
          content={modalContent[modal].content}
          onClose={() => setModal(null)}
        />
      )}

      <ClientBottomNav active="menu" />
    </div>
  );
}
