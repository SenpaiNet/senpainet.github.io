import type { Timestamp } from "firebase/firestore";
import type { ClubType, PathType, Stream } from "@/lib/profile";
import type { SchoolKind } from "@/lib/schools";

export type QaRole = "student" | "alumni";

/** profiles/{uid} */
export type QaProfile = {
  displayName: string;
  bio: string | null;
  role: QaRole;
  entryYear: number | null;
  graduationYear: number | null;
  stream: Stream | null;
  clubType: ClubType | null;
  clubName: string | null;
  pathType: PathType | null;
  /** 大学名を公開しない設定のときは null（本人用の値は profiles/{uid}/private/info） */
  universityName: string | null;
  universityNamePublic: boolean;
  faculty: string | null;
  universityYear: number | null;
  isAccepting: boolean;
  isPublic: boolean;
  isProfileComplete: boolean;
  isSuspended: boolean;
  categories: string[];
  /** 所属する学校（schools/{id}）。学校名と種類は表示用に写しを持つ */
  schoolId?: string | null;
  schoolName?: string | null;
  schoolKind?: SchoolKind | null;
  /** 相談・回答に学校名を出すか */
  schoolPublic?: boolean;
  lastPostAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

/** 相談・回答に添える投稿者の情報（匿名なら id と name は null） */
export type Author = {
  id: string | null;
  name: string | null;
  role: QaRole | "admin";
  entryYear: number | null;
  stream: Stream | null;
  clubType: ClubType | null;
  universityYear: number | null;
  schoolKind?: SchoolKind | null;
  /** 学校名（匿名・非公開なら null） */
  school?: string | null;
};

/** 公開範囲：全国（national）か、学内（school:学校ID） */
export type Audience = string;

/** questions/{qid} */
export type QaQuestion = {
  id: string;
  title: string;
  categories: string[];
  audience: Audience;
  isAnonymous: boolean;
  author: Author;
  targetStream: Stream | null;
  targetPathType: PathType | null;
  targetClubType: ClubType | null;
  answerCount: number;
  bestAnswerId: string | null;
  bestAnswerAuthorId: string | null;
  status: "open" | "resolved" | "hidden";
  visible: boolean;
  createdAt: Timestamp | null;
  firstAnswerAt?: Timestamp | null;
};

/** questions/{qid}/qaAnswers/{aid} */
export type QaAnswer = {
  id: string;
  questionId: string;
  body: string;
  audience: Audience;
  author: Author;
  helpfulCount: number;
  status: "visible" | "hidden";
  parentId: string | null;
  isAnonymous: boolean;
  createdAt: Timestamp | null;
};

export type QaNotification = {
  id: string;
  userId: string;
  type: "best_answer" | "system";
  questionId: string | null;
  answerId: string | null;
  message: string | null;
  isRead: boolean;
  createdAt: Timestamp | null;
};

export type QaReport = {
  id: string;
  reporterId: string;
  targetType: "question" | "answer";
  targetId: string;
  questionId: string;
  reason: string;
  detail: string | null;
  status: "pending" | "resolved" | "dismissed";
  createdAt: Timestamp | null;
};
