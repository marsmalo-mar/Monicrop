export const demoPassword = "Demo-only-2026!";
export const demoAccounts = [
  {
    role: "client",
    email: "farmer@example.test",
    first: "Alex",
    last: "Farmer",
  },
  {
    role: "consultant",
    email: "consultant@example.test",
    first: "Sam",
    last: "Consultant",
  },
  {
    role: "admin",
    email: "admin@example.test",
    first: "Taylor",
    last: "Admin",
  },
];

export function assertDemoTarget(env) {
  if (
    env.DB_NAME !== "monicrop_demo" ||
    env.DB_HOST !== "127.0.0.1" ||
    env.APP_ORIGIN !== "http://127.0.0.1:3001"
  ) {
    throw new Error(
      "Demo commands require DB_NAME=monicrop_demo, DB_HOST=127.0.0.1, and APP_ORIGIN=http://127.0.0.1:3001. Your regular database was not modified.",
    );
  }
}
