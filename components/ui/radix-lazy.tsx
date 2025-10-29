"use client"

import { lazy, Suspense, ComponentType } from "react"

// Lazy loading wrappers for heavy Radix UI components
export const LazyDialog = lazy(() => 
  import("./dialog").then(module => ({ 
    default: module.Dialog,
    DialogContent: module.DialogContent,
    DialogHeader: module.DialogHeader,
    DialogTitle: module.DialogTitle,
    DialogDescription: module.DialogDescription,
    DialogTrigger: module.DialogTrigger,
    DialogClose: module.DialogClose,
    DialogFooter: module.DialogFooter,
    DialogOverlay: module.DialogOverlay,
    DialogPortal: module.DialogPortal
  }))
)

export const LazySheet = lazy(() => 
  import("./sheet").then(module => ({ 
    default: module.Sheet,
    SheetContent: module.SheetContent,
    SheetHeader: module.SheetHeader,
    SheetTitle: module.SheetTitle,
    SheetDescription: module.SheetDescription,
    SheetTrigger: module.SheetTrigger,
    SheetClose: module.SheetClose,
    SheetFooter: module.SheetFooter
  }))
)

export const LazyPopover = lazy(() => 
  import("./popover").then(module => ({ 
    default: module.Popover,
    PopoverContent: module.PopoverContent,
    PopoverTrigger: module.PopoverTrigger,
    PopoverAnchor: module.PopoverAnchor
  }))
)

export const LazySelect = lazy(() => 
  import("./select").then(module => ({ 
    default: module.Select,
    SelectContent: module.SelectContent,
    SelectItem: module.SelectItem,
    SelectTrigger: module.SelectTrigger,
    SelectValue: module.SelectValue,
    SelectGroup: module.SelectGroup,
    SelectLabel: module.SelectLabel,
    SelectSeparator: module.SelectSeparator,
    SelectScrollUpButton: module.SelectScrollUpButton,
    SelectScrollDownButton: module.SelectScrollDownButton
  }))
)

export const LazyCommand = lazy(() => 
  import("./command").then(module => ({ 
    default: module.Command,
    CommandDialog: module.CommandDialog,
    CommandInput: module.CommandInput,
    CommandList: module.CommandList,
    CommandEmpty: module.CommandEmpty,
    CommandGroup: module.CommandGroup,
    CommandItem: module.CommandItem,
    CommandShortcut: module.CommandShortcut,
    CommandSeparator: module.CommandSeparator
  }))
)

export const LazyDropdownMenu = lazy(() => 
  import("./dropdown-menu").then(module => ({ 
    default: module.DropdownMenu,
    DropdownMenuTrigger: module.DropdownMenuTrigger,
    DropdownMenuContent: module.DropdownMenuContent,
    DropdownMenuItem: module.DropdownMenuItem,
    DropdownMenuCheckboxItem: module.DropdownMenuCheckboxItem,
    DropdownMenuRadioItem: module.DropdownMenuRadioItem,
    DropdownMenuLabel: module.DropdownMenuLabel,
    DropdownMenuSeparator: module.DropdownMenuSeparator,
    DropdownMenuShortcut: module.DropdownMenuShortcut,
    DropdownMenuGroup: module.DropdownMenuGroup,
    DropdownMenuPortal: module.DropdownMenuPortal,
    DropdownMenuSub: module.DropdownMenuSub,
    DropdownMenuSubContent: module.DropdownMenuSubContent,
    DropdownMenuSubTrigger: module.DropdownMenuSubTrigger,
    DropdownMenuRadioGroup: module.DropdownMenuRadioGroup
  }))
)

// Fallback components for better UX during loading
const RadixFallback = ({ children }: { children?: React.ReactNode }) => (
  <div className="animate-pulse bg-muted/50 rounded-md p-2 min-h-[2rem] flex items-center justify-center">
    {children || <div className="text-xs text-muted-foreground">Loading...</div>}
  </div>
)

// Higher-order component for wrapping Radix components with Suspense
export function withRadixSuspense<T extends ComponentType<any>>(
  LazyComponent: T,
  fallback?: React.ReactNode
) {
  return function WrappedComponent(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback || <RadixFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}

// Pre-wrapped components ready to use
export const SuspenseDialog = withRadixSuspense(LazyDialog)
export const SuspenseSheet = withRadixSuspense(LazySheet)
export const SuspensePopover = withRadixSuspense(LazyPopover)
export const SuspenseSelect = withRadixSuspense(LazySelect)
export const SuspenseCommand = withRadixSuspense(LazyCommand)
export const SuspenseDropdownMenu = withRadixSuspense(LazyDropdownMenu)

// Utility function to preload components when user interaction is likely
export function preloadRadixComponent(componentName: string) {
  switch (componentName) {
    case 'dialog':
      return import("./dialog")
    case 'sheet':
      return import("./sheet")
    case 'popover':
      return import("./popover")
    case 'select':
      return import("./select")
    case 'command':
      return import("./command")
    case 'dropdown-menu':
      return import("./dropdown-menu")
    default:
      return Promise.resolve()
  }
}

export default {
  LazyDialog,
  LazySheet,
  LazyPopover,
  LazySelect,
  LazyCommand,
  LazyDropdownMenu,
  SuspenseDialog,
  SuspenseSheet,
  SuspensePopover,
  SuspenseSelect,
  SuspenseCommand,
  SuspenseDropdownMenu,
  preloadRadixComponent,
  withRadixSuspense
}