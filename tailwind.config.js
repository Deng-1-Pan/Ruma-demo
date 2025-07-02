/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 集成现有的CSS变量系统
      colors: {
        primary: {
          DEFAULT: 'var(--primary-color)',
          hover: 'var(--primary-hover)',
          light: 'var(--primary-light)',
          dark: 'var(--primary-dark)',
        },
        success: {
          DEFAULT: 'var(--success-color)',
          light: 'var(--success-light)',
        },
        warning: {
          DEFAULT: 'var(--warning-color)',
          light: 'var(--warning-light)',
        },
        error: {
          DEFAULT: 'var(--error-color)',
          light: 'var(--error-light)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          quaternary: 'var(--text-quaternary)',
        },
        border: {
          DEFAULT: 'var(--border-color)',
          light: 'var(--border-light)',
        },
        background: 'var(--background)',
        surface: {
          DEFAULT: 'var(--surface)',
          hover: 'var(--surface-hover)',
        },
        // 情绪色彩
        emotion: {
          positive: 'var(--emotion-positive)',
          negative: 'var(--emotion-negative)',
          neutral: 'var(--emotion-neutral)',
          excited: 'var(--emotion-excited)',
          calm: 'var(--emotion-calm)',
        }
      },
      fontSize: {
        'xs': 'var(--font-size-xs)',
        'sm': 'var(--font-size-sm)',
        'base': 'var(--font-size-base)',
        'lg': 'var(--font-size-lg)',
        'xl': 'var(--font-size-xl)',
        '2xl': 'var(--font-size-xxl)',
      },
      spacing: {
        'xs': 'var(--space-xs)',
        'sm': 'var(--space-sm)',
        'md': 'var(--space-md)',
        'lg': 'var(--space-lg)',
        'xl': 'var(--space-xl)',
        '2xl': 'var(--space-xxl)',
      },
      borderRadius: {
        'sm': 'var(--border-radius-sm)',
        'DEFAULT': 'var(--border-radius-base)',
        'lg': 'var(--border-radius-lg)',
        'xl': 'var(--border-radius-xl)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'DEFAULT': 'var(--shadow-base)',
        'lg': 'var(--shadow-lg)',
      },
      transitionDuration: {
        'fast': 'var(--transition-fast)',
        'DEFAULT': 'var(--transition-base)',
        'slow': 'var(--transition-slow)',
      },
      // 聊天界面专用尺寸
      width: {
        'sidebar': 'var(--chat-sidebar-width)',
      },
      height: {
        'header': 'var(--chat-header-height)',
      },
      maxWidth: {
        'message': 'var(--message-max-width)',
      },
      // 响应式断点（覆盖默认值）
      screens: {
        'xs': '576px',
        'sm': '768px',
        'md': '992px',
        'lg': '1200px',
        'xl': '1400px',
      },
      // 动画
      animation: {
        'fade-in': 'fadeIn var(--transition-base)',
        'slide-in': 'slideIn var(--transition-base)',
        'pulse': 'pulse 1.5s infinite',
        'typing-dot': 'typing-dot 1.4s infinite ease-in-out',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0', transform: 'translateY(10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' }
        },
        slideIn: {
          'from': { transform: 'translateX(-20px)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' }
        },
        'typing-dot': {
          '0%, 60%, 100%': {
            transform: 'translateY(0)',
            opacity: '0.4'
          },
          '30%': {
            transform: 'translateY(-10px)',
            opacity: '1'
          }
        }
      }
    },
  },
  plugins: [
    // 添加一些有用的插件
    function({ addUtilities }) {
      const newUtilities = {
        // 快速工具类
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        },
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '6px'
          },
          '&::-webkit-scrollbar-track': {
            background: 'var(--border-light)',
            borderRadius: 'var(--border-radius-sm)'
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'var(--border-color)',
            borderRadius: 'var(--border-radius-sm)'
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'var(--text-tertiary)'
          }
        },
        // 聊天界面专用工具类
        '.message-bubble-user': {
          'background-color': 'var(--primary-light)',
          'border-radius': '16px 16px 4px 16px'
        },
        '.message-bubble-assistant': {
          'background-color': 'var(--success-light)',
          'border-radius': '16px 16px 16px 4px'
        },
        // 响应式隐藏工具类
        '.mobile-hidden': {
          '@media (max-width: 576px)': {
            display: 'none'
          }
        },
        '.desktop-hidden': {
          '@media (min-width: 993px)': {
            display: 'none'
          }
        }
      }
      addUtilities(newUtilities)
    }
  ],
  // 暗色模式支持
  darkMode: ['class', '[data-theme="dark"]'],
} 