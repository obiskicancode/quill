'use client';

import { useRouter } from 'next/navigation';
import { Component, useState, type ReactNode } from 'react';

import { Reveal } from '../motion';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';

interface BoundaryProps {
  label: string;
  onRetry: () => void;
  children: ReactNode;
}
class Boundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="container-page py-8">
        <Reveal>
          <Alert role="alert" variant="destructive" size="banner">
            <AlertTitle>{`We couldn't load ${this.props.label}`}</AlertTitle>
            <AlertDescription>
              <p>
                The rest of the page still works. Trying again only reloads this
                part.
              </p>
            </AlertDescription>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={this.props.onRetry}
              >
                Try again
              </Button>
            </div>
          </Alert>
        </Reveal>
      </section>
    );
  }
}
/** Contains a failing section so one error never takes down the page. "Try again" reloads just that section. */
export function SectionBoundary({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  return (
    <Boundary
      key={attempt}
      label={label}
      onRetry={() => {
        router.refresh();
        setAttempt((a) => a + 1);
      }}
    >
      {children}
    </Boundary>
  );
}
