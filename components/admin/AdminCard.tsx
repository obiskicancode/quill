import { cn } from 'cn';
import type { ReactNode } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
    <Card
      className={cn(
        'rounded-card border-line bg-card shadow-raised gap-0 border py-0 ring-0',
        className,
      )}
    >
      {(title || description) && (
        <CardHeader className="border-line border-b px-4 py-4 sm:px-5">
          {title && (
            <CardTitle>
              <h2 className="font-display text-h3">{title}</h2>
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
        <CardFooter className="border-line border-t bg-transparent px-4 py-3 sm:px-5">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}
