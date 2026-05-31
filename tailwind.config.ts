import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import animate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        popover: "var(--popover)",
        "popover-foreground": "var(--popover-foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        destructive: "var(--destructive)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        sidebar: "var(--sidebar)",
        "sidebar-foreground": "var(--sidebar-foreground)",
        "sidebar-primary": "var(--sidebar-primary)",
        "sidebar-primary-foreground": "var(--sidebar-primary-foreground)",
        "sidebar-accent": "var(--sidebar-accent)",
        "sidebar-accent-foreground": "var(--sidebar-accent-foreground)",
        "sidebar-border": "var(--sidebar-border)",
        "sidebar-ring": "var(--sidebar-ring)",
        "chart-1": "var(--chart-1)",
        "chart-2": "var(--chart-2)",
        "chart-3": "var(--chart-3)",
        "chart-4": "var(--chart-4)",
        "chart-5": "var(--chart-5)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        heading: ["var(--font-heading)", "var(--font-sans)", "sans-serif"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        "3xl": "var(--radius-3xl)",
        "4xl": "var(--radius-4xl)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: {
            height: "var(--radix-accordion-content-height, var(--accordion-panel-height, auto))",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height, var(--accordion-panel-height, auto))",
          },
          to: { height: "0" },
        },
        "collapsible-down": {
          from: { height: "0" },
          to: { height: "var(--radix-collapsible-content-height, auto)" },
        },
        "collapsible-up": {
          from: { height: "var(--radix-collapsible-content-height, auto)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "collapsible-down": "collapsible-down 0.2s ease-out",
        "collapsible-up": "collapsible-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    animate,
    plugin(({ addUtilities, addVariant }) => {
      addVariant("data-open", '&:is([data-state="open"], [data-open]:not([data-open="false"]))');
      addVariant(
        "data-closed",
        '&:is([data-state="closed"], [data-closed]:not([data-closed="false"]))',
      );
      addVariant(
        "data-checked",
        '&:is([data-state="checked"], [data-checked]:not([data-checked="false"]))',
      );
      addVariant(
        "data-unchecked",
        '&:is([data-state="unchecked"], [data-unchecked]:not([data-unchecked="false"]))',
      );
      addVariant("data-selected", '&[data-selected="true"]');
      addVariant(
        "data-disabled",
        '&:is([data-disabled="true"], [data-disabled]:not([data-disabled="false"]))',
      );
      addVariant(
        "data-active",
        '&:is([data-state="active"], [data-active]:not([data-active="false"]))',
      );
      addVariant(
        "data-horizontal",
        '&:is([data-orientation="horizontal"], [data-horizontal]:not([data-horizontal="false"]))',
      );
      addVariant(
        "data-vertical",
        '&:is([data-orientation="vertical"], [data-vertical]:not([data-vertical="false"]))',
      );

      addUtilities({
        ".no-scrollbar": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
      });
    }),
  ],
};

export default config;
