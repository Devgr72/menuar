import { SignIn, SignUp } from "@clerk/react";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface Props {
  mode: 'sign-in' | 'sign-up'
}

export default function AuthPage({ mode }: Props) {
  const [activeMode, setActiveMode] = useState<"sign-in" | "sign-up">(mode);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname.includes("sign-in")) setActiveMode("sign-in");
    else setActiveMode("sign-up");
  }, [location.pathname]);

  const toggleMode = (mode: "sign-in" | "sign-up") => {
    setActiveMode(mode);
    navigate(mode === "sign-in" ? "/sign-in" : "/sign-up");
  };

  const CLERK_STYLE = {
    elements: {
      card: "!bg-transparent !shadow-none !p-0 !m-0",
      rootBox: "w-full",
      form: "!gap-5",

      header: "hidden",
      footer: "hidden",

      formFieldLabel:
        "!text-[11px] !font-bold !uppercase !tracking-[0.15em] !mb-3 !text-white/30",

      formFieldInput:
        "!h-14 !rounded-xl !bg-white/[0.03] !border !border-white/[0.07] !text-white/90 placeholder:!text-white/70 !px-5 focus:!bg-white/[0.05] focus:!border-purple-500/50 focus:!ring-0 transition-all duration-300",

      formButtonPrimary:
        "!h-14 !rounded-xl !bg-gradient-to-r !from-[#6b3cff] !to-[#8b5cf6] hover:!shadow-[0_0_30px_rgba(107,60,255,0.4)] !text-white !font-bold !text-[15px] !shadow-none !mt-4 transition-all duration-300",

      socialButtonsBlockButton:
        "!h-14 !rounded-xl !border !border-white/[0.07] !bg-white/[0.03] hover:!bg-white/[0.06] !text-white/80 transition-all duration-300",

      socialButtonsBlockButtonText: "!text-white/80 !font-semibold !text-[14px]",

      dividerLine: "!bg-white/[0.05]",
      dividerText: "!text-white/20 !text-[10px] !font-black !uppercase !tracking-[0.2em]",

      identityPreviewText: "!text-white/60",
      identityPreviewEditButton: "!text-purple-400",

      formFieldSuccessText: "!text-emerald-400",
      formFieldErrorText: "!text-red-600 !font-bold",
      formFieldWarningText: "!text-amber-400",

      otpCodeFieldInput:
        "!bg-white/[0.06] !border !border-white/[0.1] !text-white !rounded-xl focus:!border-purple-500/60",

      alertText: "!text-white/70",
      alert: "!bg-white/[0.04] !border !border-white/[0.08] !rounded-xl",
    },
  };

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
                {isSignUp ? (
                  <SignUp 
                    routing="path" 
                    path="/sign-up" 
                    signInUrl="/sign-in" 
                    fallbackRedirectUrl="/onboarding" 
                    appearance={CLERK_STYLE} 
                  />
                ) : (
                  <SignIn
                    routing="path"
                    path="/sign-in"
                    signUpUrl="/sign-up"
                    fallbackRedirectUrl="/"
                    appearance={CLERK_STYLE}
                  />
                )}
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