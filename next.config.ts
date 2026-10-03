import type { NextConfig } from "next";
const config: NextConfig = {
  reactCompiler: false,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      ["index.php", "/"],
      ["login.php", "/login"],
      ["register.php", "/register"],
      ["records.php", "/crops"],
      ["manage.php", "/accounts"],
      ["consultation.php", "/consultations"],
      ["profile.php", "/profile"],
      ["validation.php", "/profile"],
      ["edit_validation.php", "/profile"],
      ["edit_profile.php", "/profile"],
      ["edit_profile(2).php", "/profile"],
      ["add.php", "/crops/new"],
      ["create_acc.php", "/accounts/new"],
    ].map(([source, destination]) => ({
      source: `/${source.replace(/\(/g, "\\(").replace(/\)/g, "\\)")}`,
      destination,
      permanent: false,
    }));
  },
};
export default config;
