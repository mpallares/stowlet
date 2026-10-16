import type { ReactNode } from 'react';
import { Container } from './Container';
import { Footer } from './Footer';
import { Header } from './Header';

export function PageShell({ children, prose = false }: { children: ReactNode; prose?: boolean }) {
  return (
    <>
      <Header />
      <main className={prose ? 'prose-page' : ''}>
        {prose ? <Container className="max-w-3xl py-12">{children}</Container> : children}
      </main>
      <Footer />
    </>
  );
}
