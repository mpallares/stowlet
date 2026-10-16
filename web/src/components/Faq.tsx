export interface FaqItem {
  q: string;
  a: string;
}

/** Native disclosure elements: no JavaScript, keyboard accessible, no layout shift on load. */
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
      {items.map((item) => (
        <details key={item.q} className="faq-item group py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
            {item.q}
            <span
              aria-hidden="true"
              className="text-neutral-400 transition-transform duration-300 group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="faq-answer mt-2 leading-7 text-neutral-600 dark:text-neutral-400">
            {item.a}
          </p>
        </details>
      ))}
    </div>
  );
}
