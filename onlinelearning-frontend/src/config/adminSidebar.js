export const adminSidebarItems = [
  {
    label: "Dashboard",
    icon: "fas fa-tachometer-alt",
    to: "/admin/dashboard",
  },
  {
    label: "Users",
    icon: "fas fa-users",
    to: "/admin/users",
  },
  {
    label: "Courses",
    icon: "fas fa-book",
    to: "/admin/courses",
  },

  
  // ✅ NEW (Full admin control)
  { label: "Lessons", to: "/admin/lessons", icon: "fas fa-chalkboard-teacher" },
  { label: "Quizzes & Bank", to: "/admin/quizzes", icon: "fas fa-question-circle" },
];
