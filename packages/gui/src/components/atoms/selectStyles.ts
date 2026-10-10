/**
 * react-select 多值输入框统一样式：
 * 与表单内单值 input/select 视觉保持一致（边框 / 圆角 / 背景 / 字体继承），
 * 被「对话角色」关键词字段与「设备」思考服务多选共用。
 */
export const multiSelectStyles = {
  container: (base: Record<string, unknown>) => ({
    ...base,
    /* 对齐 .grp .fld 内原生 input 的收缩规则（flex:1 1 0 + min-width:0），
       否则固有最小宽度会触发 flex-wrap 换行（跨行） */
    flex: '1 1 0',
    minWidth: 0,
  }),
  control: (base: Record<string, unknown>) => ({
    ...base,
    minWidth: 0,
    minHeight: 36,
    border: '1px solid var(--line)',
    borderRadius: 'var(--r-m)',
    backgroundColor: 'var(--panel-2)',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    color: 'var(--ink-1)',
    boxShadow: 'none',
    cursor: 'text',
  }),
  valueContainer: (base: Record<string, unknown>) => ({
    ...base,
    padding: '3px 6px',
  }),
  placeholder: (base: Record<string, unknown>) => ({
    ...base,
    color: 'var(--ink-3)',
  }),
  input: (base: Record<string, unknown>) => ({
    ...base,
    color: 'var(--ink-1)',
    margin: 0,
    padding: 0,
  }),
  multiValue: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
  }),
  multiValueLabel: (base: Record<string, unknown>) => ({
    ...base,
    fontSize: 13,
    padding: '2px 6px',
  }),
  multiValueRemove: (base: Record<string, unknown>) => ({
    ...base,
    borderRadius: 10,
    ':hover': { backgroundColor: '#d1d5db' },
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    borderRadius: 'var(--r-m)',
    border: '1px solid var(--line)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
  }),
  option: (base: Record<string, unknown>) => ({
    ...base,
    fontSize: 13.5,
  }),
}
