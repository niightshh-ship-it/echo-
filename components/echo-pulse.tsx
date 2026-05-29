// Слово с постоянной эхо-пульсацией (как логотип на главной).
// Чистая разметка + CSS-анимация (.echo-ghost) — работает и в серверных, и в клиентских компонентах.
export function EchoPulse({
  text = "echo",
  className = "",
}: {
  text?: string;
  className?: string;
}) {
  return (
    <span className={`relative inline-block align-baseline ${className}`}>
      <span aria-hidden className="echo-ghost echo-ghost-1 absolute left-0 top-0 text-gradient-echo">{text}</span>
      <span aria-hidden className="echo-ghost echo-ghost-2 absolute left-0 top-0 text-gradient-echo">{text}</span>
      <span aria-hidden className="echo-ghost echo-ghost-3 absolute left-0 top-0 text-gradient-echo">{text}</span>
      <span className="relative text-gradient-echo">{text}</span>
    </span>
  );
}
