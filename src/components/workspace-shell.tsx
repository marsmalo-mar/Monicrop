"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sprout,
  MessagesSquare,
  UsersRound,
  UserRound,
  LogOut,
} from "lucide-react";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import { ErrorNotice, request } from "./form-controls";
import { displayName, homeFor, type User } from "@/lib/types";
export function WorkspaceShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [failedProfilePicture, setFailedProfilePicture] = useState<string | null>(
    null,
  );
  const links =
    user.user_type === "admin"
      ? [{ href: "/accounts", label: "Accounts", icon: UsersRound }]
      : user.user_type === "consultant"
        ? [
            {
              href: "/consultations",
              label: "Consultation inbox",
              icon: MessagesSquare,
            },
          ]
        : [
            { href: "/crops", label: "My crops", icon: Sprout },
            {
              href: "/consultations",
              label: "Consultations",
              icon: MessagesSquare,
            },
          ];
  links.push({ href: "/profile", label: "Profile", icon: UserRound });
  return (
    <div className="workspace">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:bg-background focus:p-3"
      >
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Main navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              href={href}
              key={href}
              className="nav-link"
              aria-current={path.startsWith(href) ? "page" : undefined}
            >
              <Icon className="size-[18px]" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p>Care for every growing season.</p>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await request("/api/auth/logout", "POST");
                router.replace("/login");
                router.refresh();
              } catch (error) {
                setError(error instanceof Error ? error.message : "Try again.");
                setPending(false);
              }
            }}
          >
            <LogOut data-icon="inline-start" />
            {pending ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </aside>
      <main id="main-content" className="main-area">
        <header className="workspace-top">
          <Link
            className="text-muted-foreground"
            href={homeFor(user.user_type)}
          >
            Farm management workspace
          </Link>
          <Link
            href="/profile"
            className="identity"
            aria-label="View your profile"
          >
            <span className="initial">
              {user.profile_pic && failedProfilePicture !== user.profile_pic ? (
                <Image
                  key={user.profile_pic}
                  src={`/api/media?path=${encodeURIComponent(user.profile_pic)}`}
                  alt="Your profile photo"
                  width={36}
                  height={36}
                  unoptimized
                  className="size-9 rounded-full object-cover"
                  onError={() => setFailedProfilePicture(user.profile_pic)}
                  onLoad={() => setFailedProfilePicture(null)}
                />
              ) : (
                displayName(user).charAt(0).toUpperCase()
              )}
            </span>
            <span className="hidden sm:block">{displayName(user)}</span>
          </Link>
        </header>
        <ErrorNotice error={error} />
        {children}
      </main>
    </div>
  );
}
