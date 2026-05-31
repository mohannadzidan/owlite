"use strict";

/**
 * PostCSS plugin: generates margin-based fallbacks for flex containers using gap.
 * Chrome 81 supports gap for CSS Grid (Chrome 66+) but NOT for flexbox (Chrome 84+).
 * Requires `.no-flex-gap` on <html>, injected by the detection script in layout.tsx.
 *
 * For each simple gap utility found in compiled CSS it emits:
 *   .no-flex-gap .flex.gap-X > * + *         { margin-left: X }
 *   .no-flex-gap .flex.flex-col.gap-X > * + * { margin-top: X; margin-left: 0 }
 */
const postcss = require("postcss");

/** @type {import('postcss').PluginCreator<Record<string, never>>} */
const plugin = () => ({
  postcssPlugin: "postcss-flex-gap-polyfill",
  Once(root) {
    const processed = new WeakSet();

    root.walkDecls(/^(gap|column-gap|row-gap)$/, (decl) => {
      const { prop, value } = decl;
      const rule = decl.parent;

      if (!rule || rule.type !== "rule") return;
      if (processed.has(rule)) return;
      processed.add(rule);

      const sel = rule.selector.trim();
      // Only handle simple single-class selectors (.gap-4, .gap-x-2, …)
      // Skip anything with combinators, pseudo-elements/classes, or multiple selectors
      if (!sel.startsWith(".")) return;
      if (/[ >+~:,\[]/.test(sel)) return;

      const src = rule.source;

      if (prop === "gap") {
        // flex-row (default): horizontal spacing between siblings
        const rowRule = postcss.rule({
          selector: `.no-flex-gap .flex${sel} > * + *`,
          source: src,
        });
        rowRule.append(postcss.decl({ prop: "margin-left", value }));
        rule.parent.insertAfter(rule, rowRule);

        // flex-col: vertical spacing — higher specificity overrides the row rule above
        const colRule = postcss.rule({
          selector: `.no-flex-gap .flex.flex-col${sel} > * + *`,
          source: src,
        });
        colRule.append(postcss.decl({ prop: "margin-top", value }));
        colRule.append(postcss.decl({ prop: "margin-left", value: "0" }));
        rowRule.parent.insertAfter(rowRule, colRule);
      } else if (prop === "column-gap") {
        const r = postcss.rule({
          selector: `.no-flex-gap .flex${sel} > * + *`,
          source: src,
        });
        r.append(postcss.decl({ prop: "margin-left", value }));
        rule.parent.insertAfter(rule, r);
      } else if (prop === "row-gap") {
        const r = postcss.rule({
          selector: `.no-flex-gap .flex${sel} > * + *`,
          source: src,
        });
        r.append(postcss.decl({ prop: "margin-top", value }));
        rule.parent.insertAfter(rule, r);
      }
    });
  },
});

plugin.postcss = true;
module.exports = plugin;
