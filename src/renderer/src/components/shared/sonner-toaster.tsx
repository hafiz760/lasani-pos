"use client";

import { Toaster as Sonner } from "sonner";

export function SonnerToaster() {
    return (
        <Sonner
            theme="dark"
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast:
                        "group toast group-[.toaster]:bg-[#1a1a1a] group-[.toaster]:text-white group-[.toaster]:border-[#333] group-[.toaster]:shadow-lg",
                    description: "group-[.toast]:text-gray-400",
                    actionButton:
                        "group-[.toast]:bg-[#4ade80] group-[.toast]:text-black",
                    cancelButton:
                        "group-[.toast]:bg-[#1a1a1a] group-[.toast]:text-gray-400",
                },
            }}
        />
    );
}
