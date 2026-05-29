import Link from "next/link";

// Единый логотип Echo. При наведении из слова расходится эхо-пинг.
// href=null → не ссылка (просто заголовок), иначе ведёт по ссылке (по умолчанию на главную).
export function EchoLogo({
  href = "/",
  className = "",
}: {
  href?: string | null;
  className?: string;
}) {
  const inner = (
    <span className="echo-logo">
      <span aria-hidden className="echo-logo-ghost echo-logo-ghost-1 text-gradient-echo">echo</span>
      <span aria-hidden className="echo-logo-ghost echo-logo-ghost-2 text-gradient-echo">echo</span>
      <span className="relative text-gradient-echo">echo</span>
    </span>
  );

  const cls = `inline-block font-bold lowercase tracking-tighter ${className}`;

  if (href === null) {
    return <span className={cls}>{inner}</span>;
  }
  return (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}
