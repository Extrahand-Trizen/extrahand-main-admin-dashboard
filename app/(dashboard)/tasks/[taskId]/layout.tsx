/** Required for `output: 'export'` with dynamic segments. */
export function generateStaticParams() {
  return [{ taskId: "_" }];
}

export default function TaskIdLayout({ children }: { children: React.ReactNode }) {
  return children;
}
