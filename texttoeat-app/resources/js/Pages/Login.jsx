import { useForm } from '@inertiajs/react';
import { Button, Card, CardContent, CardHeader, Input } from '../components/ui';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <h1 className="text-center text-2xl font-bold text-slate-900 dark:text-slate-100">
                        Staff login
                    </h1>
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            post('/login');
                        }}
                        className="space-y-4"
                    >
                        <Input
                            id="email"
                            label="Email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            error={errors.email}
                            autoComplete="email"
                        />
                        <Input
                            id="password"
                            label="Password"
                            type="password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            error={errors.password}
                            autoComplete="current-password"
                        />
                        <div className="flex items-center gap-2">
                            <input
                                id="remember"
                                type="checkbox"
                                checked={data.remember}
                                onChange={(e) => setData('remember', e.target.checked)}
                                className="rounded border-slate-200 dark:border-slate-700"
                            />
                            <label
                                htmlFor="remember"
                                className="text-sm font-bold text-muted-foreground"
                            >
                                Remember me
                            </label>
                        </div>
                        <Button
                            type="submit"
                            disabled={processing}
                            variant="primary"
                            className="w-full"
                        >
                            {processing ? 'Signing in…' : 'Sign in'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
