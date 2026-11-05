import type { ReactNode } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function AdminCard({
  title,
  description,
  children,
  footer,
  className = '',
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('gap-0 py-0', className)}>
      {(title || description) && (
        <CardHeader className="border-b border-line px-4 py-4 sm:px-5">
          {title && (
            <CardTitle render={<h2 />} className="font-display text-h3">
              {title}
            </CardTitle>
          )}
          {description && (
            <CardDescription className="text-small text-muted-foreground">
              {description}
            </CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent className="px-4 py-4 sm:px-5 sm:py-5">
        {children}
      </CardContent>
      {footer && (
        <CardFooter className="border-t border-line bg-transparent px-4 py-3 sm:px-5">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}
