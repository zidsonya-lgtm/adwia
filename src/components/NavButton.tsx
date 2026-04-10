import React from 'react';
import { cn } from '../lib/utils';

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

export function NavButton({ active, onClick, icon, label }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-0.5 transition-colors",
        active ? "text-sky-600" : "text-gray-400"
      )}
    >
      <div className={cn(
        "p-1 rounded-lg transition-colors",
        active ? "bg-sky-50" : "transparent"
      )}>
        {React.cloneElement(icon as React.ReactElement, { size: 18 })}
      </div>
      <span className="text-[8px] font-bold">{label}</span>
    </button>
  );
}
