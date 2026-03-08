import { Link } from '@inertiajs/react';
import AppLayout from '../Layouts/AppLayout';
import { UtensilsCrossed, MessageCircle, Smartphone, Globe } from 'lucide-react';

export default function About() {
    return (
        <AppLayout>
            <article className="mx-auto max-w-2xl space-y-10 animate-fade-in">
                <header className="space-y-4 text-center">
                    <img
                        src="/images/lacasandile-logo.png"
                        alt="Lacasandile Eatery"
                        className="mx-auto h-20 w-20 rounded-2xl object-cover shadow-lg"
                    />
                    <h1 className="text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white md:text-4xl">
                        About TextToEat
                    </h1>
                    <p className="text-lg text-surface-600 dark:text-surface-400">
                        Order management for Lacasandile Eatery, Ilocos Sur
                    </p>
                </header>

                <section className="space-y-4 rounded-2xl border border-surface-200 bg-surface-50/50 p-6 dark:border-surface-800 dark:bg-surface-800/30">
                    <h2 className="text-xl font-bold text-surface-900 dark:text-white">
                        What is TextToEat?
                    </h2>
                    <p className="text-surface-600 dark:text-surface-400 leading-relaxed">
                        TextToEat is an order system built for Lacasandile Eatery. It uses a simple chatbot so customers can order via <strong>SMS</strong> or <strong>Facebook Messenger</strong>, and you can browse the menu and place orders on this website. All channels feed the same kitchen—orders are confirmed and fulfilled by staff from one place.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-surface-900 dark:text-white">
                        How to order
                    </h2>
                    <ul className="grid gap-4 sm:grid-cols-1">
                        <li className="flex gap-4 rounded-xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-800/50">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400">
                                <MessageCircle className="h-5 w-5" />
                            </span>
                            <div>
                                <span className="font-semibold text-surface-900 dark:text-white">SMS</span>
                                <p className="text-sm text-surface-600 dark:text-surface-400">
                                    Send a text to the eatery number; the chatbot will guide you through the menu and your order.
                                </p>
                            </div>
                        </li>
                        <li className="flex gap-4 rounded-xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-800/50">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400">
                                <Smartphone className="h-5 w-5" />
                            </span>
                            <div>
                                <span className="font-semibold text-surface-900 dark:text-white">Messenger</span>
                                <p className="text-sm text-surface-600 dark:text-surface-400">
                                    Message the eatery on Facebook Messenger and order through the same chatbot flow.
                                </p>
                            </div>
                        </li>
                        <li className="flex gap-4 rounded-xl border border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-800/50">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400">
                                <Globe className="h-5 w-5" />
                            </span>
                            <div>
                                <span className="font-semibold text-surface-900 dark:text-white">Web</span>
                                <p className="text-sm text-surface-600 dark:text-surface-400">
                                    Browse today’s menu on this site, add items to your cart, and checkout. You can also track your order here.
                                </p>
                            </div>
                        </li>
                    </ul>
                </section>

                <section className="flex flex-col items-center gap-4 rounded-2xl border border-surface-200 bg-surface-50/50 p-6 text-center dark:border-surface-800 dark:bg-surface-800/30">
                    <UtensilsCrossed className="h-10 w-10 text-primary-500" />
                    <h2 className="text-lg font-bold text-surface-900 dark:text-white">
                        Lacasandile Eatery
                    </h2>
                    <p className="max-w-md text-sm text-surface-600 dark:text-surface-400">
                        A local eatery in Ilocos Sur serving pre-cooked, turo-turo style meals. Orders are fulfilled from today’s available menu—simple, fast, and familiar.
                    </p>
                </section>

                <div className="flex flex-wrap justify-center gap-3 pt-4">
                    <Link
                        href="/menu"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                    >
                        Browse menu
                    </Link>
                    <Link
                        href="/track"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-surface-200 px-5 py-2.5 text-sm font-bold text-surface-700 transition-colors hover:bg-surface-100 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
                    >
                        Track order
                    </Link>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100"
                    >
                        Back to home
                    </Link>
                </div>
            </article>
        </AppLayout>
    );
}
