// Слово с эхо-пульсацией. Копии рисуются через CSS ::before/::after
// (см. .echo-pulse в globals.css), поэтому в DOM лежит только один экземпляр —
// и сканеры/SEO-боты видят чистый текст вроде "How Echo works".
export function EchoPulse({
  text = "echo",
  className = "",
}: {
  text?: string;
  className?: string;
}) {
  return (
    <span
      className={`echo-pulse text-gradient-echo ${className}`}
      data-text={text}
    >
      {text}
    </span>
  );
}
