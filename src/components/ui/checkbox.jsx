import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check, Square } from "lucide-react"
import { cn } from "@/lib/utils"

// Simplified Checkbox without Radix for speed if dependency fails, 
// using simple input checkbox but styled? 
// No, user code imports Checkbox, usually Shadcn uses Radix. 
// I will implement a pure React version to avoid more dependencies, or install radix.
// User didn't specify radix. I'll make a custom one compatible with the API.

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            ref={ref}
            onClick={() => onCheckedChange?.(!checked)}
            className={cn(
                "peer h-4 w-4 shrink-0 rounded-sm border border-brand-red ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-brand-red data-[state=checked]:text-white flex items-center justify-center",
                className
            )}
            data-state={checked ? "checked" : "unchecked"}
            {...props}
        >
            {checked && <Check className="h-3 w-3" />}
        </button>
    )
})
Checkbox.displayName = "Checkbox"

export { Checkbox }
