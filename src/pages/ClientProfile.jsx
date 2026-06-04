import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { ChevronLeft, ChevronRight, User, Mail, Phone, Calendar, Lock } from 'lucide-react';
import EditProfileModal from '@/components/EditProfileModal';
import ClientBottomNav from '@/components/ClientBottomNav';

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function ClientProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate('/'));
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const fullName = user.fullName || user.full_name || '';
  const firstName = fullName.split(' ')[0] || '';

  const fields = [
    {
      icon: User,
      label: 'Nome completo',
      value: fullName || '—',
      action: () => setShowEdit(true),
    },
    {
      icon: Mail,
      label: 'E-mail',
      value: user.email || '—',
      action: () => setShowEdit(true),
    },
    {
      icon: Phone,
      label: 'Telefone',
      value: user.phone || '—',
      action: () => setShowEdit(true),
    },
    {
      icon: Calendar,
      label: 'Data de nascimento',
      value: formatDate(user.birthDate || user.birth_date) || '—',
      action: () => setShowEdit(true),
    },
    {
      icon: Lock,
      label: 'Senha',
      value: '••••••••••',
      action: () => navigate(`/setup-password?email=${encodeURIComponent(user.email || '')}`),
    },
  ];

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
        <h1 className="font-heading text-lg font-bold text-foreground">Meus dados</h1>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-3">
        {/* Profile summary card */}
        <button
          onClick={() => setShowEdit(true)}
          className="w-full bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:bg-secondary/20 transition-colors text-left shadow-sm"
        >
          {user.photo ? (
            <img
              src={user.photo}
              alt="foto"
              className="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-primary/20"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground">{fullName || '—'}</p>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            {user.phone && <p className="text-sm text-muted-foreground">{user.phone}</p>}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>

        {/* Fields list */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground tracking-widest mb-2 px-1">
            INFORMAÇÕES PESSOAIS
          </p>
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            {fields.map((field, i) => (
              <button
                key={field.label}
                onClick={field.action}
                className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-secondary/30 transition-colors text-left ${
                  i > 0 ? 'border-t border-border' : ''
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <field.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{field.label}</p>
                  <p className="text-sm font-medium text-foreground truncate">{field.value}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {showEdit && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEdit(false)}
          onSaved={(updates) => {
            if (updates) {
              setUser((prev) => ({
                ...prev,
                photo: updates.photo ?? prev.photo,
                fullName: updates.name ?? prev.fullName,
                full_name: updates.name ?? prev.full_name,
                city: updates.city ?? prev.city,
              }));
            }
          }}
        />
      )}

      <ClientBottomNav active="menu" />
    </div>
  );
}
