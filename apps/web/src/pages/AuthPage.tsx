import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authClient, signIn } from "../lib/auth-client";

interface Props {
  mode: 'sign-in' | 'sign-up'
}

export default function AuthPage({ mode }: Props) {
  const [activeMode, setActiveMode] = useState<"sign-in" | "sign-up">(mode);
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (location.pathname.includes("sign-in")) setActiveMode("sign-in");
    else setActiveMode("sign-up");
  }, [location.pathname]);

  const toggleMode = (m: "sign-in" | "sign-up") => {
    setActiveMode(m);
    setFormError(null);
    setFormSuccess(null);
    setIsRedirecting(false);
    setEmail("");
    setPassword("");
    setName("");
    navigate(m === "sign-in" ? "/sign-in" : "/sign-up");
  };

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    setFormSuccess(null);
    setIsRedirecting(false);

    try {
      if (activeMode === "sign-up") {
        const { error } = await authClient.signUp.email({ email, password, name });
        if (error) throw new Error(error.message ?? "Sign up failed");
        setFormSuccess("🎉 Account created! Setting up your workspace…");
        setIsRedirecting(true);
        // Give the session time to propagate, then redirect via full reload
        setTimeout(() => { window.location.href = "/onboarding"; }, 1800);
      } else {
        const { error } = await signIn.email({ email, password });
        if (error) throw new Error(error.message ?? "Invalid email or password");
        setFormSuccess("✅ Signed in successfully! Redirecting…");
        setIsRedirecting(true);
        
        try {
          const { getMe } = await import('../api/client');
          const { owner, subscription } = await getMe();
          if (!owner) {
            window.location.href = "/onboarding";
          } else if (subscription?.status === 'active') {
            window.location.href = "/dashboard";
          } else {
            // Note: The user refers to this phase as "onboarding" too, 
            // but we route to the strict plan selection page UX.
            window.location.href = "/select-plan";
          }
        } catch (err) {
          window.location.href = "/onboarding";
        }
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Authentication failed");
      setFormLoading(false);
      setIsRedirecting(false);
    }
  }

  useEffect(() => {
    // @ts-ignore
    const google = window.google;
    if (google) {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "902871579568-pjjo2k4oqojd1gcmnm471audgtggfle6.apps.googleusercontent.com";
      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
      });
    }
  }, []);

  async function handleGoogleResponse(response: any) {
    setFormLoading(true);
    setFormError(null);
    try {
      const result = await signIn.social({
        provider: "google",
        idToken: { token: response.credential },
        callbackURL: "/",
      });

      if (result.error) {
        throw new Error(result.error.message ?? "Google authentication failed");
      }

      setFormSuccess("✅ Signed in with Google! Redirecting…");
      setIsRedirecting(true);
      
      try {
        const { getMe } = await import('../api/client');
        const { owner, subscription } = await getMe();
        if (!owner) {
          window.location.href = "/onboarding";
        } else if (subscription?.status === 'active') {
          window.location.href = "/dashboard";
        } else {
          window.location.href = "/select-plan";
        }
      } catch (err) {
        window.location.href = "/onboarding";
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Google sign-in failed");
      setFormLoading(false);
    }
  }

  async function handleGoogle() {
    setFormError(null);
    // @ts-ignore
    if (window.google) {
      // @ts-ignore
      window.google.accounts.id.prompt();
    } else {
      setFormError("Google services are still loading. Please try again in a moment.");
    }
  }

  const isSignUp = activeMode === "sign-up";
  const isDisabled = formLoading || !!formSuccess || isRedirecting;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Space+Mono:wght@700&display=swap');
        .auth-font { font-family: 'Sora', sans-serif; }
        .mono-font { font-family: 'Space Mono', monospace; }

        @keyframes orbFloat {
          0%,100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-25px, 18px) scale(1.03); }
          66% { transform: translate(15px, -12px) scale(0.97); }
        }
        .orb-float { animation: orbFloat 12s ease-in-out infinite; }
        .orb-float-reverse { animation: orbFloat 18s ease-in-out infinite reverse; }

        @keyframes pulse-glow { 0%,100%{opacity:0.5} 50%{opacity:1} }
        .badge-pulse { animation: pulse-glow 2s ease-in-out infinite; }

        @keyframes fadeSlideUp {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .fade-slide-up { animation: fadeSlideUp 0.5s cubic-bezier(0.23,1,0.32,1) forwards; }

        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .btn-shimmer {
          background-size: 200% auto;
          animation: shimmer 2.5s linear infinite;
        }

        @keyframes progressBar {
          from { width: 0%; }
          to   { width: 100%; }
        }
        .progress-bar { animation: progressBar 1.8s ease-in-out forwards; }

        @keyframes checkIn {
          0%   { transform: scale(0) rotate(-45deg); opacity: 0; }
          60%  { transform: scale(1.2) rotate(5deg);  opacity: 1; }
          100% { transform: scale(1)   rotate(0deg);  opacity: 1; }
        }
        .check-in { animation: checkIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; }

        @keyframes dotPulse {
          0%,100% { transform: scale(0.8); opacity: 0.4; }
          50%     { transform: scale(1.2); opacity: 1; }
        }
        .dot-1 { animation: dotPulse 1.2s ease-in-out infinite 0s; }
        .dot-2 { animation: dotPulse 1.2s ease-in-out infinite 0.2s; }
        .dot-3 { animation: dotPulse 1.2s ease-in-out infinite 0.4s; }

        .input-focus {
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .input-focus:focus {
          border-color: rgba(107,60,255,0.5);
          box-shadow: 0 0 0 3px rgba(107,60,255,0.12);
          background: rgba(255,255,255,0.06);
          outline: none;
        }

        .google-btn {
          position: relative;
          overflow: hidden;
        }
        .google-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%);
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }
        .google-btn:not(:disabled):hover::after {
          transform: translateX(100%);
        }
      `}</style>

      <div className="auth-font min-h-screen flex items-center justify-center p-4 bg-[#07090f] relative overflow-hidden">

        {/* Background orbs */}
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-[#6b3cff]/10 rounded-full blur-[140px] orb-float pointer-events-none" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[450px] h-[450px] bg-[#00c896]/10 rounded-full blur-[120px] orb-float-reverse pointer-events-none" />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] bg-[#f59e0b]/5 rounded-full blur-[100px] orb-float pointer-events-none" style={{animationDelay: '-4s'}} />

        <div className="relative w-full max-w-[960px] flex flex-col md:flex-row bg-[#0d0f1a]/98 rounded-[32px] overflow-hidden border border-white/[0.07] shadow-[0_50px_150px_rgba(0,0,0,0.9)] z-10">

          {/* LEFT PANEL — slides on mode toggle */}
          <div
            className={`hidden md:flex flex-col justify-between p-12 w-[42%] border-white/[0.05] relative overflow-hidden transition-all duration-[800ms] ease-[cubic-bezier(0.23,1,0.32,1)] z-20 ${isSignUp ? 'md:translate-x-0 border-r' : 'md:translate-x-[138%] border-l'}`}
            style={{ background: "linear-gradient(160deg, rgba(107,60,255,0.15) 0%, rgba(0,200,150,0.08) 100%)" }}
          >
            {/* Dot grid */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

            {/* Logo */}
            <div className="relative flex items-center gap-3">
              <img src="/dishdekho.jpeg" alt="DishDekho" className="w-10 h-10 rounded-xl object-cover border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]" />
              <span className="mono-font text-white text-[13px] font-bold tracking-[0.2em] opacity-80">DISHDEKHO</span>
            </div>

            <div key={activeMode} className="relative space-y-6 fade-slide-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6b3cff]/20 border border-[#6b3cff]/30 text-[#a78bff] text-[10px] uppercase font-bold tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-[#a78bff] badge-pulse" />
                {isSignUp ? "New Here?" : "Welcome Back"}
              </div>
              <h2 className="text-[32px] font-extrabold text-white leading-[1.1] tracking-tight">
                {isSignUp ? (
                  <>Experience food in <br /><span className="bg-gradient-to-r from-[#a78bff] to-[#00c896] bg-clip-text text-transparent">augmented reality</span></>
                ) : (
                  <>Good to see <br />you <span className="bg-gradient-to-r from-[#a78bff] to-[#00c896] bg-clip-text text-transparent">again!</span></>
                )}
              </h2>
              <p className="text-white/40 text-[14px] leading-relaxed max-w-[280px]">
                {isSignUp
                  ? "Create your account and step into a new dimension of restaurant ordering."
                  : "Sign in to manage your digital AR menus and gain insights into guest interactions."}
              </p>
              <div className="space-y-5 pt-3">
                {[
                  { icon: "🍱", title: "3D Dish Previews", desc: "Visualize your entire meal in 3D right on your dining table." },
                  { icon: "⚡", title: "App-Free Access", desc: "Just scan a QR and dive in—no downloads required." },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[16px] group-hover:bg-[#6b3cff]/20 group-hover:scale-110 transition-all duration-300 flex-shrink-0">{item.icon}</div>
                    <div>
                      <p className="text-white/80 text-[13px] font-bold leading-tight group-hover:text-white transition-colors">{item.title}</p>
                      <p className="text-white/25 text-[11px] mt-1 leading-snug">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex gap-2">
              <button onClick={() => toggleMode('sign-up')} className={`px-6 py-2 rounded-xl text-[13px] font-bold transition-all duration-300 ${isSignUp ? 'bg-[#6b3cff] text-white shadow-[0_0_20px_rgba(107,60,255,0.4)]' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>Sign Up</button>
              <button onClick={() => toggleMode('sign-in')} className={`px-6 py-2 rounded-xl text-[13px] font-bold transition-all duration-300 ${!isSignUp ? 'bg-[#6b3cff] text-white shadow-[0_0_20px_rgba(107,60,255,0.4)]' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>Sign In</button>
            </div>
          </div>

          {/* RIGHT PANEL — form */}
          <div className={`flex-1 p-10 md:p-14 flex flex-col justify-center transition-all duration-[800ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${isSignUp ? 'md:translate-x-0' : 'md:translate-x-[-72.4%]'}`}>
            <div key={activeMode} className="w-full fade-slide-up">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-[28px] font-extrabold text-white tracking-tight">
                    {isSignUp ? "Create Account" : "Welcome Back"}
                  </h1>
                  {isSignUp && (
                    <span className="px-2.5 py-0.5 rounded-md bg-[#00c896]/15 border border-[#00c896]/20 text-[#00c896] text-[10px] font-black uppercase tracking-widest">FREE</span>
                  )}
                </div>
                <p className="text-white/30 text-[14px] font-medium">
                  Start your <span className="text-[#a78bff] font-bold">AR experience</span> today
                </p>
              </div>

              {/* Success banner with progress bar */}
              {formSuccess && (
                <div className="mb-5 rounded-xl bg-[#00c896]/10 border border-[#00c896]/30 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-5 h-5 rounded-full bg-[#00c896] flex items-center justify-center flex-shrink-0 check-in">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[#00c896] font-bold text-[13px] flex-1">{formSuccess}</span>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00c896] dot-1" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00c896] dot-2" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00c896] dot-3" />
                    </div>
                  </div>
                  {isRedirecting && (
                    <div className="h-0.5 bg-[#00c896]/20">
                      <div className="h-full bg-[#00c896] progress-bar" />
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
                {isSignUp && (
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/30">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Smith"
                      disabled={isDisabled}
                      className="input-focus h-14 rounded-xl bg-white/[0.03] border border-white/[0.07] text-white/90 placeholder:text-white/25 px-5 disabled:opacity-50"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/30">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@restaurant.com"
                    disabled={isDisabled}
                    className="input-focus h-14 rounded-xl bg-white/[0.03] border border-white/[0.07] text-white/90 placeholder:text-white/25 px-5 disabled:opacity-50"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/30">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isDisabled}
                    className="input-focus h-14 rounded-xl bg-white/[0.03] border border-white/[0.07] text-white/90 placeholder:text-white/25 px-5 disabled:opacity-50"
                  />
                </div>

                {formError && (
                  <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 fade-slide-up">
                    <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-red-400 text-[13px] font-medium">{formError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isDisabled}
                  className="h-14 rounded-xl text-white font-bold text-[15px] mt-2 transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-2 relative overflow-hidden"
                  style={{
                    background: formSuccess
                      ? 'linear-gradient(135deg, #00c896, #00a878)'
                      : 'linear-gradient(135deg, #6b3cff 0%, #8b5cf6 50%, #6b3cff 100%)',
                    boxShadow: formSuccess
                      ? '0 0 30px rgba(0,200,150,0.35)'
                      : '0 0 30px rgba(107,60,255,0.3)',
                    backgroundSize: '200% auto',
                  }}
                >
                  {formLoading && !formSuccess ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>{isSignUp ? "Creating account…" : "Signing in…"}</span>
                    </>
                  ) : formSuccess ? (
                    <>
                      <svg className="w-4 h-4 check-in" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{isSignUp ? "Account created!" : "Signed in!"}</span>
                    </>
                  ) : (
                    <span>{isSignUp ? "Create Account" : "Sign In"}</span>
                  )}
                </button>
              </form>

              <div className="flex items-center gap-4 my-5">
                <div className="flex-1 h-px bg-white/[0.05]" />
                <span className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em]">or</span>
                <div className="flex-1 h-px bg-white/[0.05]" />
              </div>

              <div className="relative group">
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={isDisabled}
                  className="google-btn w-full h-14 rounded-xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] text-white/60 font-semibold text-[14px] transition-all duration-300 disabled:opacity-40 flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5 opacity-60" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
              </div>
            </div>

            {/* Mobile footer toggle */}
            <p className="md:hidden text-center mt-10 text-white/20 text-[13px]">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button onClick={() => toggleMode(isSignUp ? 'sign-in' : 'sign-up')} className="text-[#a78bff] font-black hover:underline ml-1">
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>

            <div className="mt-10 flex items-center justify-center gap-8 text-white/10">
              <a href="#" className="text-[10px] font-black uppercase tracking-widest hover:text-white/30 transition-colors">Help</a>
              <a href="#" className="text-[10px] font-black uppercase tracking-widest hover:text-white/30 transition-colors">Privacy</a>
              <p className="text-[10px] font-black uppercase tracking-widest">© 2026 DISHDEKHO</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
