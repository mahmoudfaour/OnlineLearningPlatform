// File: src/layouts/AuthLayout.jsx
export default function AuthLayout({
  children,
  type = "login",
  backgroundUrl = "/images/auth-bg.jpg", // put image in /public/images/auth-bg.jpg
}) {
  return (
    <div
      className={`hold-transition ${type}-page`}
      style={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background image */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url('${backgroundUrl}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(1px)",
          transform: "scale(1.03)",
          opacity: 0.22, // ✅ low opacity
          zIndex: 0,
        }}
      />

      {/* Soft overlay for readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(120deg, rgba(0,0,0,0.55), rgba(0,0,0,0.25))",
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
    </div>
  );
}
