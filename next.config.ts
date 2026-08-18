import type { NextConfig } from "next";

const repoName = process.env.NEXT_PUBLIC_REPO_NAME || "";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  basePath: repoName,
  assetPrefix: `${repoName}/`,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
