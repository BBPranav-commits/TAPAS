'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: '◫' },
  { path: '/climate', label: 'Climate Data', icon: '☀' },
  { path: '/shelter', label: 'Shelter Builder', icon: '⌂' },
  { path: '/materials', label: 'Materials', icon: '▦' },
  { path: '/simulation', label: 'Simulation', icon: '▶' },
  { path: '/optimization', label: 'Optimization', icon: '⚡' },
  { path: '/ansys', label: 'ANSYS Validation', icon: '✓' },
  { path: '/reports', label: 'Reports', icon: '📋' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`flex flex-col bg-slate-900 border-r border-slate-700 h-screen sticky top-0 transition-all ${
      collapsed ? 'w-16' : 'w-56'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-slate-700">
        {!collapsed && (
          <div>
            <h1 className="text-sm font-bold text-blue-400">TAPAS</h1>
            <p className="text-[10px] text-slate-500 leading-tight">Thermal Shelter Model</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto text-slate-400 hover:text-white text-xs p-1"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border-r-2 border-blue-500'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className="text-base flex-shrink-0 w-5 text-center">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-700 text-[10px] text-slate-600">
          Passive Thermal Comfort
          <br />v1.0 — SIH 2026
        </div>
      )}
    </aside>
  );
}
