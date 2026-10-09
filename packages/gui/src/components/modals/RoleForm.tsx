import { Field } from '../atoms/index.ts'
import type { RoleFormProps } from './types.ts'

export function RoleForm({ v, setV, thinkSvcs, voiceSvcs }: RoleFormProps) {
  return (
    <>
      <Field row label="角色名称" required>
        <input
          value={v.name || ''}
          placeholder="例如：深夜电台 DJ"
          onChange={(e) => setV({ ...v, name: e.target.value })}
        />
      </Field>
      <Field label="人设描述">
        <textarea
          style={{
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-m)',
            padding: '8px 12px',
            font: 'inherit',
            minHeight: 76,
          }}
          value={v.profile || ''}
          placeholder="你是谁、怎么说话、回答风格"
          onChange={(e) => setV({ ...v, profile: e.target.value })}
        />
      </Field>
      <Field label="思考服务" tip="按优先级排列，限额已达时自动切换下一个">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            alignItems: 'center',
          }}
        >
          {((v.thinkServiceIds as unknown as string[]) || []).map((sid, i) => {
            const svc = (thinkSvcs || []).find((s: any) => s.id === sid)
            return (
              <span
                key={sid}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: '#e5e7eb',
                  fontSize: 13,
                }}
              >
                {svc?.name || sid}
                {svc?.limitReached && (
                  <span style={{ color: '#ef4444', fontSize: 11 }}>限额</span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const next = (
                      (v.thinkServiceIds as unknown as string[]) || []
                    ).filter((_, j) => j !== i)
                    setV({ ...v, thinkServiceIds: next as any })
                  }}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: 14,
                  }}
                >
                  x
                </button>
              </span>
            )
          })}
          <select
            value=""
            onChange={(e) => {
              if (!e.target.value) return
              const next = [
                ...((v.thinkServiceIds as unknown as string[]) || []),
                e.target.value,
              ]
              setV({ ...v, thinkServiceIds: next as any })
            }}
          >
            <option value="">+ 添加</option>
            {(thinkSvcs || [])
              .filter(
                (s: any) =>
                  !((v.thinkServiceIds as unknown as string[]) || []).includes(
                    s.id,
                  ),
              )
              .map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </div>
      </Field>
      <Field row label="语音服务">
        <select
          value={v.voiceId || ''}
          onChange={(e) => setV({ ...v, voiceId: e.target.value })}
        >
          <option value="">（全局默认）</option>
          {(voiceSvcs || []).map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.isDefault ? ' · 默认' : ''}
            </option>
          ))}
        </select>
      </Field>
    </>
  )
}
