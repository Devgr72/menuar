import { SignIn, SignUp } from '@clerk/react'

interface AuthPageProps {
  mode: 'sign-in' | 'sign-up'
}

const CLERK_APPEARANCE = {
  variables: {
    colorPrimary:         '#2563eb',
    colorBackground:      '#ffffff',
    colorText:            '#0f172a',
    colorTextSecondary:   '#64748b',
    colorInputBackground: '#f8fafc',
    colorInputText:       '#0f172a',
    colorDanger:          '#ef4444',
    borderRadius:         '0.85rem',
    fontFamily:           'Outfit, sans-serif',
  },
  elements: {
    // Force full width and remove nested "box" effects
    rootBox:                  'w-full !m-0 !p-0',
    card:                     'w-full',
    main:                     'w-full',
    scrollBox:                'w-full',
    pageScrollBox:            'w-full',
    
    // Hide Clerk's internal header — we use our own custom one
    header:                   'hidden',
    headerTitle:              '!hidden',
    headerSubtitle:           '!hidden',
    
    // Buttons: Premium Outfit font + subtle transition
    formButtonPrimary:        '!bg-[#2563eb] hover:!bg-[#1d4ed8] !font-bold !text-white !py-4 !rounded-2xl !transition-all !duration-300 hover:!shadow-xl hover:!shadow-blue-500/20 !text-[15px] !mt-2 !w-full !tracking-wide',
    socialButtonsBlockButton: '!border !border-slate-200 hover:!bg-slate-50 !bg-white !text-slate-700 !font-semibold !rounded-2xl !py-3.5 !text-[14px] !transition-all !w-full hover:!border-slate-300',
    socialButtonsBlockButtonText: '!font-semibold !tracking-tight',
    
    // Inputs
    formFieldInput:           '!border !border-slate-200 !rounded-2xl focus:!ring-4 focus:!ring-[#2563eb]/10 focus:!border-[#2563eb] !bg-slate-50/50 !text-slate-800 placeholder:!text-slate-400 !py-3.5 !transition-all !w-full',
    formFieldLabel:           '!text-[#94A3B8] !font-bold !text-[10px] !uppercase !tracking-[0.15em] !mb-2',
    
    // Verification / OTP styling
    otpCodeFieldInput:        '!border-2 !border-slate-200 !rounded-2xl !w-12 !h-14 !text-xl !font-bold focus:!border-[#2563eb] focus:!ring-0',
    
    // Links & footer cleanup
    footer:                   '!text-slate-500 !mt-6',
    footerActionLink:         '!text-[#2563eb] !font-bold hover:!text-[#1d4ed8] !no-underline hover:!underline',
    footerActionText:         '!text-[#94A3B8] !font-medium',
    dividerText:              '!text-slate-300 !font-bold !text-[10px] !uppercase !tracking-[0.2em]',
    dividerLine:              '!bg-slate-100',
    identityPreviewText:      '!text-slate-900 !font-semibold',
    identityPreviewEditButton:'!text-[#2563eb] !font-bold',
    formFieldErrorText:       '!text-red-500 !text-xs !font-medium !mt-1',
  },
}

type DishCard = {
  emoji: string
  name: string
  price: string
  top: string
  left?: string
  right?: string
  delay: string
}

const dishCards: DishCard[] = [
  { emoji: '🍕', name: 'Margherita',  price: '₹299', top: '24%', left:  '6%',  delay: '0s'   },
  { emoji: '🍜', name: 'Ramen Bowl',  price: '₹349', top: '50%', right: '4%',  delay: '0.9s' },
  { emoji: '🍣', name: 'Sushi',       price: '₹499', top: '72%', left:  '8%',  delay: '1.6s' },
]

export default function AuthPage({ mode }: AuthPageProps) {
  return (
    <div className="min-h-screen flex font-poppins bg-slate-50">

      {/* ═══════════════════════════════════════
          LEFT PANEL  (desktop only)
      ═══════════════════════════════════════ */}
      <div
        className="hidden lg:flex lg:w-[50%] xl:w-[54%] relative flex-col overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0b1d4b 0%, #1340a8 55%, #1e6ef5 100%)' }}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {/* Subtle noise/grain texture */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3C%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
          
          {/* Animated Glows */}
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-amber-400/10 blur-[120px] animate-pulse transition-duration-[4s]" />
          <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[100px]" />
          
          {/* Dot Grid */}
          <div 
            className="absolute inset-0 opacity-[0.08]" 
            style={{ 
              backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', 
              backgroundSize: '32px 32px' 
            }} 
          />
        </div>

        <div className="relative z-10 flex flex-col h-full p-8 xl:p-10">

          {/* ── Brand ── */}
          <div className="flex items-center gap-4 shrink-0 group cursor-default">
            <div className="h-12 w-12 rounded-2xl overflow-hidden shadow-2xl border border-white/20 transition-transform duration-300 group-hover:scale-110">
              <img
                src="/dishdekho.jpeg"
                alt="DishDekho"
                className="h-full w-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            </div>
            <div>
              <p className="text-[1.65rem] font-black leading-none tracking-tight">
                <span className="text-amber-400">Dish</span>
                <span className="text-white">Dekho</span>
              </p>
              <p className="text-blue-200/60 text-[10px] font-bold tracking-[0.25em] uppercase mt-[3px]">
                AR Restaurant Menus
              </p>
            </div>
          </div>

          {/* ── Headline ── */}
          <div className="mt-10 xl:mt-16 max-w-[500px]">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 rounded-full px-4 py-1.5 mb-8">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-blue-50 text-[10px] font-black tracking-[0.1em] uppercase">
                The Future of Dining is Here
              </span>
            </div>
            
            <h1 className="text-[3.2rem] xl:text-[4rem] font-black text-white leading-[1.05] tracking-tight">
              Let guests{' '}
              <span className="relative inline-block">
                <span className="text-amber-400 italic">see the dish</span>
                <svg
                  className="absolute -bottom-1 left-0 w-full"
                  height="6" viewBox="0 0 100 6" preserveAspectRatio="none"
                >
                  <path d="M0 5 Q50 0 100 5" stroke="#fbbf24" strokeWidth="3" fill="none" strokeLinecap="round"/>
                </svg>
              </span>
              <br />before they order.
            </h1>
            
            <p className="text-blue-100/70 text-lg mt-8 leading-relaxed font-medium">
              Immersive WebAR menus — scan a QR, see 3D dishes <span className="text-white">float on the table</span>. No apps, zero friction, maximum engagement.
            </p>
          </div>

          {/* ── Phone Mockup (Interactive Model) ── */}
          <div className="flex-1 flex items-center justify-center -mt-10">
            <div className="relative group">
              
              {/* Floating Badge Left */}
              <div className="absolute -left-16 top-[20%] z-20 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/50 p-3 flex items-center gap-3 animate-float pointer-events-none">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-xl">🔥</div>
                <div className="pr-2">
                  <p className="text-slate-900 text-[11px] font-black leading-none uppercase tracking-wider">Top Rated</p>
                  <p className="text-slate-400 text-[9px] font-bold mt-1">#1 AR Plugin</p>
                </div>
              </div>

              {/* Floating Badge Right */}
              <div className="absolute -right-16 bottom-[30%] z-20 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/50 p-4 flex items-center gap-4 animate-float-2 pointer-events-none">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl">🔍</div>
                <div>
                  <p className="text-slate-900 text-[12px] font-black leading-none uppercase tracking-wider">Live Preview</p>
                  <p className="text-green-500 text-[10px] font-black mt-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    LIVE NOW
                  </p>
                </div>
              </div>

              {/* Phone shell */}
              <div className="relative w-[220px] xl:w-[260px] transition-transform duration-500 group-hover:rotate-1 group-hover:scale-105">
                <div className="bg-slate-900 rounded-[3rem] p-[8px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-white/20">
                  <div className="bg-[#0b1424] rounded-[2.6rem] overflow-hidden aspect-[9/19] relative">
                    
                    {/* Screen Content */}
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#0f172a]" />
                    
                    {/* AR Scanning effect */}
                    <div className="absolute inset-0">
                       <div className="absolute top-[15%] left-[10%] w-[80%] h-[60%] border-2 border-dashed border-white/10 rounded-3xl" />
                       <div className="absolute top-[15%] left-[10%] w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                       <div className="absolute top-[15%] right-[10%] w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                       <div className="absolute bottom-[25%] left-[10%] w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                       <div className="absolute bottom-[25%] right-[10%] w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />
                       
                       <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-amber-400/20 to-transparent opacity-30 animate-scanline" />
                    </div>

                    {/* Main Dish (AR) */}
                    <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-[100px] animate-float drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]">
                      🍛
                    </div>

                    {/* UI Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-slate-950 to-transparent">
                        <div className="flex items-end justify-between gap-4">
                           <div className="flex-1">
                              <h3 className="text-white font-black text-xl leading-tight">Mughlai Biryani</h3>
                              <p className="text-amber-400 font-black text-sm mt-1">Classic Spicy Indian</p>
                           </div>
                           <div className="bg-white/10 backdrop-blur-md rounded-xl px-3 py-1.5 border border-white/20">
                              <span className="text-white font-black">₹449</span>
                           </div>
                        </div>
                        <div className="mt-6 flex gap-2">
                           <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full w-2/3 bg-amber-400" />
                           </div>
                           <div className="w-12 h-3 rounded-full bg-white/5" />
                        </div>
                    </div>

                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-950 rounded-b-3xl z-30" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Stats bar ── */}
          <div className="shrink-0 flex items-center gap-4 p-1 rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden shadow-2xl">
            {[
              { v: '3s',   l: 'Load time',    c: 'amber' },
              { v: '0',    l: 'App installs', c: 'blue'  },
              { v: '100%', l: 'Mobile-ready', c: 'green' },
            ].map((s) => (
              <div key={s.l} className="flex-1 flex flex-col items-center py-6 px-4 rounded-[1.8rem] hover:bg-white/[0.03] transition-colors cursor-default">
                <span className="text-[1.8rem] font-black text-white leading-none tracking-tight">
                  {s.v}
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-white/40 mt-2">
                  {s.l}
                </span>
              </div>
            ))}
          </div>

        </div>

        <style>{`
          @keyframes scanline {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(200%); }
          }
          .animate-scanline {
            animation: scanline 3s linear infinite;
          }
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-15px); }
          }
          .animate-float {
            animation: float 5s ease-in-out infinite;
          }
          @keyframes float-2 {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .animate-float-2 {
            animation: float-2 7s ease-in-out infinite 1s;
          }
        `}</style>
      </div>

      {/* ═══════════════════════════════════════
          RIGHT PANEL
      ═══════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-screen relative overflow-y-auto">
        
        {/* Animated Background Gradients (Mesh Effect) */}
        <div className="absolute inset-0 bg-[#f8fafc] -z-10">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-100/40 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-50/60 blur-[120px]" />
          <div className="absolute top-[20%] left-[10%] w-[30%] h-[30%] rounded-full bg-amber-50/50 blur-[100px]" />
        </div>

        {/* Brand bar (Visible on Mobile & Tablet) */}
        <div className="lg:hidden flex items-center justify-between px-6 py-5 bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl overflow-hidden shadow-sm border border-slate-100">
              <img
                src="/dishdekho.jpeg"
                alt="DishDekho"
                className="h-full w-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            </div>
            <div>
              <p className="text-xl font-extrabold leading-none tracking-tight">
                <span className="text-amber-500">Dish</span>
                <span className="text-slate-900">Dekho</span>
              </p>
              <p className="text-slate-400 text-[9px] font-bold tracking-[0.15em] uppercase mt-[2px]">
                AR Restaurant Menus
              </p>
            </div>
          </div>
          
          <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400 border border-slate-100">
            ?
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12 py-8 lg:py-12">
          
          {/* Constrained layout for better focus on large screens */}
          <div className="w-full max-w-[600px]">
            
            {/* Card Wrapper with Glassmorphism Effect */}
            <div className="overflow-hidden transition-all duration-300">
              
              {/* Card Header */}
              <div className="px-10 pt-10 pb-1 text-center">
                <div className="flex items-center justify-center gap-6 mb-8">
                   <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold tracking-wider uppercase border border-blue-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      Secure Portal
                   </div>
                   <div className="h-10 w-10 rounded-xl bg-[#FAFAFA] border border-[#F1F5F9] shadow-sm flex items-center justify-center p-1.5">
                      <img src="/dishdekho.jpeg" alt="Logo" className="w-full h-full object-contain" />
                   </div>
                </div>
                
                <h2 className="font-fraunces text-4xl font-bold text-[#1E293B] leading-[1.1] mb-3 tracking-tight">
                  {mode === 'sign-up' ? 'Craft an Unforgettable Menu.' : 'Welcome Back, Chef.'}
                </h2>
                <p className="font-outfit text-[#64748B] text-base font-medium leading-relaxed">
                  {mode === 'sign-up'
                    ? 'Transform your dining experience with immersive 3D and AR menus.'
                    : 'Continue managing your digital AR dining masterpieces.'}
                </p>
                
                <div className="h-px w-full bg-slate-100 mt-8" />
              </div>

              {/* Clerk Container - ensuring no horizontal squashing */}
              <div className="pb-12 pt-6 flex justify-center">
                <div className="w-full">
                  {mode === 'sign-up' ? (
                    <SignUp
                      routing="path"
                      path="/sign-up"
                      signInUrl="/sign-in"
                      fallbackRedirectUrl="/onboarding"
                      appearance={CLERK_APPEARANCE}
                    />
                  ) : (
                    <SignIn
                      routing="path"
                      path="/sign-in"
                      signUpUrl="/sign-up"
                      fallbackRedirectUrl="/dashboard"
                      appearance={CLERK_APPEARANCE}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Support / Help Links */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
              <div className="flex gap-6">
                <a href="#" className="text-slate-400 hover:text-blue-500 text-xs font-semibold transition-colors">Help Center</a>
                <a href="#" className="text-slate-400 hover:text-blue-500 text-xs font-semibold transition-colors">Privacy</a>
                <a href="#" className="text-slate-400 hover:text-blue-500 text-xs font-semibold transition-colors">Terms</a>
              </div>
              <p className="text-slate-300 text-[11px] font-bold uppercase tracking-widest">
                © {new Date().getFullYear()} DishDekho
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
