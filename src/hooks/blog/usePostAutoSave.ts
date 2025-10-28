import { useEffect, useState, useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { debounce } from 'lodash-es';

interface AutoSaveOptions<T> {
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
}

export function usePostAutoSave<T>({ onSave, debounceMs = 30000 }: AutoSaveOptions<T>) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const form = useFormContext<T>();
  const { formState, getValues } = form;
  const { isDirty } = formState;

  const debouncedSave = useCallback(
    debounce(async (data: T) => {
      setIsSaving(true);
      try {
        await onSave(data);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }, debounceMs),
    [onSave, debounceMs]
  );

  useEffect(() => {
    if (isDirty) {
      const formData = getValues();
      debouncedSave(formData);
    }

    return () => {
      debouncedSave.cancel();
    };
  }, [formState.dirtyFields, debouncedSave, getValues, isDirty]);

  return { isSaving, lastSaved };
}
