import { useState } from 'react';
import { X, ChevronRight } from 'lucide-react';

const LOGO_URL = "/onboarding-city.png";

export default function ProviderServiceModal({ subcategory, category, onClose, onSave, initialData }) {
  const [price, setPrice] = useState(initialData?.price || '');
  const [duration, setDuration] = useState(initialData?.duration || '');

  const handleSave = () => {
    onSave({ specialty: subcategory, price, duration });
  };

  const canSave = price.trim().length > 0;

  const handleMoneyInput = (value) => value.replace(/\D/g, '');

  const formatMoneyOnBlur = (value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formatted},00`;
  };

  const parseMoneyValue = (value) => {
    if (!value) return 0;
    const digits = value.replace(/\D/g, '');
    const numericValue = parseInt(digits, 10) || 0;
    if (numericValue < 100) return numericValue;
    return Math.floor(numericValue / 100);
  };

  const priceValue = parseMoneyValue(price);
  const formatTotal = (val) => {
    if (val === 0) return 'R$ 0,00';
    return `R$ ${val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')},00`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <img src={LOGO_URL} alt="ServiLocal" className="w-6 h-6 object-contain" />
          <span className="text-sm font-semibold text-foreground">Servi<span className="font-bold">Local</span></span>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-foreground" />
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 pb-10">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-1">
            {initialData ? 'Editar serviço' : 'Adicionar serviço'}
          </h1>
          {subcategory && (
            <p className="text-sm text-primary font-medium">{subcategory}</p>
          )}
        </div>

        <div className="space-y-5">
          {/* Preço */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Valor do serviço <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2 px-4 py-3 border border-border rounded-lg bg-card focus-within:ring-2 focus-within:ring-primary/50">
              <span className="text-sm text-muted-foreground font-medium">R$</span>
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(handleMoneyInput(e.target.value))}
                onBlur={(e) => setPrice(formatMoneyOnBlur(e.target.value))}
                placeholder="0,00"
                className="flex-1 focus:outline-none text-sm bg-transparent"
              />
            </div>
          </div>

          {/* Duração */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Duração média
            </label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Ex: 2 horas"
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card"
            />
          </div>

          {/* Total bar */}
          {price && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-primary font-medium">Valor para o cliente:</span>
                <span className="text-xl font-bold text-primary">{formatTotal(priceValue)}</span>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {initialData ? 'Salvar alterações' : 'Adicionar serviço'}
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary/30 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
