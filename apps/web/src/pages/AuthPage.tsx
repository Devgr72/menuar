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

  useEffect(() => {
    if (location.pathname.includes("sign-in")) setActiveMode("sign-in");
    else setActiveMode("sign-up");
  }, [location.pathname]);

  const toggleMode = (m: "sign-in" | "sign-up") => {
    setActiveMode(m);
    setFormError(null);
    navigate(m === "sign-in" ? "/sign-in" : "/sign-up");
  };

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      if (activeMode === "sign-up") {
        const { error } = await authClient.signUp.email({ email, password, name });
        if (error) throw new Error(error.message ?? "Sign up failed");
        navigate("/onboarding", { replace: true });
      } else {
        const { error } = await signIn.email({ email, password });
        if (error) throw new Error(error.message ?? "Sign in failed");
        navigate("/", { replace: true });
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleGoogle() {
    setFormError(null);
    await signIn.social({ provider: "google", callbackURL: "/" });
  }

  const isSignUp = activeMode === "sign-up";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Space+Mono:wght@700&display=swap');
        .auth-font { font-family: 'Sora', sans-serif; }
        .mono-font { font-family: 'Space Mono', monospace; }
        @keyframes orbFloat { 0%,100%{transform:translate(0px, 0px)} 50%{transform:translate(-30px, 20px)} }
        .orb-float { animation: orbFloat 10s ease-in-out infinite; }
        .orb-float-reverse { animation: orbFloat 15s ease-in-out infinite reverse; }
        @keyframes pulse-glow { 0%,100%{opacity:0.4} 50%{opacity:1} }
        .badge-pulse { animation: pulse-glow 2s infinite; }
      `}</style>

      <div className="auth-font min-h-screen flex items-center justify-center p-4 bg-[#07090f] relative overflow-hidden">
        
        {/* Futuristic Background Effects */}
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-[#6b3cff]/10 rounded-full blur-[140px] orb-float" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[450px] h-[450px] bg-[#00c896]/10 rounded-full blur-[120px] orb-float-reverse" />

        {/* ═══════════════════════════════════════
            MAIN AUTH CARD (Premium Sliding Panel)
        ═══════════════════════════════════════ */}
        <div className="relative w-full max-w-[960px] flex flex-col md:flex-row bg-[#0d0f1a]/98 rounded-[32px] overflow-hidden border border-white/[0.07] shadow-[0_50px_150px_rgba(0,0,0,0.9)] z-10 transition-all duration-700">
          
          {/* LEFT PANEL (42% Width - The Info/Switch Panel) */}
          <div 
            className={`hidden md:flex flex-col justify-between p-12 w-[42%] border-white/[0.05] relative overflow-hidden transition-all duration-[800ms] ease-[cubic-bezier(0.23,1,0.32,1)] z-20 ${isSignUp ? 'md:translate-x-0 border-r' : 'md:translate-x-[138%] border-l'}`}
            style={{
              background: "linear-gradient(160deg, rgba(107,60,255,0.15) 0%, rgba(0,200,150,0.08) 100%)",
            }}
          >
            {/* Dot grid overlay */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
            
            {/* Brand */}
            <div className="relative flex items-center gap-3">
              <img 
                src="/dishdekho.jpeg" 
                alt="DishDekho" 
                className="w-10 h-10 rounded-xl object-cover border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]" 
              />
              <span className="mono-font text-white text-[13px] font-bold tracking-[0.2em] opacity-80">DISHDEKHO</span>
            </div>

            {/* Content Section */}
            <div key={activeMode} className="relative space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
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
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[16px] group-hover:bg-[#6b3cff]/20 group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-white/80 text-[13px] font-bold leading-tight group-hover:text-white transition-colors">
                        {item.title}
                      </p>
                      <p className="text-white/25 text-[11px] mt-1 leading-snug">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mode Toggles */}
            <div className="relative flex gap-2">
              <button 
                onClick={() => toggleMode('sign-up')}
                className={`px-6 py-2 rounded-xl text-[13px] font-bold transition-all duration-300 ${isSignUp ? 'bg-[#6b3cff] text-white shadow-[0_0_20px_rgba(107,60,255,0.4)]' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
              >
                Sign Up
              </button>
              <button 
                onClick={() => toggleMode('sign-in')}
                className={`px-6 py-2 rounded-xl text-[13px] font-bold transition-all duration-300 ${!isSignUp ? 'bg-[#6b3cff] text-white shadow-[0_0_20px_rgba(107,60,255,0.4)]' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
              >
                Sign In
              </button>
            </div>
          </div>

          {/* RIGHT PANEL (58% Width - The Form Panel) */}
          <div 
            className={`flex-1 p-10 md:p-14 flex flex-col justify-center transition-all duration-[800ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${isSignUp ? 'md:translate-x-0' : 'md:translate-x-[-72.4%]'}`}
          >
            <div key={activeMode} className="w-full animate-in fade-in slide-in-from-bottom-2 duration-700">
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-[28px] font-extrabold text-white tracking-tight">
                    {isSignUp ? "Create Account" : "Welcome Back"}
                  </h1>
                  {isSignUp && (
                    <span className="px-2.5 py-0.5 rounded-md bg-[#00c896]/15 border border-[#00c896]/20 text-[#00c896] text-[10px] font-black uppercase tracking-widest">
                      FREE
                    </span>
                  )}
                </div>
                <p className="text-white/30 text-[14px] font-medium tracking-tight">
                  Start your <span className="text-[#a78bff] font-bold">AR experience</span> today
                </p>
              </div>

              <div className="relative w-full">
                <form onSubmit={handleEmailSubmit} className="flex flex-col gap-5">
                  {isSignUp && (
                    <div className="flex flex-col gap-3">
                      <label className="!text-[11px] !font-bold !uppercase !tracking-[0.15em] !text-white/30">Full Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Smith"
                        className="h-14 rounded-xl bg-white/[0.03] border border-white/[0.07] text-white/90 placeholder:text-white/30 px-5 focus:bg-white/[0.05] focus:border-purple-500/50 focus:outline-none transition-all duration-300"
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-3">
                    <label className="!text-[11px] !font-bold !uppercase !tracking-[0.15em] !text-white/30">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@restaurant.com"
                      className="h-14 rounded-xl bg-white/[0.03] border border-white/[0.07] text-white/90 placeholder:text-white/30 px-5 focus:bg-white/[0.05] focus:border-purple-500/50 focus:outline-none transition-all duration-300"
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <label className="!text-[11px] !font-bold !uppercase !tracking-[0.15em] !text-white/30">Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-14 rounded-xl bg-white/[0.03] border border-white/[0.07] text-white/90 placeholder:text-white/30 px-5 focus:bg-white/[0.05] focus:border-purple-500/50 focus:outline-none transition-all duration-300"
                    />
                  </div>
                  {formError && (
                    <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-red-400 font-bold text-[13px]">
                      {formError}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="h-14 rounded-xl bg-gradient-to-r from-[#6b3cff] to-[#8b5cf6] hover:shadow-[0_0_30px_rgba(107,60,255,0.4)] text-white font-bold text-[15px] shadow-none mt-4 transition-all duration-300 disabled:opacity-60"
                  >
                    {formLoading ? "Please wait…" : isSignUp ? "Create Account" : "Sign In"}
                  </button>
                </form>

                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-white/[0.05]" />
                  <span className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em]">or</span>
                  <div className="flex-1 h-px bg-white/[0.05]" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogle}
                  className="w-full h-14 rounded-xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] text-white/80 font-semibold text-[14px] transition-all duration-300 flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
              </div>
            </div>

            {/* Mobile Footer Toggle */}
            <p className="md:hidden text-center mt-10 text-white/20 text-[13px]">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button 
                onClick={() => toggleMode(isSignUp ? 'sign-in' : 'sign-up')}
                className="text-[#a78bff] font-black hover:underline ml-1"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>

            {/* Legal Footer Links */}
            <div className="mt-14 flex items-center justify-center gap-8 text-white/10">
               <a href="#" className="text-[10px] font-black uppercase tracking-widest hover:text-white/30 transition-colors">Help</a>
               <a href="#" className="text-[10px] font-black uppercase tracking-widest hover:text-white/30 transition-colors">Privacy</a>
               <p className="text-[10px] font-black uppercase tracking-widest">© 2026 ARMENU</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}