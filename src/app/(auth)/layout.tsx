export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-pf-bg px-4 py-12">
      {children}
    </div>
  )
}
