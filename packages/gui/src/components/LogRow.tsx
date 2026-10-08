/* ══ LogRow ══ */
import { I } from '../icons.tsx'
import { Tag } from './atoms/index.ts'

export function LogRow(props: {
  l: { time: string; kind: 'user' | 'ai' | 'system'; text: string }
  multi: boolean
  open: boolean
  devName: string
  kindLabel: string
  onToggle: (open: boolean) => void
}) {
  const { l, multi, open, devName, kindLabel, onToggle } = props
  return (
    <div
      className={
        'log' +
        (l.kind === 'user' ? ' q' : l.kind === 'ai' ? ' a' : '') +
        (multi ? ' expandable' : '') +
        (open ? ' open' : '')
      }
      onClick={multi ? () => onToggle(!open) : undefined}
      title={multi && !open ? '点击展开查看完整内容' : undefined}
    >
      <span className="t">{l.time || '--'}</span>
      <span className="who">
        <Tag tone="accent">{devName}</Tag>
        <em className={'k k-' + l.kind}>{kindLabel}</em>
      </span>
      <span className="txt">{l.text}</span>
      {multi && (
        <span className="more">
          <I n={open ? 'up' : 'down'} size={12} />
        </span>
      )}
    </div>
  )
}
