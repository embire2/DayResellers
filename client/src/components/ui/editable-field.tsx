import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ValidationResult = {
  isValid: boolean;
  message?: string;
};

type EditableFieldProps = {
  value: string;
  onSave: (value: string) => Promise<void> | void;
  onCancel?: () => void;
  validate?: (value: string) => ValidationResult;
  type?: 'text' | 'textarea' | 'select';
  options?: Array<{ value: string; label: string }>;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  isEditing?: boolean;
  setIsEditing?: (isEditing: boolean) => void;
  label?: string;
  disabled?: boolean;
};

export function EditableField({
  value,
  onSave,
  onCancel,
  validate,
  type = 'text',
  options = [],
  className = '',
  placeholder = 'Enter value',
  autoFocus = true,
  isEditing: externalIsEditing,
  setIsEditing: externalSetIsEditing,
  label,
  disabled = false,
}: EditableFieldProps) {
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(value);
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true });
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Determine whether to use internal or external editing state management
  const isEditing = externalIsEditing !== undefined ? externalIsEditing : internalIsEditing;
  const setIsEditing = externalSetIsEditing || setInternalIsEditing;

  // Set the edited value when the value prop changes
  useEffect(() => {
    setEditedValue(value);
  }, [value]);

  // Focus the input when in editing mode
  useEffect(() => {
    if (isEditing && autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing, autoFocus]);

  // Start editing
  const handleEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditedValue(value);
  };

  // Validate and update the value
  const handleChange = (newValue: string) => {
    setEditedValue(newValue);
    if (validate) {
      const result = validate(newValue);
      setValidation(result);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setIsEditing(false);
    setEditedValue(value);
    setValidation({ isValid: true });
    if (onCancel) onCancel();
  };

  // Save changes
  const handleSave = async () => {
    if (validate) {
      const result = validate(editedValue);
      setValidation(result);
      if (!result.isValid) return;
    }

    await onSave(editedValue);
    setIsEditing(false);
  };

  // Handle the Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Render different input types
  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <Textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editedValue}
            onChange={(e) => handleChange(e.target.value)}
            className={cn(
              'min-w-[200px] p-2',
              validation.isValid ? '' : 'border-red-500',
              className
            )}
            placeholder={placeholder}
            onKeyDown={handleKeyDown}
            rows={4}
          />
        );
      case 'select':
        return (
          <Select
            value={editedValue}
            onValueChange={handleChange}
          >
            <SelectTrigger 
              className={cn(
                'min-w-[200px]',
                validation.isValid ? '' : 'border-red-500',
                className
              )}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'text':
      default:
        return (
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={editedValue}
            onChange={(e) => handleChange(e.target.value)}
            className={cn(
              'min-w-[100px]',
              validation.isValid ? '' : 'border-red-500',
              className
            )}
            placeholder={placeholder}
            onKeyDown={handleKeyDown}
          />
        );
    }
  };

  // Render editing mode
  if (isEditing) {
    return (
      <div className="relative group">
        {label && <div className="text-xs text-muted-foreground mb-1">{label}</div>}
        <div className="flex gap-2 items-center">
          {renderInput()}
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              disabled={!validation.isValid}
              title="Save"
              className="h-8 w-8 text-green-600"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              title="Cancel"
              className="h-8 w-8 text-red-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {!validation.isValid && (
          <p className="text-xs text-red-500 mt-1">{validation.message}</p>
        )}
      </div>
    );
  }

  // Render display mode
  return (
    <div 
      className={cn(
        "inline-block relative group cursor-pointer",
        disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer",
        className
      )}
      onClick={handleEdit}
    >
      {label && <div className="text-xs text-muted-foreground mb-1">{label}</div>}
      <div className={cn(
        "py-1 px-2 border border-transparent rounded-md hover:bg-gray-50 hover:border-gray-200 transition-colors",
        disabled ? "hover:bg-transparent hover:border-transparent" : ""
      )}>
        {type === 'select' ? (
          <span>
            {options.find(opt => opt.value === value)?.label || value || placeholder}
          </span>
        ) : (
          <span>{value || <span className="text-muted-foreground italic">{placeholder}</span>}</span>
        )}
        {!disabled && (
          <span className="opacity-0 group-hover:opacity-100 ml-2 text-gray-400 transition-opacity">
            <Pencil className="h-3 w-3 inline-block" />
          </span>
        )}
      </div>
    </div>
  );
}