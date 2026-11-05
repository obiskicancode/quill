'use client';

import { useId } from 'react';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { sortOptions } from '@/lib/rooms';
import type { SortKey } from '@/types/rooms.types';

export function SortMenu({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (next: SortKey) => void;
}) {
  const id = useId();
  const selectItems = sortOptions.map((o) => ({
    value: o.key,
    label: o.label,
  }));

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="text-small font-semibold">
        Sort by
      </Label>
      <Select
        items={selectItems}
        value={value}
        onValueChange={(next) => {
          if (next) onChange(next as SortKey);
        }}
      >
        <SelectTrigger
          id={id}
          className="min-h-11 min-w-42.5 bg-card hover:bg-paper"
        >
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((o) => (
            <SelectItem key={o.key} value={o.key}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
