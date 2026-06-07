interface Props {
  text?: string
  className?: string
}

export default function TerminalLoader({ text = 'LOADING', className = '' }: Props) {
  return (
    <div className={`flex items-center gap-2 font-code-sm text-code-sm text-on-surface-variant ${className}`}>
      <span className="text-primary-container">[</span>
      <span className="animate-pulse">{text}...</span>
      <span className="block-cursor" />
      <span className="text-primary-container">]</span>
    </div>
  )
}
