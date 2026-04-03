// App.jsx — Root application shell
import React from 'react';
import './index.css';
import './styles/globals.css';

import Grain       from './effects/Grain';
import Particles   from './effects/Particles';
import Navbar      from './components/Navbar';
import HeroSection from './components/HeroSection';
import DetectPanel from './components/DetectPanel';
import HowItWorks  from './components/HowItWorks';
import Modalities  from './components/Modalities';
import StatsSection from './components/StatsSection';
import Footer       from './components/Footer';

export default function App() {
  return (
    <>
      {/* Ambient effects */}
      <Particles />
      <Grain opacity={0.028} animated={false} />

      {/* Navigation */}
      <Navbar />

      {/* Page content */}
      <main style={{ position: 'relative', zIndex: 1 }}>
        <HeroSection />
        <DetectPanel />
        <HowItWorks />
        <Modalities />
        <StatsSection />
      </main>

      <Footer />
    </>
  );
}
