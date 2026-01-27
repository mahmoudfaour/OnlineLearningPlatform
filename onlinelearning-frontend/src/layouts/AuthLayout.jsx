export default function AuthLayout({ children, type = "login" }) {
  return (
    <div className={`hold-transition ${type}-page`}>
      {children}
    </div>
  );
}
