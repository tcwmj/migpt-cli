import type { StylesConfig } from 'react-select'

/** 多值下拉的选项类型（与各调用点的 { value, label } 结构一致） */
export type MultiOption = { value: string; label: string }

/**
 * react-select 多值输入框统一样式。
 *
 * 目标：外观与表单内单值原生 `input` / `select` 完全一致——
 *   高度 / 内边距 / 边框 / 圆角 / 背景 / 字号 / 悬停与聚焦反馈 / 光标，
 * 使「模型」（多选）与「语音」（单选）并排时视觉统一；
 * 多值以主题色胶囊呈现，与 `.chip.on` / `.tag.accent` 同一色系。
 *
 * 被「设备」模型多选、向导「关联模型与语音」多选、角色关键词输入共用。
 */
export const multiSelectStyles: StylesConfig<MultiOption, true> = {
  container: (base) => ({
    ...base,
    /* 对齐 .grp .fld 内原生 input/select 的收缩规则（flex:1 1 0 + min-width:0），
       否则固有最小宽度会触发 flex-wrap 换行（跨行） */
    flex: '1 1 0',
    minWidth: 0,
  }),
  control: (base, state) => ({
    ...base,
    minWidth: 0,
    /* 与原生 select 同高：padding 8px×2 + line-height 1.6×14px + 边框 ≈ 40px */
    minHeight: 40,
    border: '1px solid ' + (state.isFocused ? 'var(--accent)' : 'var(--line)'),
    borderRadius: 'var(--r-m)',
    backgroundColor: 'var(--panel-2)',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    color: 'var(--ink-1)',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(217, 100, 42, 0.14)' : 'none',
    /* 原生 select 为指针型光标，多选同样按「可点击的下拉」处理 */
    cursor: 'pointer',
    transition:
      'border-color var(--dur-150) ease, box-shadow var(--dur-150) ease, background var(--dur-150) ease',
    ':hover': { borderColor: 'var(--accent)' },
  }),
  valueContainer: (base) => ({
    ...base,
    /* 左侧 10px + 胶囊自身内边距，视觉起点与原生 select 的 12px 对齐 */
    padding: '2px 10px',
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--ink-3)',
    margin: 0,
  }),
  input: (base) => ({
    ...base,
    color: 'var(--ink-1)',
    margin: 0,
    padding: 0,
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: 'var(--accent-soft)',
    borderRadius: 'var(--pill)',
    margin: '2px 4px 2px 0',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: 'var(--accent)',
    fontSize: 13,
    lineHeight: 1.4,
    padding: '1px 2px 1px 8px',
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: 'var(--accent)',
    borderRadius: 'var(--pill)',
    padding: '0 4px',
    ':hover': {
      backgroundColor: 'rgba(217, 100, 42, 0.2)',
      color: 'var(--accent)',
    },
  }),
  indicatorsContainer: (base) => ({
    ...base,
    paddingRight: 6,
  }),
  /* 与原生 select 的箭头同色、同交互反馈 */
  dropdownIndicator: (base) => ({
    ...base,
    color: 'var(--ink-3)',
    padding: '0 8px',
    transition: 'color var(--dur-150) ease',
    ':hover': { color: 'var(--accent)' },
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  clearIndicator: (base) => ({
    ...base,
    color: 'var(--ink-3)',
    padding: '0 6px',
    ':hover': { color: 'var(--accent)' },
  }),
  menu: (base) => ({
    ...base,
    marginTop: 4,
    borderRadius: 'var(--r-m)',
    border: '1px solid var(--line)',
    backgroundColor: 'var(--bg)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
  }),
  option: (base, state) => ({
    ...base,
    fontSize: 13.5,
    padding: '8px 12px',
    cursor: 'pointer',
    backgroundColor: state.isSelected
      ? 'var(--accent-soft)'
      : state.isFocused
        ? 'var(--accent-soft)'
        : 'transparent',
    color: state.isSelected ? 'var(--accent)' : 'var(--ink-1)',
    fontWeight: state.isSelected ? 600 : 400,
    ':active': { backgroundColor: 'var(--accent-soft)' },
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: 'var(--ink-3)',
    fontSize: 13.5,
  }),
}
