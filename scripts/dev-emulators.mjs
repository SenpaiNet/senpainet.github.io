// 本番ではなく手元の Firebase エミュレーターにつないで開発サーバーを起動する。
// 先に別のターミナルで：firebase emulators:start --only firestore,auth
import { spawn } from "node:child_process";

process.env.NEXT_PUBLIC_USE_EMULATORS = "1";
const port = process.env.PORT || "3001";
spawn("npx", ["next", "dev", "-p", port], { stdio: "inherit", shell: true, env: process.env });
