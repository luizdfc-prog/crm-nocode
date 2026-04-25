import { AppShell } from "@/components/features/layout/AppShell"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
