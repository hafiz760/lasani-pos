import * as React from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@renderer/components/ui/button"
import { cn } from "@renderer/lib/utils"

interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
    isLoading?: boolean
    loadingText?: string
}

export function LoadingButton({
    children,
    isLoading,
    loadingText,
    className,
    disabled,
    ...props
}: LoadingButtonProps) {
    return (
        <Button
            className={cn("relative", className)}
            disabled={isLoading || disabled}
            {...props}
        >
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {loadingText || children}
                </>
            ) : (
                children
            )}
        </Button>
    )
}
