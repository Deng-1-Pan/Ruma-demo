# Tailwind CSS 使用指南

本项目已集成 Tailwind CSS，并与现有的 CSS 变量系统完美结合。

## 🎨 色彩系统

### 使用现有设计系统的颜色
```jsx
// 主色调
<div className="bg-primary text-white">主要按钮</div>
<div className="bg-primary-light text-primary">浅色背景</div>

// 功能色彩
<div className="bg-success text-white">成功状态</div>
<div className="bg-warning text-white">警告状态</div>
<div className="bg-error text-white">错误状态</div>

// 文本颜色
<p className="text-primary">主要文本</p>
<p className="text-secondary">次要文本</p>
<p className="text-tertiary">辅助文本</p>

// 情绪色彩
<div className="bg-emotion-positive">积极情绪</div>
<div className="bg-emotion-negative">消极情绪</div>
```

## 📏 间距系统

```jsx
// 使用设计系统的间距
<div className="p-md m-lg">标准间距</div>
<div className="px-sm py-xs">小间距</div>
<div className="mx-xl">大间距</div>

// 组合使用
<div className="space-y-md">
  <div>项目 1</div>
  <div>项目 2</div>
  <div>项目 3</div>
</div>
```

## 🔤 字体大小

```jsx
<h1 className="text-2xl font-bold">主标题</h1>
<h2 className="text-xl font-semibold">二级标题</h2>
<p className="text-base">正文内容</p>
<small className="text-xs text-secondary">小字提示</small>
```

## 🌐 响应式设计

```jsx
// 响应式布局
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
  <div>卡片 1</div>
  <div>卡片 2</div>
  <div>卡片 3</div>
</div>

// 响应式隐藏
<div className="mobile-hidden">桌面端显示</div>
<div className="desktop-hidden">移动端显示</div>

// 自定义断点
<div className="hidden xs:block sm:hidden">只在xs屏幕显示</div>
```

## 💬 聊天界面专用

```jsx
// 消息气泡
<div className="message-bubble-user">用户消息</div>
<div className="message-bubble-assistant">AI助手消息</div>

// 侧边栏宽度
<div className="w-sidebar">侧边栏</div>

// 消息最大宽度
<div className="max-w-message">消息内容</div>
```

## 🎭 动画效果

```jsx
// 使用内置动画
<div className="animate-fade-in">淡入效果</div>
<div className="animate-slide-in">滑入效果</div>
<div className="animate-pulse">脉冲效果</div>

// 打字指示器动画
<div className="animate-typing-dot">打字动画</div>
```

## 📱 滚动条样式

```jsx
// 隐藏滚动条
<div className="scrollbar-hide overflow-auto">
  无滚动条的滚动区域
</div>

// 细滚动条
<div className="scrollbar-thin overflow-auto">
  细滚动条的滚动区域
</div>
```

## 🌙 暗色模式

```jsx
// 自动适应暗色模式
<div className="bg-surface dark:bg-gray-800">
  自适应背景色
</div>

<p className="text-primary dark:text-white">
  自适应文本色
</p>
```

## 🔧 实用工具类

```jsx
// Flexbox 布局
<div className="flex items-center justify-between">
  <span>左侧</span>
  <span>右侧</span>
</div>

// Grid 布局
<div className="grid place-items-center h-screen">
  居中内容
</div>

// 圆角和阴影
<div className="rounded-lg shadow-lg">
  卡片样式
</div>
```

## 📝 组件示例

### 现代化按钮组件
```jsx
const Button = ({ children, variant = 'primary', size = 'md' }) => {
  const baseClasses = 'rounded-lg font-medium transition-all duration-fast focus:outline-none focus:ring-2';
  
  const variantClasses = {
    primary: 'bg-primary hover:bg-primary-hover text-white focus:ring-primary/50',
    success: 'bg-success hover:bg-green-600 text-white focus:ring-success/50',
    outline: 'border-2 border-primary text-primary hover:bg-primary hover:text-white'
  };
  
  const sizeClasses = {
    sm: 'px-sm py-xs text-sm',
    md: 'px-md py-sm text-base',
    lg: 'px-lg py-md text-lg'
  };
  
  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {children}
    </button>
  );
};
```

### 响应式卡片组件
```jsx
const ChatCard = ({ children }) => (
  <div className="bg-surface rounded-lg shadow-sm border border-light p-md 
                  hover:shadow-lg transition-all duration-base
                  xs:p-sm md:p-lg">
    {children}
  </div>
);
```

## 💡 最佳实践

1. **优先使用设计系统变量**: 使用 `bg-primary` 而不是 `bg-blue-500`
2. **响应式优先**: 从移动端开始设计，然后添加断点
3. **组合使用**: 结合 Tailwind 类和自定义 CSS 变量
4. **保持一致性**: 使用统一的间距和色彩系统
5. **性能考虑**: 使用 PurgeCSS 去除未使用的样式

## 🚀 迁移建议

逐步将现有组件的内联样式替换为 Tailwind 类：

```jsx
// 之前
<div style={{ 
  padding: 'var(--space-md)', 
  backgroundColor: 'var(--surface)',
  borderRadius: 'var(--border-radius-lg)' 
}}>

// 之后  
<div className="p-md bg-surface rounded-lg">
```

这样既能享受 Tailwind 的便利，又保持了设计系统的一致性。 