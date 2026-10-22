import StudioShell from "@/components/shell/StudioShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <StudioShell>{children}</StudioShell>;
}
