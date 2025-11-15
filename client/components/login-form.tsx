'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export const LoginForm = () => {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    return (
        <div className="flex flex-col gap-6 justify-center items-center">
            <div className="flex flex-col items-center justify-center space-y-4">
                <Image src={"/login.svg"} alt="Login" height={500} width={500}/>
                <h1 className="text-6xl font-extrabold text-indigo-400">Welcome Back! to Cheetah CLI</h1>
                <p className="text-base font-medium text-zinc-400">Login to your account for allowing device flow</p>

                <Card className="border-dashed border-2">
                    <CardContent>
                        <div className="grid gap-6">
                            <div className="flex flex-col gap-4">
                                {error && (
                                    <div className="text-red-500 text-sm">{error}</div>
                                )}
                                <Button
                                    variant={"outline"}
                                    className="w-full h-full"
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            await authClient.signIn.social({
                                                provider: "github",
                                                callbackURL: process.env.NEXT_PUBLIC_APP_URL,
                                            })
                                        } catch (err) {
                                            setError('Something went wrong. Please try again!')
                                            console.error(err)
                                        }
                                    }}
                                >
                                    <Image src={"/github.svg"} alt="Github" height={16} width={16} className="size-4 dark:invert" />
                                    Continue With GitHub
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}