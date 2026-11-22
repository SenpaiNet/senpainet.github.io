"use client";

import { useEffect, useState } from "react";
import { reload, sendEmailVerification } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { MailCheck } from "lucide-react";
import { Gate, Loading, useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/Button";
import { OnboardingForm } from "@/components/OnboardingForm";
import { PageBody, PageHeading } from "@/components/ui";
import { fb } from "@/lib/firebase/client";
import { currentSchoolYear } from "@/lib/profile";
import { useCategories } from "@/lib/qa/categories";
import { siteUrl } from "@/lib/config";

function VerifyNotice() {
  const { user } = useAuth();
  const [state, setState] = useState<"idle" | "sent" | "checking">("idle");
  return (
    <div role="status" className="flex flex-col gap-4 rounded-lg bg-surface p-6 shadow-card md:p-10">
      <span className="flex h-11 w-11 items-center justify-center rounded-pill bg-brand-soft text-brand-deep">
        <MailCheck size={22} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <h2 className="text-h3">メールアドレスの確認がまだです</h2>
      <p>
        {user?.email} あてに送った確認メールのリンクを開いてから、「確認できた」を押してください。届かないときは、迷惑メールフォルダも見てください。
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={state === "checking"}
          onClick={async () => {
            if (!user) return;
            setState("checking");
            await reload(user);
            if (user.emailVerified) await user.getIdToken(true); // 確認済みの証明書に取り直す
            window.location.reload();
          }}
        >
          確認できた
        </Button>
        <Button
          variant="soft"
          disabled={state === "sent"}
          onClick={async () => {
            if (!user) return;
            await sendEmailVerification(user, { url: `${siteUrl}/onboarding` }).catch(() => {});
            setState("sent");
          }}
        >
          {state === "sent" ? "確認メールを送りました" : "確認メールをもう一度送る"}
        </Button>
      </div>
    </div>
  );
}

function Inner({ next }: { next: string }) {
  const { user, profile, needsVerify } = useAuth();
  const categories = useCategories();
  const [privateUniv, setPrivateUniv] = useState<string | null | undefined>(undefined);
  // 開いたときの状態で見出しを決める（保存直後に「編集」へ切り替わらないように）
  const [wasComplete] = useState(Boolean(profile?.isProfileComplete));

  useEffect(() => {
    const f = fb();
    if (!f || !user) return;
    getDoc(doc(f.db, "profiles", user.uid, "private", "info"))
      .then((d) => setPrivateUniv((d.data()?.universityName as string | null) ?? null))
      .catch(() => setPrivateUniv(null));
  }, [user]);

  if (!user) return null;
  const editing = wasComplete;
  const graduated = profile?.role === "alumni" && !profile.isProfileComplete && profile.graduationYear !== null;

  return (
    <PageBody>
      <PageHeading
        label={editing ? "プロフィール編集" : "プロフィール作成"}
        en="Profile"
        title={graduated ? "卒業おめでとうございます。進路を教えてください" : editing ? "プロフィールを変更できます" : "あなたのことを教えてください"}
        lead={editing ? "変更した内容は、すぐほかの人にも表示されます。" : "プロフィールを作ると、相談の投稿と回答ができるようになります。あとから変更できます。"}
      />
      {needsVerify ? (
        <VerifyNotice />
      ) : privateUniv === undefined ? (
        <Loading />
      ) : (
        <OnboardingForm
          uid={user.uid}
          email={user.email ?? ""}
          profile={profile}
          privateUniversityName={privateUniv}
          categories={categories}
          schoolYear={currentSchoolYear()}
          next={next}
        />
      )}
    </PageBody>
  );
}

export function OnboardingClient({ next }: { next: string }) {
  return (
    <Gate next="/onboarding">
      <Inner next={next} />
    </Gate>
  );
}
