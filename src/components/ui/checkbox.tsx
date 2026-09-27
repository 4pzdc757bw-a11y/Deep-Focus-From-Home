import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "relative flex size-6 shrink-0 items-center justify-center rounded-sm border border-gold bg-paper text-olive data-[state=checked]:bg-olive data-[state=checked]:text-cream",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <Check className="size-4" strokeWidth={3} />
        <span className="sr-only">checked</span>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function CheckRow({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md bg-cream px-3 py-2 print:min-h-0 print:bg-transparent print:px-0 print:py-1">
      <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(Boolean(v))} />
      <span
        className={cn(
          "text-base text-ink",
          checked && "print:font-semibold",
        )}
      >
        {label}
        {checked ? <span className="hidden print:inline"> — done</span> : null}
      </span>
    </label>
  );
}
