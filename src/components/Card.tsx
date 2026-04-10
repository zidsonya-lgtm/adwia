import React from 'react';
import { cn } from '../lib/utils';

export const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("bg-white rounded-2xl shadow-sm border border-gray-100 p-4", className)}
    {...props}
  >
    {children}
  </div>
);

export const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'error' }) => {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border border-amber-100",
    error: "bg-red-50 text-red-700 border border-red-100"
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", variants[variant])}>
      {children}
    </span>
  );
};
