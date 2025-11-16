import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
        "./pages/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
        "./app/**/*.{ts,tsx}",
        "./src/**/*.{ts,tsx}",
        "./server/src/views/**/*.{ts,tsx}",
    ],
    prefix: "",
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                '2xl': '1400px'
            }
        },
        extend: {
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                sidebar: {
                    DEFAULT: 'hsl(var(--sidebar-background))',
                    foreground: 'hsl(var(--sidebar-foreground))',
                    primary: 'hsl(var(--sidebar-primary))',
                    'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
                    accent: 'hsl(var(--sidebar-accent))',
                    'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
                    border: 'hsl(var(--sidebar-border))',
                    ring: 'hsl(var(--sidebar-ring))'
                },
                // InfiniteRealms Brand Colors (Lore-based naming)
                'infinite-purple': '#6B46C1',
                'infinite-gold': '#F59E0B',
                'infinite-teal': '#0891B2',
                'infinite-dark': '#1E1B4B',

                // Lore-based Color Aliases
                'shadowweave': '#6B46C1',      // Deep purple for mystical/magical elements
                'emberlight': '#F59E0B',       // Warm gold for highlights and treasure
                'crystalline': '#0891B2',      // Cool teal for water/ice elements
                'electricCyan': '#06B6D4',     // Bright cyan for critical moments
            },
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                heading: ['Cinzel', 'serif'], // New: Fantasy accent for major headings
                serif: ['"DM Serif Display"', '"Times New Roman"', 'serif'], // For narrative/immersive text
            },
            fontSize: {
                'xs': ['0.75rem', { lineHeight: '1.2' }], // 12px
                'sm': ['0.875rem', { lineHeight: '1.4' }], // 14px
                'base': ['1rem', { lineHeight: '1.5' }], // 16px
                'lg': ['1.125rem', { lineHeight: '1.6' }], // 18px
                'xl': ['1.25rem', { lineHeight: '1.6' }], // 20px
                '2xl': ['1.5rem', { lineHeight: '1.7' }], // 24px
                '3xl': ['1.875rem', { lineHeight: '1.75' }], // 30px
                '4xl': ['2.25rem', { lineHeight: '1.8' }], // 36px
                '5xl': ['3rem', { lineHeight: '1.8' }], // 48px
                '6xl': ['3.75rem', { lineHeight: '1.85' }], // 60px
            },
            lineHeight: {
                'tight': '1.2',
                'snug': '1.4',
                'normal': '1.5',
                'relaxed': '1.6',
                'loose': '1.75',
            },
            letterSpacing: {
                'tighter': '-0.05em',
                'tight': '-0.025em',
                'normal': '0em',
                'wide': '0.025em',
                'wider': '0.05em',
                'widest': '0.1em',
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },
            keyframes: {
                'accordion-down': {
                    from: {
                        height: '0'
                    },
                    to: {
                        height: 'var(--radix-accordion-content-height)'
                    }
                },
                'accordion-up': {
                    from: {
                        height: 'var(--radix-accordion-content-height)'
                    },
                    to: {
                        height: '0'
                    }
                },
                // Fantasy-Tech Fusion Animations
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' }
                },
                'fade-in-up': {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' }
                },
                'fade-in-down': {
                    '0%': { opacity: '0', transform: 'translateY(-20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' }
                },
                'slide-in-left': {
                    '0%': { opacity: '0', transform: 'translateX(-20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' }
                },
                'slide-in-right': {
                    '0%': { opacity: '0', transform: 'translateX(20px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' }
                },
                'scale-in': {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' }
                },
                'glow-pulse': {
                    '0%, 100%': {
                        boxShadow: '0 0 10px rgba(124, 58, 237, 0.3), 0 0 20px rgba(124, 58, 237, 0.2)'
                    },
                    '50%': {
                        boxShadow: '0 0 20px rgba(124, 58, 237, 0.5), 0 0 40px rgba(124, 58, 237, 0.3)'
                    }
                },
                'gold-glow-pulse': {
                    '0%, 100%': {
                        boxShadow: '0 0 10px rgba(245, 158, 11, 0.3), 0 0 20px rgba(245, 158, 11, 0.2)'
                    },
                    '50%': {
                        boxShadow: '0 0 20px rgba(245, 158, 11, 0.5), 0 0 40px rgba(245, 158, 11, 0.3)'
                    }
                },
                'shimmer': {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' }
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' }
                },
                'bounce-subtle': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-5px)' }
                },
                'spin-slow': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                },
                'dice-roll': {
                    '0%': { transform: 'rotate(0deg) scale(1)' },
                    '50%': { transform: 'rotate(180deg) scale(1.1)' },
                    '100%': { transform: 'rotate(360deg) scale(1)' }
                },
                'sparkle': {
                    '0%': { opacity: '0', transform: 'scale(0) rotate(0deg)' },
                    '50%': { opacity: '1', transform: 'scale(1) rotate(180deg)' },
                    '100%': { opacity: '0', transform: 'scale(0.5) rotate(360deg)' }
                },
                'celebration': {
                    '0%': { opacity: '0', transform: 'scale(0.8)' },
                    '50%': { opacity: '1', transform: 'scale(1.1)' },
                    '100%': { opacity: '1', transform: 'scale(1)' }
                },
                'pulse-soft': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.8' }
                }
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                // Fantasy-Tech Fusion Animations
                'fade-in': 'fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                'fade-in-up': 'fade-in-up 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                'fade-in-down': 'fade-in-down 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                'slide-in-left': 'slide-in-left 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                'slide-in-right': 'slide-in-right 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                'scale-in': 'scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
                'gold-glow-pulse': 'gold-glow-pulse 2s ease-in-out infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'float': 'float 3s ease-in-out infinite',
                'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
                'spin-slow': 'spin-slow 3s linear infinite',
                'dice-roll': 'dice-roll 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                'sparkle': 'sparkle 1s cubic-bezier(0.4, 0, 0.2, 1)',
                'celebration': 'celebration 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                'pulse-soft': 'pulse-soft 2s ease-in-out infinite'
            }
        }
    },
    plugins: [require("tailwindcss-animate")],
} satisfies Config;
