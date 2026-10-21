import React, { useState, useEffect } from 'react';
import { OrbitProvider, useOrbit } from './context/OrbitContext';
import { Navbar } from './components/Navbar';
import { LandingHero } from './components/LandingHero';
import { DashboardView } from './components/DashboardView';
import { IntelligenceDashboard } from './components/IntelligenceDashboard';
import { ObjectPassportView } from './components/ObjectPassportView';
import { RegisterModal } from './components/RegisterModal';
import { PhysicalTagModal } from './components/PhysicalTagModal';
import { FinderScanModal } from './components/FinderScanModal';
import { RecoveryClaimModal } from './components/RecoveryClaimModal';
import { HandoverConfirmModal } from './components/HandoverConfirmModal';
import { MarkLostModal } from './components/MarkLostModal';
import { TransferOwnershipModal } from './components/TransferOwnershipModal';
import { LifecycleEventModal } from './components/LifecycleEventModal';
import { PersonaSwitcherModal } from './components/PersonaSwitcherModal';
import { InteractiveJourneyModal } from './components/InteractiveJourneyModal';
import { UserLoginDashboardModal } from './components/UserLoginDashboardModal';
import { PublicVerificationView } from './components/PublicVerificationView';
import { MarketplaceView } from './components/MarketplaceView';
import { TxNotification } from './components/TxNotification';
import { MovingCosmicBackground } from './components/MovingCosmicBackground';
import { PhysicalObject } from './types/orbit';
import { Sparkles, QrCode } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { objects, getObject, walletStatus } = useOrbit();

  // Navigation State
  const [currentTab, setCurrentTab] = useState<'landing' | 'dashboard' | 'intelligence' | 'passport' | 'explorer' | 'marketplace' | 'verify'>('landing');
  const [selectedObjectId, setSelectedObjectId] = useState<string>('orbit-7821');
  const [verifyContractAddress, setVerifyContractAddress] = useState<string>('');
  const [verifyTokenId, setVerifyTokenId] = useState<number>(1);

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPersonaOpen, setIsPersonaOpen] = useState(false);

  useEffect(() => {
    const open = () => setIsPersonaOpen(true);
    window.addEventListener('orbit:open-wallet', open);
    return () => window.removeEventListener('orbit:open-wallet', open);
  }, []);
  const [isJourneyOpen, setIsJourneyOpen] = useState(false);
  const [isUserDashboardOpen, setIsUserDashboardOpen] = useState(false);

  // Object-specific modals
  const [activeModalObject, setActiveModalObject] = useState<PhysicalObject | null>(null);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isLifecycleModalOpen, setIsLifecycleModalOpen] = useState(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  // Parse URL pathname or query parameters on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const urlParams = new URLSearchParams(window.location.search);

      // 1. Direct path routing: /verify/:contractAddress/:tokenId
      const verifyMatch = pathname.match(/^\/verify\/(0x[a-fA-F0-9]{40})\/(\d+)/i);
      if (verifyMatch) {
        setVerifyContractAddress(verifyMatch[1]);
        setVerifyTokenId(parseInt(verifyMatch[2], 10));
        setCurrentTab('verify');
        return;
      }

      // 2. Query param routing: ?verify=true&contract=...&token=...
      const verifyParam = urlParams.get('verify');
      if (verifyParam || pathname.startsWith('/verify')) {
        const c = urlParams.get('contract');
        const t = urlParams.get('token');
        if (c) setVerifyContractAddress(c);
        if (t) setVerifyTokenId(parseInt(t, 10));
        setCurrentTab('verify');
        return;
      }

      // 3. Scan param: ?orbit=orbit-7821
      const orbitParam = urlParams.get('orbit');
      if (orbitParam) {
        setSelectedObjectId(orbitParam);
        setCurrentTab('passport');
      }
    }
  }, []);

  const handleNavigate = (
    tab: 'landing' | 'dashboard' | 'intelligence' | 'passport' | 'explorer' | 'marketplace' | 'verify',
    objectId?: string
  ) => {
    if (objectId) {
      setSelectedObjectId(objectId);
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenTagModal = (objectId: string) => {
    const found = getObject(objectId);
    if (found) {
      setActiveModalObject(found);
      setIsTagModalOpen(true);
    }
  };

  const handleOpenTransferModal = (objectId: string) => {
    const found = getObject(objectId);
    if (found) {
      setActiveModalObject(found);
      setIsTransferModalOpen(true);
    }
  };

  const handleOpenLifecycleModal = (objectId: string) => {
    const found = getObject(objectId);
    if (found) {
      setActiveModalObject(found);
      setIsLifecycleModalOpen(true);
    }
  };

  const handleOpenLostModal = (objectId: string) => {
    const found = getObject(objectId);
    if (found) {
      setActiveModalObject(found);
      setIsLostModalOpen(true);
    }
  };

  const handleOpenClaimModal = (objectId: string) => {
    const found = getObject(objectId);
    if (found) {
      setActiveModalObject(found);
      setIsClaimModalOpen(true);
    }
  };

  const handleOpenHandoverModal = (objectId: string) => {
    const found = getObject(objectId);
    if (found) {
      setActiveModalObject(found);
      setIsHandoverModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a020d] text-[#fceee8] flex flex-col justify-between selection:bg-pink-500/30 selection:text-pink-200 relative overflow-x-hidden">
      {/* Moving Cosmic Animated Background (bokeh flares & drifting stardust) */}
      <MovingCosmicBackground />

      <div className="relative z-10">
        {/* Navigation Bar */}
        <Navbar
          currentTab={currentTab}
          onNavigate={handleNavigate}
          onOpenRegister={() => setIsRegisterOpen(true)}
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenPersonaModal={() => setIsPersonaOpen(true)}
          onOpenUserDashboard={() => setIsUserDashboardOpen(true)}
        />

        {/* Global Floating Quick Tour Button */}
        <div className="fixed bottom-5 left-5 z-30">
          <button
            onClick={() => setIsJourneyOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#d94680] to-[#be2b65] hover:from-[#e0528c] hover:to-[#ce3472] rounded-full shadow-lg shadow-pink-900/50 border border-pink-400/30 transition-all cursor-pointer hover:scale-105"
          >
            <Sparkles className="w-3.5 h-3.5 fill-white text-pink-200" />
            <span>Interactive 8-Step Walkthrough</span>
          </button>
        </div>

        {/* Active Page View */}
        <main>
          {currentTab === 'landing' && (
            <LandingHero
              onNavigate={handleNavigate}
              onOpenRegister={() => setIsRegisterOpen(true)}
              onOpenScanner={() => setIsScannerOpen(true)}
              onOpenConnectWallet={() => (walletStatus === 'connected' ? handleNavigate('dashboard') : setIsPersonaOpen(true))}
            />
          )}

          {currentTab === 'dashboard' && (
            <DashboardView
              onSelectObject={id => handleNavigate('passport', id)}
              onOpenRegister={() => setIsRegisterOpen(true)}
              onOpenTagModal={handleOpenTagModal}
              onOpenTransferModal={handleOpenTransferModal}
              onOpenLostModal={handleOpenLostModal}
              onOpenIntelligence={id => handleNavigate('intelligence', id)}
            />
          )}

          {currentTab === 'intelligence' && (
            <IntelligenceDashboard initialObjectId={selectedObjectId} onSelectObject={id => handleNavigate('passport', id)} />
          )}

          {currentTab === 'passport' && (
            <ObjectPassportView
              objectId={selectedObjectId}
              onBack={() => handleNavigate('dashboard')}
              onSelectObject={id => setSelectedObjectId(id)}
              onOpenTagModal={handleOpenTagModal}
              onOpenTransferModal={handleOpenTransferModal}
              onOpenLifecycleModal={handleOpenLifecycleModal}
              onOpenLostModal={handleOpenLostModal}
              onOpenClaimModal={handleOpenClaimModal}
              onOpenHandoverModal={handleOpenHandoverModal}
              onOpenMarketplace={() => handleNavigate('marketplace')}
            />
          )}

          {currentTab === 'marketplace' && (
            <MarketplaceView onSelectObject={id => handleNavigate('passport', id)} />
          )}

          {currentTab === 'verify' && (
            <PublicVerificationView
              initialContractAddress={verifyContractAddress}
              initialTokenId={verifyTokenId}
              onBackToApp={() => handleNavigate('dashboard')}
            />
          )}
        </main>
      </div>

      {/* Clean Minimalist Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">ORBIT Protocol</span>
            <span>·</span>
            <span>Physical Object Digital Passport & Smart Escrow Recovery</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsJourneyOpen(true)}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Lifecycle Architecture
            </button>
            <span>·</span>
            <button
              onClick={() => handleNavigate('passport', 'orbit-7821')}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Object #7821
            </button>
            <span>·</span>
            <button
              onClick={() => setIsScannerOpen(true)}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Optical QR Scanner
            </button>
          </div>
        </div>
      </footer>

      {/* Transaction Confirmation Toast */}
      <TxNotification />

      {/* Global Modals */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onRegistered={newId => handleNavigate('passport', newId)}
      />

      <FinderScanModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanResolved={targetId => handleNavigate('passport', targetId)}
        onOpenClaimModal={handleOpenClaimModal}
      />

      <PersonaSwitcherModal
        isOpen={isPersonaOpen}
        onClose={() => setIsPersonaOpen(false)}
      />

      <InteractiveJourneyModal
        isOpen={isJourneyOpen}
        onClose={() => setIsJourneyOpen(false)}
        onJumpToObject={targetId => handleNavigate('passport', targetId)}
      />

      {/* Object Specific Modals */}
      <PhysicalTagModal
        object={activeModalObject}
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        onSimulateScan={id => handleNavigate('passport', id)}
      />

      <TransferOwnershipModal
        object={activeModalObject}
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onTransferred={() => {}}
      />

      <LifecycleEventModal
        object={activeModalObject}
        isOpen={isLifecycleModalOpen}
        onClose={() => setIsLifecycleModalOpen(false)}
        onEventLogged={() => {}}
      />

      <MarkLostModal
        object={activeModalObject}
        isOpen={isLostModalOpen}
        onClose={() => setIsLostModalOpen(false)}
        onStatusChanged={() => {}}
      />

      <RecoveryClaimModal
        object={activeModalObject}
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        onClaimSubmitted={() => {}}
      />

      <HandoverConfirmModal
        object={activeModalObject}
        isOpen={isHandoverModalOpen}
        onClose={() => setIsHandoverModalOpen(false)}
        onSuccess={() => {}}
      />

      {/* User Login & Custody Dashboard for Marissa Yung */}
      <UserLoginDashboardModal
        isOpen={isUserDashboardOpen}
        onClose={() => setIsUserDashboardOpen(false)}
        onNavigateToPassport={id => handleNavigate('passport', id)}
      />
    </div>
  );
};

export default function App() {
  return (
    <OrbitProvider>
      <MainAppContent />
    </OrbitProvider>
  );
}
