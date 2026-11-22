import { AdminRoute } from "@/components/pages/routes";

export const metadata = { title: "管理 | SenpaiNet", robots: { index: false, follow: false } };

export default function Page() {
  return <AdminRoute />;
}
