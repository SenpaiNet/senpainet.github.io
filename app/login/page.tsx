import { AuthFormRoute } from "@/components/pages/routes";
import { messages } from "@/lib/messages";

export const metadata = { title: "ログイン | SenpaiNet" };

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-page px-6 py-12 md:px-12">
      <div className="mx-auto max-w-[440px] rounded-md bg-surface p-6 shadow-card">
        <p className="text-eyebrow text-brand">Login</p>
        <h1 className="mt-2 text-h2">{messages.auth.loginTitle}</h1>
        <p className="mb-8 mt-3">{messages.auth.loginLead}</p>
        <AuthFormRoute mode="login" />
      </div>
    </section>
  );
}
