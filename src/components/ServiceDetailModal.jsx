import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const DURATION_OPTIONS = [
  'Selecione', '30 minutos', '1 hora', '1h30', '2 horas', '3 horas',
  '4 horas', 'Meio período', 'Dia inteiro', 'A combinar',
];

export default function ServiceDetailModal({ serviceName, initialData, onSave, onClose }) {
  const [specialty, setSpecialty] = useState(initialData?.specialty || '');
  const [price, setPrice] = useState(initialData?.price || '');
  const [duration, setDuration] = useState(initialData?.duration || 'Selecione');
  const [homeCare, setHomeCare] = useState(initialData?.homeCare ?? null);
  const [freight, setFreight] = useState(initialData?.freight || '');
  const [materials, setMaterials] = useState(initialData?.materials || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  const priceNum = parseFloat(price.replace(',', '.')) || 0;
  const freightNum = homeCare === 'sim' ? (parseFloat(freight.replace(',', '.')) || 0) : 0;
  const total = priceNum + freightNum;

  const canSave = price.trim() && duration !== 'Selecione' && homeCare !== null && materials;

  const handleSave = () => {
    onSave({
      specialty,
      price,
      duration,
      homeCare,
      freight: homeCare === 'sim' ? freight : '',
      materials,
      description,
      notes,
      total,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl w-full max-w-sm flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3">
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground">{serviceName}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Adicione os detalhes desse serviço em {serviceName}.</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded-lg ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-4">
          {/* Especialidade */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Especialidade <span className="text-muted-foreground font-normal">(opcional)</span></label>
            <input
              type="text"
              value={specialty}
              onChange={e => setSpecialty(e.target.value)}
              placeholder="Ex.: Quadros e disjuntores"
              className="w-full px-3 py-2.5 border border-primary/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card"
            />
            <p className="text-xs text-muted-foreground mt-1">Descreva em poucas palavras o que você faz nessa categoria.</p>
          </div>

          {/* Valor cobrado */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Valor cobrado (R$) <span className="text-destructive">*</span></label>
            <input
              type="text"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="Ex.: 12,99 · 12.000,00 · 12 e 99 · 12 mil e 99"
              className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card"
            />
            <p className="text-xs text-muted-foreground mt-1">Obrigatório.</p>
          </div>

          {/* Duração */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Duração média <span className="text-destructive">*</span></label>
            <select
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card"
            >
              {DURATION_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
            <p className="text-xs text-muted-foreground mt-1">Obrigatório.</p>
          </div>

          {/* Domicílio */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Atende a domicílio? <span className="text-destructive">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {['sim', 'nao'].map(opt => (
                <button
                  key={opt}
                  onClick={() => setHomeCare(opt)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    homeCare === opt ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-foreground'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${homeCare === opt ? 'border-primary' : 'border-muted-foreground'}`}>
                    {homeCare === opt && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  {opt === 'sim' ? 'Sim' : 'Não'}
                </button>
              ))}
            </div>
          </div>

          {/* Frete (only when homeCare === 'sim') */}
          {homeCare === 'sim' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Frete cobrado (R$)</label>
              <input
                type="text"
                value={freight}
                onChange={e => setFreight(e.target.value)}
                placeholder="0,00"
                className="w-full px-3 py-2.5 border-2 border-primary/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card"
              />
            </div>
          )}

          {/* Materiais */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Materiais <span className="text-destructive">*</span></label>
            <div className="space-y-2">
              {[
                { val: 'client', label: 'Cliente fornece materiais' },
                { val: 'provider', label: 'Fornecedor fornece materiais' },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setMaterials(opt.val)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm transition-colors ${
                    materials === opt.val ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-foreground'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${materials === opt.val ? 'border-primary' : 'border-muted-foreground'}`}>
                    {materials === opt.val && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Descrição <span className="text-muted-foreground font-normal">(opcional)</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, 1000))}
              placeholder="Como você costuma executar esse serviço..."
              rows={4}
              className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/1000</p>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Observações <span className="text-muted-foreground font-normal">(opcional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Condições, exceções, garantias..."
              rows={3}
              className="w-full px-3 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card resize-none"
            />
          </div>
        </div>

        {/* Total bar */}
        <div className="px-5 py-3 border-t border-border bg-secondary/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground tracking-wide">VALOR TOTAL DO SERVIÇO</p>
              {freightNum > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Serviço R$ {priceNum.toFixed(2).replace('.', ',')} + frete R$ {freightNum.toFixed(2).replace('.', ',')}
                </p>
              )}
            </div>
            <span className="text-xl font-bold text-primary">
              R$ {total.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-border rounded-xl font-medium text-sm text-foreground hover:bg-secondary/50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Salvar serviço
          </button>
        </div>
      </div>
    </div>
  );
}