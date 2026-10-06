import type { NavGroup } from "@/components/Shell";

export const adminNav: NavGroup[] = [
  {
    label: "Manage",
    items: [
      { href: "/admin", label: "Overview", icon: "dashboard", exact: true },
      { href: "/admin/assessments", label: "Assessments", icon: "assessments" },
      { href: "/admin/users", label: "Users", icon: "users" },
    ],
  },
  { label: "Shortcuts", items: [{ href: "/dashboard", label: "Participant view", icon: "eye" }] },
];

export const userNav: NavGroup[] = [
  {
    label: "Learning",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard", exact: true },
      { href: "/assessments", label: "Assessments", icon: "quiz" },
      { href: "/history", label: "My Results", icon: "history" },
    ],
  },
  { label: "Account", items: [{ href: "/profile", label: "Profile", icon: "profile" }] },
];
