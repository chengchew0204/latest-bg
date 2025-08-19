// Accessible button/link with unified styles
import Link from "next/link";
import React from "react";

type Props =
  | ({ as?: "button"; href?: never } & React.ButtonHTMLAttributes<HTMLButtonElement>)
  | ({ as: "a"; href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>);

export function Button({ as = "button", className = "", children, ...rest }: Props) {
  const classes = `btn btn--sm ${className}`.trim();

  if (as === "a") {
    const { href, ...anchorProps } = rest as React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
    return (
      <Link href={href} className={classes} {...anchorProps}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
