import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  Phone as PhoneIcon, 
  ArrowRight, 
  ChevronLeft,
  CheckCircle2,
  ShieldCheck,
  MessageSquare,
  Smartphone,
  Info
} from 'lucide-react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { generateUsername, cn } from '../lib/utils';

type VerifyMethod = 'email' | 'whatsapp' | 'sms';

interface AuthFormProps {
  onBack: () => void;
  initialMode?: 'login' | 'signup';
}

export const AuthForm: React.FC<AuthFormProps> = ({ onBack, initialMode = 'login' }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+234');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [serverOtp, setServerOtp] = useState('');
  const [verifyMethod, setVerifyMethod] = useState<VerifyMethod>('email');

  useEffect(() => {
    setIsLogin(initialMode === 'login');
    setStep(1);
  }, [initialMode]);

  const sendOtp = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setServerOtp(code);
    setOtp(code);
    
    // In a real production app, this would trigger an API call to a messaging service
    console.log(`[AUTH] OTP for ${email}: ${code}`);
    
    const target = verifyMethod === 'email' ? email : phone;
    setSuccess(`Verification code sent to your ${verifyMethod} (${target})`);
    setTimeout(() => setSuccess(null), 8000);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = email.toLowerCase().trim();

    try {
      if (isLogin) {
        setLoading(true);
        try {
          await signInWithEmailAndPassword(auth, cleanEmail, password);
        } catch (err: any) {
          if (
            err.code === 'auth/user-not-found' ||
            err.code === 'auth/wrong-password' ||
            err.code === 'auth/invalid-credential' ||
            err.code === 'auth/invalid-login-credentials'
          ) {
            throw new Error('Invalid email or password. Please verify your credentials or click "Forgot Password".');
          } else if (err.code === 'auth/too-many-requests') {
            throw new Error('Access temporarily blocked due to multiple failed attempts. Please try again later or reset your password.');
          } else if (err.code === 'auth/invalid-email') {
            throw new Error('Please enter a valid email address.');
          } else if (err.code === 'auth/network-request-failed') {
            throw new Error('Network error connecting to authentication server. Please check your internet connection.');
          } else {
            throw new Error(err.message || 'Authentication failed. Please check your credentials.');
          }
        }
      } else {
        // Signup Flow
        if (step === 1) {
          if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) throw new Error('Enter a valid email address');
          setStep(2);
        } else if (step === 2) {
          if (phone.length < 10) throw new Error('Enter a valid phone number (at least 10 digits)');
          setStep(3);
        } else if (step === 3) {
          // Method Selected
          sendOtp();
          setStep(4);
        } else if (step === 4) {
          if (otp !== serverOtp) throw new Error('Invalid verification code. Please try again.');
          setStep(5);
        } else if (step === 5) {
          if (password.length < 6) throw new Error('Password must be at least 6 characters');
          setLoading(true);
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            const user = userCredential.user;

            try {
              await setDoc(doc(db, 'users', user.uid), {
                email: cleanEmail,
                phone,
                username: generateUsername(),
                tier: 1,
                verified: true,
                totalTradeVolume: 0,
                walletBalance: 0,
                createdAt: new Date().toISOString()
              }, { merge: true });
            } catch (docErr) {
              console.warn("Initial user document creation note:", docErr);
            }
          } catch (err: any) {
            if (err.code === 'auth/email-already-in-use') {
              throw new Error('This email is already registered. Please sign in instead.');
            } else if (err.code === 'auth/weak-password') {
              throw new Error('Password is too weak. Please use at least 6 characters.');
            } else if (err.code === 'auth/invalid-email') {
              throw new Error('Please enter a valid email address.');
            }
            throw new Error(err.message || 'Account creation failed. Please try again.');
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    } finally {
      if (step === 5 || isLogin) setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) return setError('Please enter your email address');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Check your inbox for password reset instructions');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary p-6 flex flex-col font-sans">
      <header className="mb-10 flex justify-between items-center">
        <button onClick={step > 1 ? () => setStep(step - 1) : onBack} className="p-3 bg-white rounded-2xl shadow-sm text-primary transition-transform active:scale-90">
          <ChevronLeft />
        </button>
        {!isLogin && (
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map(s => (
              <div key={s} className={cn("w-1.5 h-1.5 rounded-full transition-all duration-300", step >= s ? "bg-accent w-4" : "bg-primary/10")} />
            ))}
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            {isLogin ? 'Welcome back!' : (
              step === 1 ? 'Start Trading' : 
              step === 2 ? 'Phone Number' : 
              step === 3 ? 'Choose Method' :
              step === 4 ? 'Verification' : 'Set Password'
            )}
          </h1>
          <p className="text-primary/60 text-sm">
            {isLogin ? 'Sign in to manage your digital assets' : (
              step === 1 ? 'Enter your email to get started' :
              step === 2 ? 'Your phone is used for secure alerts' :
              step === 3 ? 'How would you like to receive your code?' :
              step === 4 ? `Verify your ${verifyMethod}` :
              'Create a secure password of 6+ characters'
            )}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-[13px] font-medium border border-red-100 flex items-center gap-3">
              <ShieldCheck size={18} className="shrink-0" />
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="mb-6 p-4 bg-green-50 text-green-600 rounded-2xl text-[13px] font-medium border border-green-100 flex items-center gap-3">
              <CheckCircle2 size={18} className="shrink-0" />
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleAuth} className="space-y-4">
          <AnimatePresence mode="wait">
            {isLogin ? (
              <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 group-focus-within:text-accent transition-colors" size={20} />
                  <input 
                    type="email" 
                    autoComplete="email"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="Email Address" 
                    className="w-full bg-white px-12 py-4.5 rounded-2xl outline-none border border-transparent focus:border-accent/20 focus:ring-4 ring-accent/5 transition-all text-sm font-medium" 
                    required 
                  />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 group-focus-within:text-accent transition-colors" size={20} />
                  <input 
                    type="password" 
                    autoComplete="current-password"
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Password" 
                    className="w-full bg-white px-12 py-4.5 rounded-2xl outline-none border border-transparent focus:border-accent/20 focus:ring-4 ring-accent/5 transition-all text-sm font-medium" 
                    required 
                  />
                </div>
                <div className="text-right pt-1">
                  <button type="button" onClick={handleForgotPassword} className="text-xs text-accent font-bold hover:underline">Forgot Password?</button>
                </div>
              </motion.div>
            ) : (
              <>
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 group-focus-within:text-accent font-medium" size={20} />
                      <input 
                        type="email" 
                        autoComplete="email"
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        placeholder="name@example.com" 
                        className="w-full bg-white px-12 py-4.5 rounded-2xl outline-none border border-transparent focus:border-accent/20 focus:ring-4 ring-accent/5 transition-all text-sm font-medium" 
                        required 
                      />
                    </div>
                  </motion.div>
                )}
                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <div className="relative group">
                      <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 group-focus-within:text-accent font-medium" size={20} />
                      <input 
                        type="tel" 
                        autoComplete="tel"
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        placeholder="Mobile Number" 
                        className="w-full bg-white px-12 py-4.5 rounded-2xl outline-none border border-transparent focus:border-accent/20 focus:ring-4 ring-accent/5 transition-all text-sm font-medium" 
                        required 
                      />
                    </div>
                  </motion.div>
                )}
                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid gap-3">
                    <button type="button" onClick={() => setVerifyMethod('email')} className={cn("flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left", verifyMethod === 'email' ? "border-accent bg-accent/5" : "border-white bg-white")}>
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", verifyMethod === 'email' ? "bg-accent text-white" : "bg-secondary text-primary/40")}>
                        <Mail size={20} />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold">Email Address</p>
                        <p className="text-[10px] text-primary/40">Send code to {email}</p>
                      </div>
                    </button>
                    <button type="button" onClick={() => setVerifyMethod('whatsapp')} className={cn("flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left", verifyMethod === 'whatsapp' ? "border-accent bg-accent/5" : "border-white bg-white")}>
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", verifyMethod === 'whatsapp' ? "bg-[#25D366] text-white" : "bg-secondary text-primary/40")}>
                        <MessageSquare size={20} />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold">WhatsApp</p>
                        <p className="text-[10px] text-primary/40">Instant code delivery</p>
                      </div>
                    </button>
                  </motion.div>
                )}
                {step === 4 && (
                  <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <div className="relative group">
                      <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30" size={20} />
                      <input 
                        type="text" 
                        autoComplete="one-time-code"
                        value={otp} 
                        onChange={(e) => setOtp(e.target.value)} 
                        placeholder="••••••" 
                        maxLength={6} 
                        className="w-full bg-white px-12 py-5 rounded-2xl outline-none focus:ring-4 ring-accent/5 transition-all text-xl font-bold tracking-[0.5em] text-center" 
                        required 
                      />
                    </div>
                    {serverOtp && (
                      <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Info size={14} className="text-primary/40 shrink-0" />
                          <p className="text-[11px] font-medium text-primary/60">Demo Code: <span className="text-accent font-bold">{serverOtp}</span></p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOtp(serverOtp)}
                          className="text-[10px] font-bold uppercase tracking-wider bg-accent/10 text-accent hover:bg-accent/20 px-2 py-1 rounded-lg transition-colors"
                        >
                          Auto-fill
                        </button>
                      </div>
                    )}
                    <button type="button" onClick={sendOtp} className="w-full text-xs text-accent font-bold hover:underline">Resend Verification Code</button>
                  </motion.div>
                )}
                {step === 5 && (
                  <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 group-focus-within:text-accent transition-colors" size={20} />
                      <input 
                        type="password" 
                        autoComplete="new-password"
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="Minimum 6 characters" 
                        className="w-full bg-white px-12 py-4.5 rounded-2xl outline-none border border-transparent focus:border-accent/20 focus:ring-4 ring-accent/5 transition-all text-sm font-medium" 
                        required 
                      />
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-4.5 rounded-2xl font-bold text-base shadow-xl shadow-primary/20 flex items-center justify-center gap-2 transition-all hover:bg-primary/95 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : (
              isLogin ? 'Sign In' : (
                step === 1 ? 'Continue' : 
                step === 2 ? 'Next' :
                step === 3 ? 'Send Code' : 
                step === 4 ? 'Verify Code' : 'Create Account'
              )
            )}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-primary/40">
            {isLogin ? "New to Axiom Xchange?" : "Have an account already?"}
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setStep(1);
                setError(null);
                setSuccess(null);
                setServerOtp('');
              }}
              className="ml-1.5 text-accent font-bold hover:underline transition-all"
            >
              {isLogin ? 'Join Now' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};


