import { LoginForm } from "./LoginForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Cut</h1>
          <p className="text-muted-foreground mt-2">Sign in to your account</p>
        </div>
        <LoginForm next={searchParams.next} />
      </div>
    </main>
  );
}
