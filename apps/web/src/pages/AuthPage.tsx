import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart, Box, Check, Images, IndianRupee, LayoutDashboard, QrCode, ShieldCheck } from "lucide-react";
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const RESEND_COOLDOWN_SECONDS = 30;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown > 0]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem('partnerRef', ref);
    }
    
    if (location.pathname.includes("sign-in")) setActiveMode("sign-in");
    else setActiveMode("sign-up");
  }, [location.search, location.pathname]);

  // Capture a partner referral code from ?ref= (e.g. /sign-up?ref=<partnerId>) so it
  // survives email verification and can be attached at /onboarding's /register call.
  useEffect(() => {
    const ref = new URLSearchParams(location.search).get("ref");
    if (ref) localStorage.setItem("referralPartnerId", ref);
  }, [location.search]);

  const toggleMode = (m: "sign-in" | "sign-up") => {
    setActiveMode(m);
    setFormError(null);
    setFormSuccess(null);
    setIsRedirecting(false);
    setNeedsVerification(false);
    setResendSuccess(false);
    setResendCooldown(0);
    setOtp("");
    setEmail("");
    setPassword("");
    setName("");
    setAcceptedTerms(false);
    navigate(m === "sign-in" ? "/sign-in" : "/sign-up");
  };

  async function redirectPostAuth() {
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

  /** Sign-up requires accepting the policies — blocks both email and Google. */
  function consentMissing(): boolean {
    if (activeMode === "sign-up" && !acceptedTerms) {
      setFormError("Please accept the Privacy Policy and Terms & Conditions to continue.");
      return true;
    }
    return false;
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (consentMissing()) return;

    setFormLoading(true);
    setFormSuccess(null);
    setIsRedirecting(false);

    try {
      if (activeMode === "sign-up") {
        const { error } = await authClient.signUp.email({ email, password, name });
        if (error) {
          if (error.code === 'USER_ALREADY_EXISTS' || error.message?.toLowerCase().includes('already exists') || error.message?.toLowerCase().includes('exists')) {
            throw new Error("Email already registered. Please sign in instead.");
          }
          throw new Error(error.message ?? "Sign up failed");
        }
        setNeedsVerification(true);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        setFormLoading(false);
      } else {
        const { error } = await signIn.email({ email, password });
        if (error) {
          if (error.code === "EMAIL_NOT_VERIFIED") {
            setNeedsVerification(true);
            setResendCooldown(RESEND_COOLDOWN_SECONDS);
            setFormLoading(false);
            await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
            return;
          }
          if (error.code === "INVALID_EMAIL_OR_PASSWORD" || error.message?.toLowerCase().includes('invalid email or password')) {
            throw new Error("Account not found or incorrect password. Please register first if you don't have an account.");
          }
          throw new Error(error.message ?? "Invalid email or password");
        }
        setFormSuccess("Signed in successfully! Redirecting…");
        setIsRedirecting(true);
        await redirectPostAuth();
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Authentication failed");
      setFormLoading(false);
      setIsRedirecting(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setVerifyLoading(true);
    setFormError(null);
    try {
      const { error } = await authClient.emailOtp.verifyEmail({ email, otp });
      if (error) throw new Error(error.message ?? "Invalid or expired code");
      
      // After verification, we must explicitly sign the user in
      const signInResult = await signIn.email({ email, password });
      if (signInResult.error) throw new Error(signInResult.error.message ?? "Sign in failed after verification");

      setFormSuccess("Email verified! Redirecting…");
      setIsRedirecting(true);
      await redirectPostAuth();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Invalid or expired code");
      setVerifyLoading(false);
    }
  }

  async function handleResendVerification() {
    if (resendCooldown > 0) return;
    setResendLoading(true);
    setFormError(null);
    setResendSuccess(false);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
      if (error) throw new Error(error.message ?? "Could not resend verification code");
      setResendSuccess(true);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not resend verification code");
    } finally {
      setResendLoading(false);
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

      setFormSuccess("Signed in with Google! Redirecting…");
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
    if (consentMissing()) return;
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

  const FIELD =
    "h-[46px] w-full rounded-btn border border-dd-line bg-white px-4 text-[14px] text-dd-ink " +
    "placeholder:text-[#9AA5B4] transition-colors focus:border-dd-orange focus:outline-none " +
    "focus:ring-2 focus:ring-dd-orange/15 disabled:opacity-60";

  return (
    <div className="min-h-screen bg-dd-soft font-poppins text-dd-ink">
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-5">
        <div className="grid w-full max-w-[1000px] overflow-hidden rounded-card border border-dd-line bg-white shadow-card lg:grid-cols-[minmax(0,42%)_minmax(0,58%)]">

          {/* ── Brand panel ─────────────────────────────────────────────── */}
          <div className="relative hidden flex-col justify-between bg-dd-navy p-10 lg:flex lg:p-12">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }}
            />

            <Link to="/" className="relative flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-white">
                <img src="/dishdekho-icon.png" alt="" className="h-full w-full object-contain p-1" />
              </span>
              <span className="text-[13px] font-bold tracking-[0.2em] text-white/85">DISHDEKHO</span>
            </Link>

            <div className="relative mt-12 space-y-6">
              <h2 className="text-[30px] font-bold leading-[1.15] text-white">
                {isSignUp ? (
                  <>Experience food in <span className="text-dd-orange">augmented reality</span></>
                ) : (
                  <>Good to see you <span className="text-dd-orange">again!</span></>
                )}
              </h2>
              <p className="max-w-[300px] text-[14px] leading-[1.85] text-white/55">
                {isSignUp
                  ? "Create your account and turn your menu into an AR experience your guests will remember."
                  : "Sign in to manage your digital AR menu and see how guests are interacting with it."}
              </p>

              <ul className="space-y-5 pt-2">
                {(isSignUp
                  ? [
                      { Icon: Box, title: "3D Dish Previews", desc: "Guests see the dish on their table before ordering." },
                      { Icon: QrCode, title: "App-Free Access", desc: "Just scan a QR code — nothing to download." },
                      { Icon: IndianRupee, title: "One Simple Price", desc: "₹999/month — no setup fee, cancel anytime." },
                    ]
                  : [
                      { Icon: LayoutDashboard, title: "Live Menu Control", desc: "Update dishes, prices and photos anytime." },
                      { Icon: BarChart, title: "Scan Insights", desc: "See how many guests scanned and viewed your menu." },
                      { Icon: Images, title: "Manage Dish Photos", desc: "Upload photos and we build the 3D models." },
                    ]
                ).map(({ Icon, title, desc }) => (
                  <li key={title} className="flex items-start gap-4">
                    <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-white/10">
                      <Icon className="h-[18px] w-[18px] text-dd-orange" strokeWidth={1.8} />
                    </span>
                    <div>
                      <p className="text-[13.5px] font-bold text-white">{title}</p>
                      <p className="mt-1 text-[12px] leading-snug text-white/45">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <p className="relative mt-12 text-[11px] font-semibold uppercase tracking-widest text-white/25">
              © {new Date().getFullYear()} DishDekho
            </p>
          </div>

          {/* ── Form panel ──────────────────────────────────────────────── */}
          <div className="flex flex-col justify-center p-6 sm:p-8 lg:px-10 lg:py-8 relative">
            <Link to="/" className="absolute top-4 right-4 sm:top-6 sm:right-6 lg:top-8 lg:right-8 flex items-center gap-1.5 text-[12px] font-semibold text-dd-muted hover:text-dd-navy transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Link>

            {/* Brand panel is hidden below md — repeat the mark here */}
            <Link to="/" className="mb-6 flex items-center gap-3 lg:hidden mt-4 sm:mt-0">
              <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-dd-soft">
                <img src="/dishdekho-icon.png" alt="" className="h-full w-full object-contain p-1" />
              </span>
              <span className="text-[13px] font-bold tracking-[0.2em] text-dd-navy">DISHDEKHO</span>
            </Link>

            {/* Mode switch */}
            <h1 className="text-[23px] font-bold tracking-tight text-dd-navy sm:text-[25px]">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h1>
            <p className="mt-1.5 text-[13.5px] text-dd-muted">
              {isSignUp ? "Start your AR menu in a few minutes." : "Sign in to your restaurant dashboard."}
            </p>

            {needsVerification ? (
              <div className="mt-7 rounded-card border border-dd-orange/25 bg-dd-orange-lt/60 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[14.5px] font-bold text-dd-navy">Verify your email</p>
                  <button
                    type="button"
                    onClick={() => {
                      setNeedsVerification(false);
                      setOtp("");
                    }}
                    disabled={verifyLoading || isRedirecting}
                    className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-dd-muted hover:text-dd-navy disabled:opacity-50 transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3" strokeWidth={2.5} />
                    Back
                  </button>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-dd-muted">
                  We sent a 6-digit code to <span className="font-semibold text-dd-navy">{email}</span>. Enter it below to activate your account.
                </p>
                <form onSubmit={handleVerifyOtp} className="mt-4 flex flex-col gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    disabled={verifyLoading || isRedirecting}
                    className="h-14 rounded-btn border border-dd-line bg-white text-center text-[20px] font-bold tracking-[0.4em] text-dd-navy placeholder:text-[#C7CFD9] focus:border-dd-orange focus:outline-none focus:ring-2 focus:ring-dd-orange/15 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={verifyLoading || isRedirecting || otp.length !== 6}
                    className="h-12 rounded-btn bg-dd-orange text-[14px] font-semibold text-white transition-colors hover:bg-dd-orange-dk disabled:opacity-50"
                  >
                    {verifyLoading ? "Verifying…" : "Verify Email"}
                  </button>
                </form>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendLoading || resendCooldown > 0}
                    className="text-[13px] font-bold text-dd-orange hover:underline disabled:opacity-50 disabled:hover:no-underline"
                  >
                    {resendLoading
                      ? "Resending…"
                      : resendCooldown > 0
                        ? `Resend code in ${resendCooldown}s`
                        : "Resend code"}
                  </button>
                  {resendSuccess && resendCooldown > 0 && (
                    <p className="mt-1 text-[12px] font-bold text-[#1F9254]">Code resent — check your inbox.</p>
                  )}
                </div>
                {formError && <p className="mt-3 text-[13px] font-medium text-[#D93025]">{formError}</p>}
              </div>
            ) : (
              <>
                {formSuccess && (
                  <div className="mt-6 flex items-center gap-3 rounded-btn border border-[#1F9254]/25 bg-[#1F9254]/10 px-4 py-3">
                    <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-[#1F9254]">
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </span>
                    <span className="text-[13px] font-semibold text-[#1F9254]">{formSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleEmailSubmit} className="mt-5 flex flex-col gap-3">
                  {isSignUp && (
                    <div className="flex flex-col gap-1">
                      <label htmlFor="auth-name" className="text-[11.5px] font-semibold text-dd-navy">Full Name</label>
                      <input
                        id="auth-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Smith"
                        disabled={isDisabled}
                        className={FIELD}
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <label htmlFor="auth-email" className="text-[11.5px] font-semibold text-dd-navy">Email</label>
                    <input
                      id="auth-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@restaurant.com"
                      disabled={isDisabled}
                      className={FIELD}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="auth-password" className="text-[11.5px] font-semibold text-dd-navy">Password</label>
                    <input
                      id="auth-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={isDisabled}
                      className={FIELD}
                    />
                  </div>

                  {/* Policy consent — required before an account can be created */}
                  {isSignUp && (
                    <label className="flex cursor-pointer items-start gap-3 rounded-btn border border-dd-line bg-dd-soft/60 px-3.5 py-2.5">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => {
                          setAcceptedTerms(e.target.checked);
                          if (e.target.checked) setFormError(null);
                        }}
                        disabled={isDisabled}
                        className="mt-0.5 h-[17px] w-[17px] flex-none cursor-pointer accent-dd-orange"
                      />
                      <span className="text-[12px] leading-relaxed text-dd-muted">
                        I have read and agree to the{" "}
                        <Link to="/privacy" target="_blank" className="font-semibold text-dd-orange hover:underline">
                          Privacy Policy
                        </Link>{" "}
                        and{" "}
                        <Link to="/terms" target="_blank" className="font-semibold text-dd-orange hover:underline">
                          Terms &amp; Conditions
                        </Link>
                        .
                      </span>
                    </label>
                  )}

                  {formError && (
                    <div className="flex items-start gap-3 rounded-btn border border-[#D93025]/20 bg-[#D93025]/[0.07] px-4 py-3">
                      <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-[#D93025]" strokeWidth={2} />
                      <span className="text-[13px] font-medium text-[#D93025]">{formError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isDisabled}
                    className="mt-1 flex h-[48px] items-center justify-center gap-2 rounded-btn bg-dd-orange text-[14.5px] font-semibold text-white shadow-btn transition-all hover:bg-dd-orange-dk disabled:opacity-70"
                  >
                    {formLoading && !formSuccess ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        {isSignUp ? "Creating account…" : "Signing in…"}
                      </>
                    ) : (
                      <span>{isSignUp ? "Create Account" : "Sign In"}</span>
                    )}
                  </button>
                </form>

                <div className="my-4 flex items-center gap-4">
                  <span className="h-px flex-1 bg-dd-line" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-dd-muted">or</span>
                  <span className="h-px flex-1 bg-dd-line" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={isDisabled}
                  className="flex h-[46px] w-full items-center justify-center gap-3 rounded-btn border border-dd-line bg-white text-[14px] font-semibold text-dd-navy transition-colors hover:border-dd-orange hover:bg-dd-soft disabled:opacity-50"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>

                <p className="mt-5 text-center text-[13px] text-dd-muted">
                  {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => toggleMode(isSignUp ? 'sign-in' : 'sign-up')}
                    className="font-semibold text-dd-orange hover:underline"
                  >
                    {isSignUp ? "Please sign in" : "Sign up"}
                  </button>
                </p>
              </>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-medium text-dd-muted">
              <Link to="/" className="hover:text-dd-orange">Home</Link>
              <Link to="/privacy" className="hover:text-dd-orange">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-dd-orange">Terms &amp; Conditions</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
