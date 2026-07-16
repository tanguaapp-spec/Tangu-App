export function MotivoGomo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M100 10 C 130 10, 190 70, 190 100 C 190 130, 130 190, 100 190 C 100 190, 100 100, 100 10 Z"
        fill="currentColor"
        opacity="0.12"
      />
      <path
        d="M100 10 C 70 10, 10 70, 10 100 C 10 130, 70 190, 100 190 C 100 190, 100 100, 100 10 Z"
        fill="currentColor"
        opacity="0.06"
      />
      {[...Array(7)].map((_, i) => (
        <line
          key={i}
          x1="100"
          y1="100"
          x2={100 + 90 * Math.cos((i * Math.PI) / 7 - Math.PI / 2)}
          y2={100 + 90 * Math.sin((i * Math.PI) / 7 - Math.PI / 2)}
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.15"
        />
      ))}
    </svg>
  )
}
