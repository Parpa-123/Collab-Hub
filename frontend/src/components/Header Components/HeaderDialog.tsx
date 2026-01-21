import React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface HeaderDialogProps {
    trigger: React.ReactNode
    title: string
    description?: string
    children: React.ReactNode
    className?: string
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

const HeaderDialog = ({
    trigger,
    title,
    description,
    children,
    className,
    open,
    onOpenChange,
}: HeaderDialogProps) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className={className}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                <div className="py-4">
                    {children}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default HeaderDialog
