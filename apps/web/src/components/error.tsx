
import { type ComponentProps } from "react";
import { Button } from "./ui/button";

export default function ErrorFallback({
  message,
  title,
  children,
}: {
  title: string;
  message: string;
  children?: React.ReactElement<ComponentProps<typeof Button>, typeof Button>;
}) {
  return (
    <div className="flex flex-col items-center">
      <h1 className="font-semibold text-lg mb-2">{title}</h1>
      <p className="mb-6">{message}</p>
      {children && <div className="flex gap-4">{children}</div>}
    </div>
  );
}
