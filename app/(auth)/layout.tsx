export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full grid place-items-center px-6 py-12">
      {children}
    </div>
  );
}
