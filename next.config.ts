import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

// Wrap with Axiom logging if available
let config = nextConfig;
try {
  const { withAxiom } = require("next-axiom");
  config = withAxiom(nextConfig);
} catch {
  // next-axiom not installed — skip
}

// Wrap with Sentry if available
try {
  const { withSentryConfig } = require("@sentry/nextjs");
  config = withSentryConfig(config, {
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
  });
} catch {
  // @sentry/nextjs not installed — skip
}

export default config;
