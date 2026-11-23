"use client";

// URL のクエリ（?id= や ?tab=）を読んで各画面に渡す。
// 静的な書き出し（GitHub Pages）ではサーバーでクエリを読めないため、ブラウザ側で読む。
import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Loading } from "@/components/AuthProvider";
import { AuthForm } from "@/components/AuthForm";
import { AdminClient } from "./AdminClient";
import { BoardClient } from "./BoardClient";
import { MypageClient } from "./MypageClient";
import { NewQuestionClient } from "./NewQuestionClient";
import { OnboardingClient } from "./OnboardingClient";
import { ProfileClient } from "./ProfileClient";
import { QuestionClient } from "./QuestionClient";
import { safeNext } from "@/lib/config";

function WithParams({ render }: { render: (p: URLSearchParams) => ReactNode }) {
  const p = useSearchParams();
  return <>{render(p)}</>;
}

function Route({ render }: { render: (p: URLSearchParams) => ReactNode }) {
  return (
    <Suspense fallback={<Loading />}>
      <WithParams render={render} />
    </Suspense>
  );
}

const get = (p: URLSearchParams, k: string) => p.get(k) ?? undefined;

export const BoardRoute = () => (
  <Route
    render={(p) => (
      <BoardClient params={{ scope: get(p, "scope"), category: get(p, "category"), sort: get(p, "sort"), unanswered: get(p, "unanswered"), q: get(p, "q") }} />
    )}
  />
);

export const QuestionRoute = () => (
  <Route render={(p) => <QuestionClient key={get(p, "id")} id={get(p, "id") ?? ""} />} />
);

export const ProfileRoute = () => (
  <Route render={(p) => <ProfileClient key={get(p, "id")} id={get(p, "id") ?? ""} />} />
);

export const NewQuestionRoute = () => (
  <Route render={(p) => <NewQuestionClient category={get(p, "category")} scope={get(p, "scope") === "school" ? "school" : "national"} />} />
);

export const MypageRoute = () => <Route render={(p) => <MypageClient tab={get(p, "tab")} />} />;

export const AdminRoute = () => <Route render={(p) => <AdminClient tab={get(p, "tab")} />} />;

export const OnboardingRoute = () => (
  <Route render={(p) => <OnboardingClient next={safeNext(get(p, "next"), "/board")} />} />
);

export const AuthFormRoute = ({ mode }: { mode: "login" | "signup" }) => (
  <Route render={(p) => <AuthForm mode={mode} next={get(p, "next")} />} />
);
