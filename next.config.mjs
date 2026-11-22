/** @type {import('next').NextConfig} */
const nextConfig = {
  // GitHub Pages で公開するため、静的なファイルとして書き出す（npm run build → out/）
  output: "export",
  // /board/ → /board/index.html の形で書き出す（GitHub Pages で確実に開けるように）
  trailingSlash: true,
  images: { unoptimized: true },
};
export default nextConfig;
