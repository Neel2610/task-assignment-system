import React from 'react';
import Sidebar from './Sidebar';
import ParticleBackground from './ParticleBackground';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex bg-[#0B0F17] font-sans text-slate-100 antialiased text-left w-full relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-[30%] right-[20%] w-[40%] h-[40%] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Technical grid/dot matrix background layer */}
      <div className="absolute inset-0 bg-dot-matrix pointer-events-none -z-10 opacity-70" />

      {/* Particle background element */}
      <ParticleBackground />

      {/* Workspace Navigation Sidebar */}
      <Sidebar />

      {/* Core scrollable content container */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent overflow-y-auto h-screen relative">
        {children}
      </div>
    </div>
  );
}
