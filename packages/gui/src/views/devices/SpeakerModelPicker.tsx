import type { SpeakerModel } from '../../apis.ts'

/** 型号搜索选择器：输入框 + 下拉候选 + 选中型号的指令标签 */
export function SpeakerModelPicker(props: {
  speakerModels: SpeakerModel[]
  value: string
  open: boolean
  q: string
  onOpen: (open: boolean) => void
  onQ: (q: string) => void
  onPick: (id: string) => void
}) {
  const selected = props.speakerModels.find((x) => x.id === props.value) || null
  const query = props.q.trim().toLowerCase()
  const sorted = [...props.speakerModels]
    .sort((a, b) => {
      if (!!a.builtin !== !!b.builtin) return a.builtin ? -1 : 1
      if (a.builtin && b.builtin)
        return a.name.localeCompare(b.name, 'zh-Hans-CN')
      return (a.createdAt || 0) - (b.createdAt || 0)
    })
    .filter(
      (m) =>
        !query ||
        m.name.toLowerCase().includes(query) ||
        m.didPrefix.toLowerCase().includes(query) ||
        m.id.includes(query),
    )
  return (
    <>
      <div className="model-pick">
        <input
          value={
            props.open
              ? props.q
              : selected
                ? `${selected.name}（${selected.didPrefix}）`
                : ''
          }
          placeholder="输入关键字搜索型号…"
          onMouseDown={() => {
            if (!props.open) props.onOpen(true)
          }}
          onFocus={() => props.onOpen(true)}
          onBlur={() => setTimeout(() => props.onOpen(false), 150)}
          onChange={(e) => props.onQ(e.target.value)}
        />
        {props.open && (
          <div className="model-pick-list">
            {sorted.length ? (
              sorted.map((m) => (
                <div
                  key={m.id}
                  className={'pick-li' + (props.value === m.id ? ' on' : '')}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    props.onPick(m.id)
                    props.onOpen(false)
                    props.onQ('')
                  }}
                >
                  {m.imageUrl ? (
                    <img src={m.imageUrl} alt="" />
                  ) : (
                    <span className="ph" />
                  )}
                  <span>
                    {m.name}（{m.didPrefix}）
                  </span>
                </div>
              ))
            ) : (
              <div className="pick-empty">未找到匹配型号</div>
            )}
          </div>
        )}
      </div>
      {selected && (
        <div className="fld-tags">
          <span>
            <b>播放指令</b>
            {selected.ttsCommand?.length ? selected.ttsCommand.join('、') : '—'}
          </span>
          <span>
            <b>唤醒命令</b>
            {selected.wakeUpCommand?.length
              ? selected.wakeUpCommand.join('、')
              : '—'}
          </span>
          <span>
            <b>播放检测命令</b>
            {selected.playingCommand?.length
              ? selected.playingCommand.join('、')
              : '—'}
          </span>
          <span>
            <b>连续对话</b>
            {selected.continuousDialogue ? '已启用' : '未启用'}
          </span>
        </div>
      )}
    </>
  )
}
