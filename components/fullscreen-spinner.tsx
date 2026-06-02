import { ComponentProps } from "react";
import { Spinner } from "./ui/spinner";
import { cn } from "@/lib/utils";

export default function FullScreenSpinner({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("w-screen h-screen flex items-center justify-center", className)} {...props}>
      <Spinner className="w-12 h-12" />
    </div>
  );
}
