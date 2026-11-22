import { ProfileRoute } from "@/components/pages/routes";

export const metadata = { title: "プロフィール | SenpaiNet", robots: { index: false, follow: false } };

export default function Page() {
  return <ProfileRoute />;
}
