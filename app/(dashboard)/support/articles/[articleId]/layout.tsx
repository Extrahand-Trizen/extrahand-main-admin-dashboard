/** Required for `output: 'export'` with dynamic segments. */
export function generateStaticParams() {
  return [{ articleId: "_" }];
}

export default function ArticleIdLayout({ children }: { children: React.ReactNode }) {
  return children;
}
