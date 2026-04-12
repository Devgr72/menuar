import { SignIn, SignUp } from '@clerk/react'

interface AuthPageProps {
  mode: 'sign-in' | 'sign-up'
}

const CLERK_APPEARANCE = {
  variables: {
    colorPrimary:         '#2563eb',
    colorBackground:      '#ffffff',
    colorText:            '#0f172a',
    colorTextSecondary:   '#475569',
    colorInputBackground: '#ffffff',
    colorInputText:       '#0f172a',
    colorDanger:          '#ef4444',
    borderRadius:         '0.75rem',
    fontFamily:           'Inter, "Inter var", sans-serif',
  },
  elements: {
    rootBox:                  'w-full !max-w-full !m-0 !p-0',
    card:                     '!shadow-none !border-0 !bg-transparent !p-0 !m-0 !w-full !max-w-full',
    main:                     '!w-full !max-w-full !p-0 !m-0',
    scrollBox:                '!p-0 !m-0 !shadow-none !border-0 !w-full !max-w-full',
    pageScrollBox:            '!p-0 !m-0 !w-full !max-w-full',
    
    header:                   '!hidden',
    headerTitle:              '!hidden',
    headerSubtitle:           '!hidden',
    
    // Buttons: Clean SaaS UI (Stripe/Clerk Style)
    formButtonPrimary:        '!bg-[#2563eb] hover:!bg-[#1d4ed8] !font-semibold !text-white !py-3 !rounded-lg !transition-all !duration-200 !text-[15px] !mt-6 !w-full !border-0 !shadow-sm hover:!shadow-md',
    socialButtonsBlockButton: '!border !border-slate-200 hover:!bg-slate-50 !bg-white !text-slate-700 !font-medium !rounded-lg !py-3 !text-[14px] !transition-all !w-full !shadow-sm hover:!shadow !mt-2',
    socialButtonsBlockButtonText: '!font-medium !tracking-tight',
    socialButtonsProviderIcon: '!w-5 !h-5',
    
    // Inputs: Proper spacing and consistent alignment
    formFieldInput:           '!border !border-slate-200 !rounded-lg focus:!ring-2 focus:!ring-blue-100 focus:!border-blue-500 !bg-white !text-slate-800 placeholder:!text-slate-400 !py-3 !px-4 !transition-all !w-full !font-normal',
    formFieldLabel:           '!text-slate-700 !font-semibold !text-[13px] !mb-1.5 !mt-5 !block',
    formFieldInputGroup:      '!mb-2',
    
    // OR Divider
    dividerRow:               '!my-10 !opacity-50',
    dividerText:              '!text-slate-400 !font-semibold !text-[12px]',
    dividerLine:              '!bg-slate-200',
    
    // Identity & Errors
    identityPreviewText:      '!text-slate-900 !font-medium',
    identityPreviewEditButton:'!text-[#2563eb] !font-semibold',
    formFieldErrorText:       '!text-red-500 !text-xs !font-medium !mt-1.5',
    
    // Footer
    footer:                   '!text-slate-500 !mt-10',
    footerActionLink:         '!text-[#2563eb] !font-semibold hover:!underline',
    footerActionText:         '!text-slate-500 !font-medium',
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

        <div className="relative z-10 flex flex-col h-full p-12 xl:p-16">

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
          <div className="mt-12 xl:mt-20 max-w-[650px] shrink-0">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 rounded-full px-4 py-1.5 mb-8">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-blue-50 text-[10px] font-black tracking-[0.1em] uppercase">
                The Future of Dining is Here
              </span>
            </div>
            
            <h1 className="text-[3.2rem] xl:text-[3.8rem] font-black text-white leading-[1.05] tracking-tight">
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
            
            <p className="text-blue-100/70 text-lg mt-6 leading-relaxed font-medium">
              Immersive WebAR menus — scan a QR, see 3D dishes <span className="text-white font-bold">float on the table</span>. No apps, zero friction.
            </p>
          </div>

          {/* ── Phone Mockup (Interactive Model) ── */}
          <div className="flex-1 flex items-center justify-center min-h-[420px] relative">
            <div className="relative group">
              
              {/* Floating Badge Left */}
              <div className="absolute -left-20 top-[15%] z-50 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/50 p-3 flex items-center gap-3 animate-float pointer-events-none">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-xl">🔥</div>
                <div className="pr-2">
                  <p className="text-slate-900 text-[11px] font-black leading-none uppercase tracking-wider">Top Rated</p>
                  <p className="text-slate-400 text-[9px] font-bold mt-1">#1 AR Plugin</p>
                </div>
              </div>

              {/* Floating Badge Right */}
              <div className="absolute -right-20 bottom-[25%] z-50 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/50 p-4 flex items-center gap-4 animate-float-2 pointer-events-none">
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
              <div className="relative w-[280px] xl:w-[310px] transition-transform duration-700 group-hover:scale-105">
                <div className="bg-slate-900 rounded-[3.2rem] p-[10px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] border border-white/20 relative">
                  {/* Outer Glow */}
                  <div className="absolute inset-0 rounded-[3.2rem] bg-blue-500/10 blur-2xl -z-10 group-hover:bg-blue-500/20 transition-all" />
                  
                  <div className="bg-[#0b1424] rounded-[2.6rem] overflow-hidden aspect-[9/19] relative">
                    
                    {/* Screen Content */}
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#0f172a]" />
                    
                    {/* AR Scanning effect */}
                    <div className="absolute inset-0 z-10 pointer-events-none">
                       {/* Scanner Box */}
                       <div className="absolute top-[12%] left-[8%] w-[84%] h-[65%] border border-white/5 rounded-3xl" />
                       
                       {/* Scanner Corners */}
                       <div className="absolute top-[12%] left-[8%] w-8 h-8 border-t-[3px] border-l-[3px] border-amber-400 rounded-tl-xl shadow-[0_0_10px_#fbbf24]" />
                       <div className="absolute top-[12%] right-[8%] w-8 h-8 border-t-[3px] border-r-[3px] border-amber-400 rounded-tr-xl shadow-[0_0_10px_#fbbf24]" />
                       <div className="absolute bottom-[23%] left-[8%] w-8 h-8 border-b-[3px] border-l-[3px] border-amber-400 rounded-bl-xl shadow-[0_0_10px_#fbbf24]" />
                       <div className="absolute bottom-[23%] right-[8%] w-8 h-8 border-b-[3px] border-r-[3px] border-amber-400 rounded-br-xl shadow-[0_0_10px_#fbbf24]" />
                       
                       {/* Laser Beam */}
                       <div className="absolute w-[80%] left-[10%] h-[2px] bg-amber-400 shadow-[0_0_20px_#fbbf24,0_0_40px_#fbbf24] z-20 animate-laser" />
                       
                       {/* Scanning Overlay Pulse */}
                       <div className="absolute inset-0 bg-amber-400/5 animate-pulse-slow" />
                    </div>

                    {/* 3D Dishes Rendering (Animated) */}
                    <div className="absolute inset-x-0 top-[35%] flex items-center justify-center">
                        {/* Dish 1: Pizza */}
                        <div className="absolute text-[80px] animate-dish-1 drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                          🍕
                        </div>
                        {/* Dish 2: Ramen */}
                        <div className="absolute text-[85px] animate-dish-2 drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                          🍜
                        </div>
                        {/* Dish 3: Biryani */}
                        <div className="absolute text-[90px] animate-dish-3 drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                          🍛
                        </div>
                    </div>

                    {/* UI Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent z-20">
                        <div className="flex items-end justify-between gap-4">
                           <div className="flex-1">
                              <p className="text-amber-400 font-black text-[10px] uppercase tracking-widest mb-1">Recommended</p>
                              <h3 className="text-white font-black text-xl leading-tight">Gourmet Selection</h3>
                              <p className="text-blue-200/50 text-[11px] font-bold mt-1 italic">3D View Experience</p>
                           </div>
                           <div className="bg-white/10 backdrop-blur-md rounded-2xl px-3 py-2 border border-white/20">
                              <span className="text-white font-black text-lg">₹449</span>
                           </div>
                        </div>
                        <button className="w-full mt-6 py-3 bg-amber-400 rounded-2xl text-slate-950 font-black text-sm tracking-wider uppercase shadow-[0_10px_20px_rgba(251,191,36,0.2)] hover:scale-[1.02] transition-transform">
                          Order in AR
                        </button>
                    </div>

                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-slate-950 rounded-b-[2rem] z-30 shadow-inner" />
                  </div>
                </div>
              </div>
            </div>
          </div>



        </div>

        <style>{`
          @keyframes laser {
            0% { top: 12%; opacity: 0; }
            10% { opacity: 1; }
            50% { top: 77%; opacity: 1; }
            90% { opacity: 1; }
            100% { top: 12%; opacity: 0; }
          }
          .animate-laser {
            animation: laser 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          }
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.05; }
            50% { opacity: 0.15; }
          }
          .animate-pulse-slow {
            animation: pulse-slow 4s ease-in-out infinite;
          }
          @keyframes dish-1 {
            0%, 33.33% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
            33.34%, 100% { opacity: 0; transform: translateY(50px) scale(0.5); }
          }
          @keyframes dish-2 {
            0%, 33.33% { opacity: 0; transform: translateY(-50px) scale(0.5); }
            33.34%, 66.66% { opacity: 1; transform: translateY(0) scale(1) rotate(5deg); }
            66.67%, 100% { opacity: 0; transform: translateY(50px) scale(0.5); }
          }
          @keyframes dish-3 {
            0%, 66.66% { opacity: 0; transform: translateY(-50px) scale(0.5); }
            66.67%, 100% { opacity: 1; transform: translateY(0) scale(1) rotate(-5deg); }
          }
          .animate-dish-1 { animation: dish-1 12s infinite; }
          .animate-dish-2 { animation: dish-2 12s infinite; }
          .animate-dish-3 { animation: dish-3 12s infinite; }
          
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-15px); }
          }
          .animate-float {
            animation: float 5s ease-in-out infinite;
          }
          @keyframes float-2 {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-12px); }
          }
          .animate-float-2 {
            animation: float-2 7s ease-in-out infinite 1s;
          }
        `}</style>
      </div>

      {/* ═══════════════════════════════════════
          RIGHT PANEL
      ═══════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
        
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
        <div className="flex-1 flex flex-col justify-center items-center px-6 sm:px-12 py-12 lg:py-20">
          
          {/* Card Wrapper - Clean Modern SaaS UI */}
          <div className="w-full max-w-[500px]">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.1)] overflow-hidden">
              
              {/* Card Header Section - Spacious Breathing Room */}
              <div className="px-8 sm:px-12 pt-12 pb-4 text-center sm:text-left">
                <div className="hidden sm:block mb-8">
                   <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[11px] font-semibold tracking-wide uppercase border border-blue-100/50">
                      <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                      Secure Portal
                   </div>
                </div>
                
                <h2 className="text-3xl font-bold text-slate-900 leading-tight mb-2 tracking-tight">
                  {mode === 'sign-up' ? 'Create Account' : 'Welcome Back'}
                </h2>
                <p className="text-slate-500 text-base font-medium leading-relaxed tracking-tight">
                  {mode === 'sign-up'
                    ? "Start creating immersive AR experiences."
                    : 'Sign in to manage your digital menus.'}
                </p>
              </div>

              {/* Form Hosting Area - Guaranteed Spacing */}
              <div className="pb-16 px-8 sm:px-12">
                <div className="space-y-6">
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
