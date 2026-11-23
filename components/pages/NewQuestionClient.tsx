"use client";

import { Gate, useAuth } from "@/components/AuthProvider";
import { NewQuestionForm } from "@/components/NewQuestionForm";
import { PageBody, PageHeading } from "@/components/ui";
import { attrLabel } from "@/lib/profile";
import { useCategories } from "@/lib/qa/categories";

function Inner({ category, scope }: { category?: string; scope: "national" | "school" }) {
  const { user, profile } = useAuth();
  const categories = useCategories();
  if (!user || !profile) return null;
  const a = attrLabel({
    role: profile.role,
    entry_year: profile.entryYear,
    graduation_year: profile.graduationYear,
    stream: profile.stream,
    club_type: profile.clubType,
    university_year: profile.universityYear,
    school_kind: profile.schoolKind ?? null,
  });
  const initial = categories.some((c) => c.slug === category) && category ? [category] : [];
  return (
    <PageBody>
      <PageHeading label="相談を投稿する" en="Ask" title="悩みを書いて、先輩たちに聞いてみよう" />
      {profile.isSuspended ? (
        <p role="alert" className="rounded-md bg-brand-soft p-4">運営の判断により、いまは投稿できません。お問い合わせからご連絡ください。</p>
      ) : (
        <NewQuestionForm
          key={initial.join()}
          userId={user.uid}
          profile={profile}
          categories={categories}
          initialCategoryIds={initial}
          attrText={[a.role, a.meta].filter(Boolean).join("・")}
          initialScope={scope}
        />
      )}
    </PageBody>
  );
}

export function NewQuestionClient({ category, scope = "national" }: { category?: string; scope?: "national" | "school" }) {
  const next = category ? `/board/new?category=${encodeURIComponent(category)}` : "/board/new";
  return (
    <Gate member next={next}>
      <Inner category={category} scope={scope} />
    </Gate>
  );
}
