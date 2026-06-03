import { NavLink } from 'react-router-dom';
import { LifeBuoy, Users } from 'lucide-react';

const ADMIN_SECTIONS = [
  {
    to: '/admin/support',
    label: 'Suporte',
    icon: LifeBuoy,
  },
  {
    to: '/admin/users',
    label: 'Usuarios',
    icon: Users,
  },
];

export default function AdminSectionNav() {
  return (
    <div className="flex flex-wrap gap-2">
      {ADMIN_SECTIONS.map((section) => {
        const Icon = section.icon;

        return (
          <NavLink
            key={section.to}
            to={section.to}
            className={({ isActive }) => (
              `inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-foreground hover:bg-secondary/50'
              }`
            )}
          >
            <Icon className="h-4 w-4" />
            {section.label}
          </NavLink>
        );
      })}
    </div>
  );
}
