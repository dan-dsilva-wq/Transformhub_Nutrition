import { AppShell } from "@/components/pace/app-shell";
import { AuthGate } from "@/components/pace/auth-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
