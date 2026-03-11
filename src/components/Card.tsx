import React from "react";

type CardProps = React.ComponentProps<"div"> & {
  children: React.ReactNode;
  className?: string;
};

export default function Card({
  children,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-soft-secondary/30 p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
