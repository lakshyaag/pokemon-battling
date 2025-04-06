import { TooltipProvider } from "@/components/ui/tooltip";
import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "./components/SocketProvider";
import { Toaster } from "sonner";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Pokemon Battling",
	description: "A simple app to battle Pokemon",
	authors: {
		name: "Lakshya Agarwal",
		url: "https://github.com/lakshyaag",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<SocketProvider>
					<TooltipProvider>
						{children}
						<Toaster richColors position="bottom-center" />
						<Analytics />
					</TooltipProvider>
				</SocketProvider>
			</body>
		</html>
	);
}
