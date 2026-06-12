import React from 'react';

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AmbientBackground() {
  return (
    <div className="ios-ambient" aria-hidden="true">
      <div className="ios-orb ios-orb-1" />
      <div className="ios-orb ios-orb-2" />
      <div className="ios-orb ios-orb-3" />
    </div>
  );
}

export default function AppShell({ children, className = '' }: AppShellProps) {
  return (
    <div className={`ios-shell ${className}`.trim()}>
      <AmbientBackground />
      {children}
    </div>
  );
}
