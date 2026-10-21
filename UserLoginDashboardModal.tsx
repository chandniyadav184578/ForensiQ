import React, { useState } from 'react';
import { useOrbit } from '../context/OrbitContext';
import { truncateAddress } from '../utils/crypto';
import {
  X,
  User,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  Key,
  CheckCircle2,
  Copy,
  Check,
  LogOut,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Laptop,
  Camera,
  Coins,
  UserPlus,
} from 'lucide-react';
import { authService } from '../services/authService';

interface UserLoginDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPassport?: (objectId: string) => void;
}

export const UserLoginDashboardModal: React.FC<UserLoginDashboardModalProps> = ({
  isOpen,
  onClose,
  onNavigateToPassport,
}) => {
  const {
    isAuthenticated,
    loginWithCredentials,
    logoutUser,
    activeCredentials,
    currentWallet,
    objects,
    faucetAirdrop,
  } = useOrbit();

  // Auth mode state
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

  // Login form state
  const [usernameOrEmail, setUsernameOrEmail] = useState('gaurika.dhamija@orbit.io');
  const [password, setPassword] = useState('Gaurika@Orbit2026');
  const [showPassword, setShowPassword] = useState(false);

  // Sign up form state
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Profile view copied states
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFillGaurikaCredentials = () => {
    setUsernameOrEmail(activeCredentials.email);
    setPassword(activeCredentials.passwordDisplay);
    setErrorMessage('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await loginWithCredentials(usernameOrEmail, password);
      if (!res.success) {
        setErrorMessage(res.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unexpected login error. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      await authService.register(signUpEmail, signUpPassword, signUpName, currentWallet.address);
      // Log in with the newly registered credentials
      await loginWithCredentials(signUpEmail, signUpPassword);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register account with Firebase Auth.');
    } finally {
      setIsLoading(false);
    }
  };

  // Gaurika's objects
  const myObjects = objects.filter(
    o => o.currentOwnerAddress.toLowerCase() === currentWallet.address.toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#180622] border border-pink-500/30 rounded-3xl shadow-2xl shadow-pink-950/60 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pink-500/20 bg-[#120419]/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isAuthenticated ? 'User Account & Custody Dashboard' : 'User Sign In Portal'}
              </h2>
              <p className="text-xs text-pink-200/70">
                {isAuthenticated
                  ? `Signed in as ${activeCredentials.name} · Verified Blockchain Custodian`
                  : 'Enter your credentials to manage physical passports & escrow'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-pink-200/70 hover:text-white hover:bg-pink-950/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {!isAuthenticated ? (
            /* =======================================
               STATE 1: LOGIN / SIGNUP FORM (FIREBASE AUTH)
               ======================================= */
            <div className="space-y-6">
              {/* Auth Mode Toggle Tabs */}
              <div className="flex rounded-xl bg-[#120419] p-1 border border-pink-500/20">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('LOGIN');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    authMode === 'LOGIN'
                      ? 'bg-gradient-to-r from-pink-600 to-[#be2b65] text-white shadow'
                      : 'text-pink-300/70 hover:text-white'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('SIGNUP');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    authMode === 'SIGNUP'
                      ? 'bg-gradient-to-r from-pink-600 to-[#be2b65] text-white shadow'
                      : 'text-pink-300/70 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>
              </div>

              {authMode === 'LOGIN' ? (
                <>
                  {/* Credentials Highlight Card for user */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-pink-950/60 via-[#1f0729] to-pink-950/60 border border-pink-500/40 shadow-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-pink-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-pink-300 font-mono">
                          Default Account Credentials
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleFillGaurikaCredentials}
                        className="px-3 py-1 text-[11px] font-bold text-white bg-pink-600 hover:bg-pink-500 rounded-full transition-all shadow-sm cursor-pointer"
                      >
                        Quick Auto-Fill
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-xl bg-[#120419]/90 border border-pink-500/20">
                        <div className="text-[10px] text-pink-200/60 font-mono uppercase">User ID / Email</div>
                        <div className="font-mono font-bold text-white select-all mt-0.5">
                          {activeCredentials.email}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#120419]/90 border border-pink-500/20">
                        <div className="text-[10px] text-pink-200/60 font-mono uppercase">Password</div>
                        <div className="font-mono font-bold text-pink-300 select-all mt-0.5">
                          {activeCredentials.passwordDisplay}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-pink-200/70 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-pink-400" />
                      <span>Authorized Custodian: <strong>{activeCredentials.name}</strong></span>
                    </div>
                  </div>

                  {/* Login Form */}
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    {errorMessage && (
                      <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-xs text-rose-200">
                        {errorMessage}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-pink-200 mb-1.5 font-mono">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-pink-300/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={usernameOrEmail}
                          onChange={e => setUsernameOrEmail(e.target.value)}
                          placeholder="e.g. gaurika.dhamija@orbit.io"
                          className="w-full pl-10 pr-4 py-2.5 bg-[#120419] border border-pink-500/20 rounded-xl text-xs sm:text-sm text-white placeholder-pink-300/40 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500/30 transition-all font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-pink-200 mb-1.5 font-mono">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-pink-300/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Enter password"
                          className="w-full pl-10 pr-10 py-2.5 bg-[#120419] border border-pink-500/20 rounded-xl text-xs sm:text-sm text-white placeholder-pink-300/40 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500/30 transition-all font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-300/60 hover:text-white transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-pink-200/70 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="rounded bg-[#120419] border-pink-500/30 text-pink-500 focus:ring-0"
                        />
                        <span>Remember session</span>
                      </label>

                      <button
                        type="button"
                        onClick={handleFillGaurikaCredentials}
                        className="text-pink-400 hover:text-pink-300 underline cursor-pointer"
                      >
                        Reset to default credentials
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 px-6 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider text-white bg-gradient-to-r from-[#d94680] to-[#be2b65] hover:from-[#e0528c] hover:to-[#cb3272] transition-all shadow-xl shadow-pink-900/40 border border-pink-400/30 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? 'Signing In with Firebase...' : 'Sign In with Firebase →'}
                    </button>
                  </form>
                </>
              ) : (
                /* Sign Up Form */
                <form onSubmit={handleSignUpSubmit} className="space-y-4">
                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-xs text-rose-200">
                      {errorMessage}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-pink-200 mb-1.5 font-mono">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-pink-300/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={signUpName}
                        onChange={e => setSignUpName(e.target.value)}
                        placeholder="e.g. Alex Morgan"
                        className="w-full pl-10 pr-4 py-2.5 bg-[#120419] border border-pink-500/20 rounded-xl text-xs sm:text-sm text-white placeholder-pink-300/40 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500/30 transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-pink-200 mb-1.5 font-mono">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-pink-300/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={signUpEmail}
                        onChange={e => setSignUpEmail(e.target.value)}
                        placeholder="e.g. alex@example.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-[#120419] border border-pink-500/20 rounded-xl text-xs sm:text-sm text-white placeholder-pink-300/40 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500/30 transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-pink-200 mb-1.5 font-mono">
                      Password (min 6 characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-pink-300/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={signUpPassword}
                        onChange={e => setSignUpPassword(e.target.value)}
                        placeholder="Create strong password"
                        className="w-full pl-10 pr-10 py-2.5 bg-[#120419] border border-pink-500/20 rounded-xl text-xs sm:text-sm text-white placeholder-pink-300/40 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500/30 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-300/60 hover:text-white transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-pink-300/70">
                    Creates an authenticated Firebase Auth profile and provisions persistent custody records in Cloud Firestore.
                  </p>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-6 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider text-white bg-gradient-to-r from-[#d94680] to-[#be2b65] hover:from-[#e0528c] hover:to-[#cb3272] transition-all shadow-xl shadow-pink-900/40 border border-pink-400/30 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? 'Creating Firebase Account...' : 'Create Account & Sign In →'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* =======================================
               STATE 2: LOGGED IN USER DASHBOARD
               ======================================= */
            <div className="space-y-6">
              {/* Profile Card Header */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1f0729] via-[#190522] to-[#120419] border border-pink-500/30 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="relative">
                      <img
                        src={currentWallet.avatar}
                        alt={activeCredentials.name}
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-pink-400/50 shadow-md shadow-pink-950"
                      />
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#180622]" />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-lg font-black text-white">{activeCredentials.name}</h3>
                        <ShieldCheck className="w-4 h-4 text-pink-400" />
                      </div>
                      <div className="text-xs font-mono text-pink-300 font-semibold">
                        {activeCredentials.email}
                      </div>
                      <div className="text-[11px] text-pink-200/60 mt-0.5">
                        Role: {currentWallet.role}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={logoutUser}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/60 rounded-xl transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>

                {/* Account Details Box */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-pink-500/20 text-xs">
                  {/* User ID */}
                  <div className="p-3 bg-[#120419]/90 border border-pink-500/20 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-mono text-pink-300/60">User ID / Email</div>
                      <div className="font-mono font-bold text-white truncate max-w-[130px]">
                        {activeCredentials.email}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(activeCredentials.email, 'email')}
                      className="p-1 text-pink-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy User ID"
                    >
                      {copiedKey === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Password Display */}
                  <div className="p-3 bg-[#120419]/90 border border-pink-500/20 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-mono text-pink-300/60">Account Password</div>
                      <div className="font-mono font-bold text-pink-300 select-all">
                        {activeCredentials.passwordDisplay}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(activeCredentials.passwordDisplay, 'pw')}
                      className="p-1 text-pink-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy Password"
                    >
                      {copiedKey === 'pw' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Wallet Balance */}
                  <div className="p-3 bg-[#120419]/90 border border-pink-500/20 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-mono text-pink-300/60">Linked Vault</div>
                      <div className="font-mono font-bold text-emerald-400">
                        {currentWallet.balanceEth.toFixed(3)} ETH
                      </div>
                    </div>
                    <button
                      onClick={() => faucetAirdrop(0.5)}
                      className="px-2 py-0.5 text-[10px] font-bold text-pink-200 bg-pink-950/60 border border-pink-500/40 rounded-lg hover:bg-pink-900/60 transition-colors cursor-pointer"
                      title="Request 0.5 testnet ETH"
                    >
                      +0.5
                    </button>
                  </div>
                </div>
              </div>

              {/* Custody Inventory for Marissa Yung */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Registered Hardware Passports Under Your Custody</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-pink-950 border border-pink-500/40 text-pink-300">
                      {myObjects.length} Assets
                    </span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {myObjects.map(obj => (
                    <div
                      key={obj.id}
                      className="p-3.5 rounded-2xl bg-[#14041c]/90 border border-pink-500/20 hover:border-pink-500/40 transition-all flex items-center justify-between gap-3 shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={obj.imageUrl}
                          alt={obj.name}
                          className="w-12 h-12 rounded-xl object-cover border border-pink-500/30"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-pink-400">
                              {obj.orbitId}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-400">
                              {obj.status}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-white truncate max-w-[170px]">
                            {obj.name}
                          </div>
                          <div className="text-[10px] text-pink-200/60 font-mono">
                            SN: {obj.serialNumber}
                          </div>
                        </div>
                      </div>

                      {onNavigateToPassport && (
                        <button
                          onClick={() => {
                            onNavigateToPassport(obj.id);
                            onClose();
                          }}
                          className="p-2 rounded-xl bg-pink-950/60 hover:bg-pink-900/60 text-pink-300 hover:text-white transition-colors cursor-pointer shrink-0"
                          title="View Object Passport"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Security & Cryptographic Guarantee */}
              <div className="p-4 rounded-2xl bg-[#120419]/90 border border-pink-500/20 text-xs text-pink-200/70 space-y-1">
                <div className="font-bold text-pink-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>On-Chain Custody Status: 100% Protected</span>
                </div>
                <p className="leading-relaxed">
                  Every passport registered under Marissa Yung is sealed with cryptographic SHA-256 hashes and linked directly to Sepolia smart contracts.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
