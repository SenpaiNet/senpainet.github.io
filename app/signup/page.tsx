import { AuthFormRoute } from "@/components/pages/routes";
import { messages } from "@/lib/messages";

export const metadata = { title: "無料で登録する | SenpaiNet" };

export default function SignupPage() {
  return (
    <section className="mx-auto max-w-page px-6 py-12 md:px-12">
      <div className="mx-auto max-w-[440px] rounded-md bg-surface p-6 shadow-card">
        <p className="text-eyebrow text-brand">Sign up</p>
        <h1 className="mt-2 text-h2">{messages.auth.signupTitle}</h1>
        <p className="mb-8 mt-3">{messages.auth.signupLead}</p>
        <AuthFormRoute mode="signup" />
      </div>
    </section>
  );
}
