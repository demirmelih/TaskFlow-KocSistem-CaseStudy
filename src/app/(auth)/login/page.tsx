import { AuthForm } from "@/features/auth/components/auth-form";
import { signIn } from "@/features/auth/actions";

export default function LoginPage() {
  return (
    <>
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your TaskFlow account
        </p>
      </div>
      <AuthForm mode="login" action={signIn} />
    </>
  );
}
