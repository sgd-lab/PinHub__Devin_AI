// Login page intentionally renders without the app shell (no sidebar / topbar).
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
