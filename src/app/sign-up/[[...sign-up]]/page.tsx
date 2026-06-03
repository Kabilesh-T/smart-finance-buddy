import { SignUp } from "@clerk/nextjs";
import { Wallet } from "lucide-react";

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-background">
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-8 h-8 rounded-md bg-primary/15 flex items-center justify-center">
          <Wallet className="w-4 h-4 text-primary" />
        </div>
        <span className="font-semibold tracking-tight">Finance Buddy</span>
      </div>
      <SignUp />
    </main>
  );
}
