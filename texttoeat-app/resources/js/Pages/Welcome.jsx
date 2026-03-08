import { Link, usePage } from '@inertiajs/react';
import AppLayout from '../Layouts/AppLayout';
import { MessageCircle, Smartphone, Star, Award, HeartHandshake, UtensilsCrossed, ChevronRight } from 'lucide-react';
import { AnimateOnScroll, StaggerScrollIn, TypewriterText } from '../components/ui';

export default function Welcome() {
    const { auth } = usePage().props;
    const isStaff = auth?.user != null;
    const isDeveloper = auth?.user?.role === 'admin' || auth?.user?.role === 'superadmin';

    return (
        <AppLayout>
            <div className="flex flex-col gap-16 md:gap-24 relative z-0 pb-12">
                {/* Background decorative blobs */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[400px] bg-primary-400/20 dark:bg-primary-500/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>
                <div className="absolute top-[30%] -right-32 w-80 h-80 bg-amber-400/20 dark:bg-amber-500/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>

                {/* Hero Section */}
                <section className="text-center space-y-8 pt-8 md:pt-16 animate-fade-in">
                    <div className="relative inline-block mx-auto">
                        <div className="absolute inset-0 bg-primary-500 blur-2xl opacity-30 dark:opacity-40 rounded-full animate-pulse-slow"></div>
                        <img
                            src="/images/lacasandile-logo.png"
                            alt="Lacasandile Eatery"
                            className="relative h-32 w-32 md:h-40 md:w-40 rounded-[2rem] object-cover shadow-2xl ring-4 ring-white/50 dark:ring-surface-800/50 backdrop-blur-sm"
                        />
                    </div>

                    <div className="space-y-6 max-w-4xl mx-auto px-4">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-100/80 dark:bg-surface-800/80 text-surface-900 dark:text-surface-100 text-sm font-semibold mb-2 ring-1 ring-surface-200 dark:ring-surface-700 backdrop-blur-md shadow-sm">
                            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                            <span>Established Since 2015</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-surface-900 dark:text-white leading-[1.1]">
                            Taste the Tradition.<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-amber-500 dark:from-primary-400 dark:to-amber-400 [text-shadow:0_1px_2px_rgb(0_0_0_/_0.12)] dark:[text-shadow:0_1px_2px_rgb(0_0_0_/_0.35)]">
                                Order with Ease.
                            </span>
                        </h1>
                        <p className="text-lg md:text-xl text-surface-600 dark:text-surface-400 max-w-2xl mx-auto leading-relaxed font-medium">
                            Lacasandile Eatery brings generation-tested recipes straight to your table. Experience authentic local flavors via SMS, Messenger, or our seamless web platform.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 px-4">
                        <Link
                            href="/menu"
                            className="group relative inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-8 py-4 text-base font-bold text-white transition-all hover:bg-primary-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-600/30 overflow-hidden w-full sm:w-auto"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform ease-out duration-300"></div>
                            <span className="relative flex items-center gap-3">
                                <i className="ph-fill ph-list text-xl"></i>
                                Browse today’s menu
                                <ChevronRight className="h-5 w-5 opacity-70 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </Link>
                        <Link
                            href="/track"
                            className="inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-surface-200 dark:border-surface-700 bg-white/50 dark:bg-surface-800/50 backdrop-blur-md px-8 py-4 text-base font-bold text-surface-800 dark:text-surface-200 transition-all hover:bg-surface-100 dark:hover:bg-surface-800 hover:-translate-y-1 hover:shadow-lg w-full sm:w-auto"
                        >
                            <i className="ph-fill ph-map-pin text-xl"></i>
                            Track your order
                        </Link>
                    </div>
                </section>

                {/* Legacy & Trust Section */}
                <StaggerScrollIn as="section" className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4 w-full">
                    <div className="scroll-in flex flex-col text-center p-8 rounded-3xl bg-surface-50/80 dark:bg-surface-800/40 border-2 border-surface-100 dark:border-surface-800 backdrop-blur-sm transition-all hover:-translate-y-1.5 hover:shadow-xl shadow-surface-200/50 dark:shadow-none group" style={{ '--stagger-index': 0 }}>
                        <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-amber-700 dark:from-amber-900/60 dark:to-amber-800/40 dark:text-amber-400 mb-6 shadow-inner group-hover:scale-110 transition-transform duration-300">
                            <Award className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold text-surface-900 dark:text-white mb-3">A Decade of Excellence</h3>
                        <p className="text-surface-600 dark:text-surface-400 font-medium leading-relaxed">
                            Serving the community with passion since 2015, prioritizing quality ingredients and authentic local recipes.
                        </p>
                    </div>
                    <div className="scroll-in flex flex-col text-center p-8 rounded-3xl bg-surface-50/80 dark:bg-surface-800/40 border-2 border-surface-100 dark:border-surface-800 backdrop-blur-sm transition-all hover:-translate-y-1.5 hover:shadow-xl shadow-surface-200/50 dark:shadow-none group relative" style={{ '--stagger-index': 1 }}>
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-3xl pointer-events-none"></div>
                        <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 dark:from-blue-900/60 dark:to-blue-800/40 dark:text-blue-400 mb-6 shadow-inner group-hover:scale-110 transition-transform duration-300">
                            <HeartHandshake className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold text-surface-900 dark:text-white mb-3">Proud Partner of LGU Tagudin</h3>
                        <p className="text-surface-600 dark:text-surface-400 font-medium leading-relaxed z-10">
                            Working hand-in-hand with local governance and farmers to build a sustainable and vibrant food ecosystem.
                        </p>
                    </div>
                    <div className="scroll-in flex flex-col text-center p-8 rounded-3xl bg-surface-50/80 dark:bg-surface-800/40 border-2 border-surface-100 dark:border-surface-800 backdrop-blur-sm transition-all hover:-translate-y-1.5 hover:shadow-xl shadow-surface-200/50 dark:shadow-none group" style={{ '--stagger-index': 2 }}>
                        <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-primary-700 dark:from-primary-900/60 dark:to-primary-800/40 dark:text-primary-400 mb-6 shadow-inner group-hover:scale-110 transition-transform duration-300">
                            <UtensilsCrossed className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold text-surface-900 dark:text-white mb-3">Seamless Experience</h3>
                        <p className="text-surface-600 dark:text-surface-400 font-medium leading-relaxed">
                            Whether you prefer texting, chatting, or clicking, our modern system ensures your food arrives hot & fresh.
                        </p>
                    </div>
                </StaggerScrollIn>

                {/* Quote / Testimonial */}
                <AnimateOnScroll as="section" className="relative max-w-4xl mx-auto w-full px-4 text-center py-12 md:py-20">
                    <Star className="h-10 w-10 text-amber-500 mx-auto mb-8 opacity-60 drop-shadow-sm" />
                    <div className="min-h-[140px] md:min-h-[120px] flex items-center justify-center">
                        <TypewriterText
                            text='"Rich flavors, fast delivery, and incredibly reliable. Lacasandile Eatery flawlessly blends our town’s historic taste with cutting-edge convenience!"'
                            className="text-3xl md:text-5xl font-bold text-surface-800 dark:text-surface-100 leading-tight md:leading-tight"
                            pauseMs={4000}
                        />
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-10">
                        <div className="h-px w-12 bg-surface-300 dark:bg-surface-700"></div>
                        <span className="font-bold text-primary-600 dark:text-primary-400 uppercase tracking-[0.2em] text-sm">Satisfied Customer</span>
                        <div className="h-px w-12 bg-surface-300 dark:bg-surface-700"></div>
                    </div>
                </AnimateOnScroll>

                {/* Messaging Channels */}
                <section className="max-w-5xl mx-auto w-full space-y-10 px-4 pt-4">
                    <AnimateOnScroll className="text-center space-y-4 max-w-2xl mx-auto">
                        <h2 className="text-3xl md:text-5xl font-extrabold text-surface-900 dark:text-white tracking-tight">
                            Smart Messaging Channels
                        </h2>
                        <p className="text-lg md:text-xl text-surface-600 dark:text-surface-400 font-medium">
                            Whether you prefer the speed of an intelligent chatbot or the warmth of a real human, our messaging platforms adapt to your needs instantly.
                        </p>
                    </AnimateOnScroll>

                    <StaggerScrollIn className="grid md:grid-cols-2 gap-6 md:gap-8">
                        {/* SMS Card */}
                        <a
                            href="tel:09608449912"
                            className="scroll-in group flex flex-col gap-6 rounded-[2rem] border-2 border-surface-100 dark:border-surface-800/80 bg-white/60 dark:bg-surface-800/30 backdrop-blur-md p-8 text-left transition-all duration-300 hover:bg-white dark:hover:bg-surface-800 hover:-translate-y-2 hover:shadow-2xl hover:shadow-surface-200/20 hover:border-surface-300 dark:hover:border-surface-600"
                            style={{ '--stagger-index': 0 }}
                        >
                            <div className="flex items-center justify-between">
                                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-surface-100 to-surface-200 border border-surface-200 dark:border-surface-700 dark:from-surface-800 dark:to-surface-900 text-surface-700 dark:text-surface-300 shadow-inner group-hover:scale-110 transition-transform group-hover:from-surface-200 group-hover:to-surface-300 group-hover:text-surface-800 dark:group-hover:from-surface-700 dark:group-hover:to-surface-600 dark:group-hover:text-surface-200">
                                    <MessageCircle className="h-8 w-8" />
                                </span>
                                <span className="text-xs font-bold uppercase tracking-widest text-surface-400 dark:text-surface-500 px-4 py-1.5 rounded-full bg-surface-100 dark:bg-surface-800 transition-colors group-hover:bg-surface-200 dark:group-hover:bg-surface-700 group-hover:text-surface-700 dark:group-hover:text-surface-300">
                                    Offline Mode
                                </span>
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-3xl font-extrabold text-surface-900 dark:text-white tracking-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">Text Us via SMS</h3>
                                <p className="text-lg text-surface-600 dark:text-surface-400 leading-relaxed font-medium">
                                    No internet? Experience seamless ordering through our automated SMS system, monitored by our staff for precise service. Just text <br />
                                    <span className="font-bold text-xl text-surface-900 dark:text-white mt-2 inline-block select-all group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">0960 844 9912</span>
                                </p>
                            </div>
                        </a>

                        {/* Messenger Card */}
                        <a
                            href="https://www.facebook.com/share/1DYD9tTvrZ/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="scroll-in group flex flex-col gap-6 rounded-[2rem] border-2 border-surface-100 dark:border-surface-800/80 bg-white/60 dark:bg-surface-800/30 backdrop-blur-md p-8 text-left transition-all duration-300 hover:bg-white dark:hover:bg-surface-800 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-200 dark:hover:border-blue-900/50"
                            style={{ '--stagger-index': 1 }}
                        >
                            <div className="flex items-center justify-between">
                                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-surface-100 to-surface-200 border border-surface-200 dark:border-surface-700 dark:from-surface-800 dark:to-surface-900 text-surface-700 dark:text-surface-300 shadow-inner group-hover:scale-110 transition-transform group-hover:from-blue-100 group-hover:to-blue-200 group-hover:text-blue-700 dark:group-hover:from-blue-900 dark:group-hover:to-blue-800 dark:group-hover:text-blue-400 text-[#0084FF] group-hover:text-[#0084FF]">
                                    <Smartphone className="h-8 w-8 text-[#0084FF]" />
                                </span>
                                <span className="text-xs font-bold uppercase tracking-widest text-surface-400 dark:text-surface-500 px-4 py-1.5 rounded-full bg-surface-100 dark:bg-surface-800 transition-colors group-hover:bg-blue-50 dark:group-hover:bg-blue-900/40 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                    {isDeveloper ? 'Online Mode' : 'Beta release'}
                                </span>
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-3xl font-extrabold text-surface-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-[#0084FF] transition-colors">Connect on Messenger</h3>
                                {isDeveloper && (
                                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg px-3 py-2 w-fit">
                                        Facebook Messenger integration is in developer mode currently.
                                    </p>
                                )}
                                {!isDeveloper && (
                                    <p className="text-xs font-medium text-surface-500 dark:text-surface-400">
                                        Beta release — we&apos;re still refining this channel.
                                    </p>
                                )}
                                <p className="text-lg text-surface-600 dark:text-surface-400 leading-relaxed font-medium">
                                    Engage with our rich interactive chatbot, or easily request to speak directly with our team members for personalized support.
                                </p>
                            </div>
                        </a>
                    </StaggerScrollIn>
                </section>

                {/* Footer block */}
                <AnimateOnScroll className="max-w-5xl mx-auto w-full pt-16 mt-8 flex flex-col items-center justify-center gap-8 border-t border-surface-200 dark:border-surface-800 px-4">
                    <div className="rounded-2xl border border-surface-200 bg-surface-100/50 px-8 py-5 text-center dark:border-surface-800 dark:bg-surface-900/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-surface-500 dark:text-surface-400 mb-2">
                            Academic Research Output
                        </p>
                        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-sm text-surface-600 dark:text-surface-400">
                            <div>
                                <span className="block text-[10px] uppercase tracking-wider text-surface-400 mb-0.5">Subject</span>
                                <span className="font-semibold text-surface-800 dark:text-surface-200">Research Methods</span>
                            </div>
                            <div className="hidden md:block w-px h-6 bg-surface-300 dark:bg-surface-700"></div>
                            <div>
                                <span className="block text-[10px] uppercase tracking-wider text-surface-400 mb-0.5">Researcher / Developer</span>
                                <span className="font-semibold text-surface-800 dark:text-surface-200">Christine M. Lopez</span>
                            </div>
                        </div>
                    </div>

                    <p className="text-sm font-medium text-surface-400 dark:text-surface-500">
                        &copy; {new Date().getFullYear()} Lacasandile Eatery.
                    </p>
                </AnimateOnScroll>
            </div>
        </AppLayout>
    );
}
