# Recharts Compatibility Fix in Next.js 14

## Issue

The project was experiencing the following error:

```
TypeError: Super expression must either be null or a function
    at _inherits (webpack-internal:///(rsc)/./node_modules/recharts/es6/component/TooltipBoundingBox.js:92:15)
```

This error occurs because Recharts (v2.12.2) is not fully compatible with React Server Components in Next.js 14.

## Solution

The issue was fixed by:

1. Creating a client-side wrapper component for all charts (`ClientSideChart.tsx`)
2. Moving all chart rendering to dedicated client components:
   - `dashboard-charts.tsx` (marked with "use client")
   - `dashboard-metrics.tsx` (marked with "use client")

3. Keeping the main page (`dashboard/page.tsx`) as a server component but delegating chart rendering to client components

## Alternative Solutions

If you continue experiencing issues, consider:

1. Downgrading recharts to v2.9.0 which has better compatibility
2. Use React.lazy with dynamic imports to load recharts components:

```javascript
const ChartComponent = dynamic(() => import('@/components/ChartComponent'), {
  ssr: false
});
```

## References

- [Next.js Server Components documentation](https://nextjs.org/docs/getting-started/react-essentials#server-components)
- [Recharts GitHub Issue #3325](https://github.com/recharts/recharts/issues/3325) 