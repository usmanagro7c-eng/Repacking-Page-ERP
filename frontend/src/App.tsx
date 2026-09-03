import { AuthProvider, useAuth } from "./context/AuthContext";
import { SignInPage } from "./components/auth/SignInPage";
import { MainPortalApp } from "./components/MainPortalApp";
import { Loader2 } from "lucide-react";

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white"
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-9 w-9 animate-spin text-emerald-500" />
          <p className="font-urdu text-sm text-slate-300">سسٹم اور سیشن کی توثیق ہو رہی ہے...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SignInPage />;
  }

  return <MainPortalApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
