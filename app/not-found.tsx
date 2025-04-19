import Link from "next/link";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { FaGithub, FaInstagram } from "react-icons/fa6";

const links = [
  {
    name: "Documentation",
    href: "#",
    description: "Learn how to integrate our tools with your app.",
    icon: Icons.FileText,
  },
  {
    name: "API Reference",
    href: "#",
    description: "A complete API reference for our libraries.",
    icon: Icons.Database,
  },
  {
    name: "Guides",
    href: "#",
    description: "Installation guides that cover popular setups.",
    icon: Icons.File,
  },
  {
    name: "Blog",
    href: "#",
    description: "Read our latest news and articles.",
    icon: Icons.MessageSquare,
  },
];

const social = [
  {
    name: "X",
    href: "#",
    icon: Icons.XAI,
  },
  {
    name: "GitHub",
    href: "#",
    icon: FaGithub,
  },
  {
    name: "Instagram",
    href: "#",
    icon: FaInstagram,
  },
];

export default function NotFound() {
  return (
    <div className="bg-background">
      <main className="mx-auto w-full max-w-7xl px-6 pt-10 pb-16 sm:pb-24 lg:px-8">
        {/* Logo */}
        <div className="mx-auto flex justify-center">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
            <Icons.Bot className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>

        {/* Error message */}
        <div className="mx-auto mt-20 max-w-2xl text-center sm:mt-24">
          <p className="text-base font-semibold text-primary">404</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            This page does not exist
          </h1>
          <p className="mt-6 text-lg font-medium text-muted-foreground sm:text-xl">
            Sorry, we couldn&apos;t find the page you&apos;re looking for.
          </p>
        </div>

        {/* Links section */}
        <div className="mx-auto mt-16 flow-root max-w-lg sm:mt-20">
          <h2 className="sr-only">Popular pages</h2>
          <ul role="list" className="-mt-6 divide-y divide-border">
            {links.map((link, linkIdx) => (
              <li key={linkIdx} className="relative flex gap-x-6 py-6">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg shadow-sm ring-1 ring-border bg-background">
                  <link.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-auto">
                  <h3 className="text-sm font-semibold text-foreground">
                    <a href={link.href}>
                      <span className="absolute inset-0" aria-hidden="true" />
                      {link.name}
                    </a>
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {link.description}
                  </p>
                </div>
                <div className="flex-none self-center">
                  <Icons.ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex justify-center">
            <Button asChild variant="link" className="text-primary">
              <Link href="/">
                <Icons.ArrowLeft className="mr-2 h-4 w-4" />
                Back to home
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 sm:py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-8 px-6 sm:flex-row lg:px-8">
          <p className="text-sm text-muted-foreground">
            &copy; Your Company, Inc. All rights reserved.
          </p>
          <div className="hidden sm:block sm:h-7 sm:w-px sm:flex-none sm:bg-border" />
          <div className="flex gap-x-4">
            {social.map((item, itemIdx) => (
              <a
                key={itemIdx}
                href={item.href}
                className="text-muted-foreground hover:text-foreground"
              >
                <span className="sr-only">{item.name}</span>
                <item.icon className="h-6 w-6" />
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
