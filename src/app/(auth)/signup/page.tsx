import { AuthForm } from "@/features/auth/components/auth-form";
import { signUp } from "@/features/auth/actions";

export default function SignupPage() {
  return (
    <>
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Start organizing work with TaskFlow
        </p>
      </div>
      <AuthForm mode="signup" action={signUp} />
    </>
  );
}
