interface Props {
  message: string
  className?: string
}

export default function ErrorMessage({ message, className = '' }: Props) {
  return (
    <div className={`font-code-sm text-code-sm text-error flex items-center gap-2 ${className}`}>
      <span className="material-symbols-outlined text-[14px]">error</span>
      <span>ERR: {message}</span>
    </div>
  )
}
