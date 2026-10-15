import { Children, cloneElement, forwardRef, isValidElement, useId } from "react";
import { cn } from "@/lib/utils";

// Estilos únicos de formulário e botões, para que todos os módulos tenham a
// mesma altura de controle, borda, foco e tipografia.

export const inputClass =
  "focus-ring block w-full rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-danger/30 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500";

const buttonVariants = {
  primary: "bg-korvix-900 text-white hover:bg-korvix-800",
  secondary: "border border-ink-300 bg-white text-ink-700 hover:bg-ink-50",
  danger: "bg-danger text-white hover:bg-danger/90",
  ghost: "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
} as const;

export function buttonClass(variant: keyof typeof buttonVariants = "primary", className?: string) {
  return cn(
    "focus-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
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
  const control = error
    ? Children.map(children, (child) =>
        // Marca o controle (Input/Select/Textarea); ignora auxiliares como <datalist>.
        isValidElement<Record<string, unknown>>(child) && child.type !== "datalist"
          ? cloneElement(child, { "aria-invalid": true, "aria-describedby": errorId })
          : child,
      )
    : children;
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
  return <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{message}</p>;
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
        tone === "danger" ? "text-ink-500 hover:bg-red-50 hover:text-danger" : "text-ink-500 hover:bg-ink-100 hover:text-ink-900",
        className,
      )}
      {...props}
    />
  );
}
