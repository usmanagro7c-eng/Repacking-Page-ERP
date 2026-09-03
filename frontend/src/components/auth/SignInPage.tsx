import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import { Lock, User, Eye, EyeOff, AlertCircle, Loader2, Building2 } from "lucide-react";

export function SignInPage() {
  const { loginWithPassword, savedUsername } = useAuth();

  const [username, setUsername] = useState(savedUsername || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, [savedUsername]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim()) {
      setErrorMessage("برائے مہربانی صارف کا نام یا ای میل درج کریں۔ (Username/Email is required)");
      return;
    }
    if (!password) {
      setErrorMessage("برائے مہربانی پاس ورڈ درج کریں۔ (Password is required)");
      return;
    }

    setIsSubmitting(true);
    const res = await loginWithPassword(username.trim(), password);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || "صارف کا نام یا پاس ورڈ درست نہیں ہے۔ (Invalid credentials)");
    }
  };

  return (
    <div
      dir="rtl"
      className="relative min-h-screen flex items-center justify-center bg-radial from-slate-900 via-slate-950 to-black px-4 py-8 text-slate-100 selection:bg-emerald-500 selection:text-white"
    >
      {/* Background Soft Ambient Glow */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-emerald-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-emerald-600/10 blur-3xl" />

      {/* Login Box */}
      <div className="relative w-full max-w-[420px]">
        {/* Company Header */}
        <div className="mb-5 text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-slate-800/80 to-slate-900 border border-emerald-500/30 shadow-lg shadow-emerald-950/40 mb-3">
            <Building2 className="h-8 w-8 text-emerald-400" />
          </div>

          <h1 className="text-2xl font-extrabold font-urdu tracking-tight text-white sm:text-3xl">
            مرزا محمد مشتاق اینڈ کمپنی
          </h1>
          <p className="text-xs text-slate-400 font-urdu mt-1">
            ای آر پی پورٹل لاگ اِن (ERP Portal Login)
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-500/50 bg-rose-500/10 p-3 text-rose-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 font-urdu leading-relaxed">
                <p className="font-bold text-rose-200">لاگ اِن میں رکاوٹ:</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Form with strictly 2 fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Field 1: Username / Email */}
            <div>
              <label className="block text-xs font-urdu font-medium text-slate-300 mb-1.5">
                صارف کا نام یا ای میل <span className="font-sans text-[11px] text-slate-400">(Username / Email)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  dir="ltr"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username or Email"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 pr-10 pl-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all text-left"
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Field 2: Password */}
            <div>
              <label className="block text-xs font-urdu font-medium text-slate-300 mb-1.5">
                پاس ورڈ <span className="font-sans text-[11px] text-slate-400">(Password)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 pr-10 pl-10 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all text-left"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  title={showPassword ? "پاس ورڈ چھپائیں" : "پاس ورڈ دیکھیں"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 py-3 px-4 font-urdu font-bold text-white text-[15px] shadow-lg shadow-emerald-950/50 hover:shadow-emerald-950/70 active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    <span>لاگ اِن ہو رہا ہے...</span>
                  </>
                ) : (
                  <span>لاگ اِن کریں (Sign In)</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-4 text-center text-[11px] font-urdu text-slate-500">
          مرزا محمد مشتاق اینڈ کمپنی فیصل آباد
        </p>
      </div>
    </div>
  );
}
