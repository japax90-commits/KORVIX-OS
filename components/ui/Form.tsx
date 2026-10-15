import { Children, cloneElement, forwardRef, isValidElement, useId } from "react";
import { cn } from "@/lib/utils";

// Estilos únicos de formulário e botões, para que todos os módulos tenham a
// mesma altura de controle, borda, foco e tipografia.

export const inputClass =
  "focus-ring block w-full rounded-lg border border-ink-300 bg-surface px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-danger/30 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500";

const buttonVariants = {
  primary: "bg-primary text-primary-fg hover:bg-primary-hover",
  secondary: "border border-ink-300 bg-surface text-ink-700 hover:bg-ink-50",
  danger: "bg-danger text-white hover:bg-danger/90 dark:text-korvix-950",
  ghost: "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
} as const;

const buttonSizes = {
  md: "gap-2 px-4 py-2.5 text-sm",
  sm: "gap-1.5 px-3 py-1.5 text-xs",
} as const;

export function buttonClass(variant: keyof typeof buttonVariants = "primary", className?: string, size: keyof typeof buttonSizes = "md") {
  return cn(
    "focus-ring inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    buttonSizes[size],
    buttonVariants[variant],
    className,
  );
}

export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string;
  /** Mensagem de erro exibida junto ao campo (marca o controle com aria-invalid). */
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const errorId = useId();
  // Sempre via Children.map (chaves estáveis): alternar erro não pode remontar
  // o campo, senão o valor digitado seria perdido.
  const control = Children.map(children, (child) =>
    // Marca o controle (Input/Select/Textarea); ignora auxiliares como <datalist>.
    isValidElement<Record<string, unknown>>(child) && child.type !== "datalist"
      ? cloneElement(child, { "aria-invalid": error ? true : undefined, "aria-describedby": error ? errorId : undefined })
      : child,
  );
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>
      {control}
      {error ? (
        <span id={errorId} role="alert" className="mt-1 block text-xs font-medium text-danger">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-ink-500">{hint}</span>
      )}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputClass, className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn(inputClass, "pr-8", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} rows={3} className={cn(inputClass, className)} {...props} />;
});

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">{message}</p>;
}

export function IconButton({
  label,
  tone = "neutral",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: "neutral" | "danger" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "focus-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-50",
        tone === "danger" ? "text-ink-500 hover:bg-danger/10 hover:text-danger" : "text-ink-500 hover:bg-ink-100 hover:text-ink-900",
        className,
      )}
      {...props}
    />
  );
}
