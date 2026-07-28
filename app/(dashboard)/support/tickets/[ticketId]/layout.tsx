/** Required for `output: 'export'` with dynamic segments. */
export function generateStaticParams() {
  return [{ ticketId: "_" }];
}

export default function TicketIdLayout({ children }: { children: React.ReactNode }) {
  return children;
}
