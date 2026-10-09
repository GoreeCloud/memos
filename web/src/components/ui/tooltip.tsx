import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import * as React from "react";
import { cn } from "@/lib/utils";
import { popupMotionClasses } from "./popup";

const TooltipProvider = ({ delay = 600, timeout = 400, ...props }: TooltipPrimitive.Provider.Props) => {
  return <TooltipPrimitive.Provider delay={delay} timeout={timeout} {...props} />;
};

const Tooltip = ({ ...props }: TooltipPrimitive.Root.Props) => {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
};

const TooltipTrigger = React.forwardRef<HTMLButtonElement, TooltipPrimitive.Trigger.Props>(({ ...props }, ref) => {
  return <TooltipPrimitive.Trigger ref={ref} data-slot="tooltip-trigger" {...props} />;
});
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  TooltipPrimitive.Popup.Props & Pick<TooltipPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">
>(({ className, align, alignOffset, side, sideOffset = 0, children, ...props }, ref) => {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-tooltip"
      >
        <TooltipPrimitive.Popup
          ref={ref}
          data-slot="tooltip-content"
          className={cn(
            "bg-popover text-popover-foreground border-border z-tooltip w-fit max-w-[calc(100vw-1rem)] break-words origin-(--transform-origin) rounded-md border px-3 py-1.5 text-xs text-balance",
            popupMotionClasses,
            className,
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow
            className={cn(
              "pointer-events-none bg-popover border-border z-tooltip size-2.5 rotate-45 rounded-[2px] border",
              "data-[side=top]:bottom-[-5px] data-[side=bottom]:top-[-5px] data-[side=left]:right-[-5px] data-[side=right]:left-[-5px]",
            )}
          />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
});
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
