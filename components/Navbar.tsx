'use client'
import React from 'react'
import Link from "next/link";
import Image from "next/image";
import {usePathname} from "next/navigation";
import {cn} from "@/lib/utils";
import {SignedIn, SignedOut, SignInButton, UserButton, useUser} from "@clerk/nextjs";

const navItems = [
  { label: "Library", href: "/"},
  { label: "Add New", href: "/books/new"},
]

const Navbar = () => {
  const pathName = usePathname();
  const { user } = useUser();

  return (
    <header className="w-full fixed z-50 bg-(--bg-primary)">
      <div className="wrapper navbar-height py-4 flex justify-between items-center">
        <Link href="/" className="flex gap-2 items-center text-primary">
          <Image src="/assets/logo.svg" alt="Dialogra Logo" width={32} height={32} className="w-8 h-8" />
          <div className="logo-text">Dialogra</div>
        </Link>

        <nav className="w-fit flex gap-7 5 items-center">
          {navItems.map(({label, href}) => {
            const isActive = pathName === href || (href != "/" && pathName.startsWith(href));

            return (
              <Link href={href} key={label} className={cn('nav-link-base', isActive ? 'nav-link-active' : 'text-black hover:opacity-70')}>
                {label}
              </Link>
            )
          })}
          <div className="flex gap-7.5 items-center">
            <SignedOut>
              <div className="nav-btn">
                <SignInButton mode="modal" />
              </div>
            </SignedOut>
            <SignedIn>
              <div className="nav-user-link">
                <UserButton afterSignOutUrl="/" />
                {user?.firstName && (
                  <Link href="/subscriptions" className="nav-user-name">
                    {user.firstName}
                  </Link>
                )}
              </div>
            </SignedIn>
          </div>
        </nav>
      </div>
    </header>
  )
}
export default Navbar
