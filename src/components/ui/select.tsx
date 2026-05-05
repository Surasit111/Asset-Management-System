"use client"



import * as React from "react"

import * as SelectPrimitive from "@radix-ui/react-select"

import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"



const Select = (props: any) => (

  <SelectPrimitive.Root modal={props.modal ?? false} {...props} />

)

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value



const SelectTrigger = React.forwardRef<

  React.ElementRef<typeof SelectPrimitive.Trigger>,

  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>

>(({ className, children, ...props }, ref) => (

  <SelectPrimitive.Trigger

    ref={ref}

    className={cn(
      "group flex h-[40px] w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-bold ring-offset-white placeholder:text-gray-500 focus:outline-none cursor-pointer select-none disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 transition-all hover:border-blue-400 hover:text-blue-600 data-[state=open]:border-blue-600 data-[state=open]:text-blue-600 shadow-sm",

      className

    )}

    {...props}

  >

    {children}

    <SelectPrimitive.Icon asChild>

      <ChevronDown className="h-4 w-4 opacity-50 transition-transform duration-200 group-data-[state=open]:rotate-180" />

    </SelectPrimitive.Icon>

  </SelectPrimitive.Trigger>

))

SelectTrigger.displayName = SelectPrimitive.Trigger.displayName



const SelectContent = React.forwardRef<

  React.ElementRef<typeof SelectPrimitive.Content>,

  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>

>(({ className, children, position = "popper", ...props }, ref) => (

  <SelectPrimitive.Portal>

    <SelectPrimitive.Content

      ref={ref}

      data-dropdown-content

      className={cn(
        "relative z-50 min-w-32 rounded-lg border border-gray-100 bg-white text-gray-950 shadow-lg p-1.5 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",

        position === "popper" &&

        "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",

        className

      )}

      position={position}

      {...props}

    >

      <SelectPrimitive.Viewport

        className={cn(
          "flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar",

          position === "popper" &&

          "h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width)"

        )}

      >

        {children}

      </SelectPrimitive.Viewport>

    </SelectPrimitive.Content>

  </SelectPrimitive.Portal>

))

SelectContent.displayName = SelectPrimitive.Content.displayName



const SelectItem = React.forwardRef<

  React.ElementRef<typeof SelectPrimitive.Item>,

  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>

>(({ className, children, ...props }, ref) => (

  <SelectPrimitive.Item

    ref={ref}

    className={cn(
      "relative flex w-full cursor-pointer select-none items-center justify-between rounded-lg py-1.5 px-3 text-[13px] font-medium text-[#0f172a] outline-none hover:bg-indigo-100/50 hover:text-blue-600 focus:bg-indigo-100/50 focus:text-blue-600 data-[state=checked]:bg-blue-50 data-[state=checked]:text-blue-600 data-[state=checked]:font-bold data-disabled:pointer-events-none data-disabled:opacity-50 transition-all mb-0.5 last:mb-0",
      className
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator>
      <Check className="h-4 w-4 text-current" strokeWidth={3} />
    </SelectPrimitive.ItemIndicator>

  </SelectPrimitive.Item>

))

SelectItem.displayName = SelectPrimitive.Item.displayName



export {

  Select,

  SelectGroup,

  SelectValue,

  SelectTrigger,

  SelectContent,

  SelectItem,

}