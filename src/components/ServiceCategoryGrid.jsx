import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useServices } from '@/hooks/useServices';

export default function ServiceCategoryGrid({ onSelectCategory }) {
  const [expanded, setExpanded] = useState(null);
  const { categories, isLoading } = useServices();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-5 h-5 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {categories.map((category) => {
        const Icon = category.icon;
        const isExpanded = expanded === category.name;
        return (
          <div key={category.name} className="border border-border rounded-xl overflow-hidden bg-card">
            <button
              onClick={() => setExpanded(isExpanded ? null : category.name)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/20 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="flex-1 text-sm font-medium text-foreground">{category.name}</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
              <div className="border-t border-border p-3 flex flex-wrap gap-2">
                {category.subcategories.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => onSelectCategory(category.name, sub)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-background text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
