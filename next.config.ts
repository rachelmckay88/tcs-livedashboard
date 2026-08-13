import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The floating dev badge sits on top of the board's bottom-left corner and
  // looks like part of the design when the display is running locally on the
  // warehouse TV. Nothing is lost by turning it off.
  devIndicators: false,
};

export default nextConfig;
