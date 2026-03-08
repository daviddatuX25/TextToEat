import { Link } from '@inertiajs/react';
import AppLayout from '../Layouts/AppLayout';
import {
    UtensilsCrossed, Database, Server, Smartphone,
    MessageSquare, Cpu, ShieldCheck, Zap,
    ArrowRight, Radio, SmartphoneNfc,
    Globe, ServerCog, Palette, BellRing, MessageCircle
} from 'lucide-react';
import { AnimateOnScroll, StaggerScrollIn } from '../components/ui';

export default function About() {
    return (
        <AppLayout>
            <article className="mx-auto max-w-5xl space-y-16 relative z-0 pb-16 pt-8">
                {/* Decorative background grids & glow */}
                <div className="absolute inset-x-0 top-0 h-[500px] w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none -z-10"></div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 dark:bg-primary-500/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
                <div className="absolute top-[40%] left-0 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>

                {/* Hero Header */}
                <header className="space-y-6 text-center max-w-3xl mx-auto px-4 animate-fade-in">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-primary-500 blur-2xl opacity-20 rounded-full animate-pulse-slow"></div>
                        <img
                            src="/images/lacasandile-logo.png"
                            alt="Lacasandile Eatery"
                            className="relative mx-auto h-24 w-24 rounded-2xl object-cover shadow-2xl ring-4 ring-white dark:ring-surface-800"
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-100 dark:bg-surface-800/50 text-surface-600 dark:text-surface-400 text-xs font-bold uppercase tracking-wider border border-surface-200 dark:border-surface-700 backdrop-blur-sm">
                            <Cpu className="h-3.5 w-3.5" />
                            <span>System Architecture Overview</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-surface-900 dark:text-white leading-tight">
                            Powering <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-amber-500 dark:from-primary-400 dark:to-amber-400">TextToEat</span>
                        </h1>
                        <p className="text-lg md:text-xl text-surface-600 dark:text-surface-400 font-medium">
                            An advanced hybrid ordering and kitchen management system built specifically for Lacasandile Eatery.
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 pt-6">
                        <Link href="/menu" className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-primary-500 hover:shadow-lg hover:-translate-y-0.5">
                            Browse Menu
                        </Link>
                        <Link href="/track" className="inline-flex items-center gap-2 rounded-xl border border-surface-200 bg-white/50 px-6 py-3 text-sm font-bold text-surface-700 transition-all hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-800/50 dark:text-surface-200 dark:hover:bg-surface-800 backdrop-blur-sm shadow-sm hover:shadow">
                            Track Order
                        </Link>
                    </div>
                </header>

                {/* What is TextToEat Section */}
                <StaggerScrollIn as="section" className="grid md:grid-cols-2 gap-8 px-4">
                    <div className="scroll-in space-y-6 p-8 rounded-3xl border border-surface-200/60 bg-white/60 dark:border-surface-800/60 dark:bg-surface-900/40 backdrop-blur-md shadow-xl shadow-surface-200/20 dark:shadow-none hover:border-primary-200 dark:hover:border-primary-900/50 transition-colors" style={{ '--stagger-index': 0 }}>
                        <div className="h-12 w-12 rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 flex items-center justify-center mb-6">
                            <Zap className="h-6 w-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-surface-900 dark:text-white">The Core Concept</h2>
                        <p className="text-surface-600 dark:text-surface-400 leading-relaxed font-medium">
                            TextToEat is a centralized, multi-channel order management system. It merges offline accessibility (SMS) and online convenience (Messenger, Web) into a single unified kitchen interface. No matter how a customer orders, the staff manages it all from one place.
                        </p>
                    </div>

                    <div className="scroll-in space-y-6 p-8 rounded-3xl border border-surface-200/60 bg-white/60 dark:border-surface-800/60 dark:bg-surface-900/40 backdrop-blur-md shadow-xl shadow-surface-200/20 dark:shadow-none hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors" style={{ '--stagger-index': 1 }}>
                        <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center mb-6">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-surface-900 dark:text-white">Research Context</h2>
                        <div className="space-y-3 text-sm text-surface-600 dark:text-surface-400 font-medium">
                            <p className="font-semibold text-surface-800 dark:text-surface-200">
                                Output: "An SMS and Facebook-Messenger Based Order Management System"
                            </p>
                            <p>
                                Developed using Rapid Application Development (RAD) methodology at ISPSC, College of Arts and Sciences. Designed to automate local eatery order flows and evaluate acceptance via System Usability Scale.
                            </p>
                            <div className="pt-4 border-t border-surface-200 dark:border-surface-800 flex items-center justify-between">
                                <span className="uppercase text-[10px] tracking-wider font-bold">Developer</span>
                                <span className="text-surface-900 dark:text-white font-semibold">Christine M. Lopez</span>
                            </div>
                        </div>
                    </div>
                </StaggerScrollIn>

                {/* Tech Stack Grid */}
                <section className="space-y-10 px-4">
                    <AnimateOnScroll className="text-center space-y-4 max-w-2xl mx-auto">
                        <h2 className="text-3xl font-extrabold text-surface-900 dark:text-white">Technology Stack</h2>
                        <p className="text-surface-600 dark:text-surface-400 font-medium">
                            Built with modern, scalable, and responsive web technologies.
                        </p>
                    </AnimateOnScroll>

                    <StaggerScrollIn className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { title: 'Laravel', role: 'Backend API & FSM Engine', icon: Server, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/10' },
                            { title: 'MySQL / PostgreSQL', role: 'Relational database (swappable via Eloquent)', icon: Database, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10' },
                            { title: 'React & Inertia', role: 'Dynamic Frontend', icon: Smartphone, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/10' },
                            { title: 'Tailwind CSS', role: 'Utility Styling', icon: Palette, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/10' },
                            { title: 'FCM (Firebase)', role: 'Push to Android SMS app (outbound delivery)', icon: BellRing, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/10' },
                            { title: 'FB Messenger', role: 'Messenger Platform / Graph API (chatbot channel)', icon: MessageCircle, color: 'text-[#0084FF]', bg: 'bg-blue-50 dark:bg-blue-900/10' },
                            { title: 'TextBee', role: 'Android SMS Gateway', icon: Radio, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/10' },
                        ].map((tech, i) => (
                            <div key={i} className="scroll-in flex flex-col items-center justify-center p-6 text-center rounded-2xl border border-surface-200/50 bg-white/50 dark:border-surface-800/50 dark:bg-surface-800/30 backdrop-blur-sm transition-transform hover:-translate-y-1" style={{ '--stagger-index': i }}>
                                <div className={`h-12 w-12 rounded-full ${tech.bg} flex items-center justify-center mb-4`}>
                                    <tech.icon className={`h-6 w-6 ${tech.color}`} />
                                </div>
                                <h3 className="font-bold text-surface-900 dark:text-white mb-1">{tech.title}</h3>
                                <p className="text-xs text-surface-500 dark:text-surface-400 font-medium">{tech.role}</p>
                            </div>
                        ))}
                    </StaggerScrollIn>
                </section>

                {/* Deployment and Hosting */}
                <AnimateOnScroll as="section" className="space-y-6 px-4">
                    <div className="flex flex-col md:flex-row gap-6 items-center p-8 rounded-3xl border border-surface-200/60 bg-surface-100/30 dark:border-surface-800/60 dark:bg-surface-900/40 backdrop-blur-md">
                        <div className="w-full md:w-1/3 space-y-2">
                            <h2 className="text-2xl font-bold text-surface-900 dark:text-white">Deployment & Hosting</h2>
                            <p className="text-surface-600 dark:text-surface-400 font-medium text-sm">
                                Live environments properly configured for zero-downtime operations.
                            </p>
                        </div>
                        <div className="w-full md:w-2/3 grid sm:grid-cols-2 gap-4">
                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-200 dark:border-surface-700">
                                <Globe className="h-8 w-8 text-indigo-500 mt-1" />
                                <div>
                                    <h4 className="font-bold text-surface-900 dark:text-white">Domain</h4>
                                    <p className="text-sm text-surface-500 font-medium">Purchased and securely managed via Hostinger.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-200 dark:border-surface-700">
                                <ServerCog className="h-8 w-8 text-primary-500 mt-1" />
                                <div>
                                    <h4 className="font-bold text-surface-900 dark:text-white">Hosting</h4>
                                    <p className="text-sm text-surface-500 font-medium">Deployed to Agila Hosting, expertly managed using the intuitive Hestia panel.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </AnimateOnScroll>

                {/* Flow Architecture Diagram (CSS Grid based) */}
                <AnimateOnScroll as="section" className="space-y-10 px-4 py-8 rounded-[2.5rem] bg-surface-900 dark:bg-black text-surface-50 overflow-hidden relative border border-surface-800 shadow-2xl">
                    {/* Glowing background in dark section */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[600px] bg-primary-900/20 blur-[120px] rounded-full pointer-events-none"></div>

                    <div className="relative text-center space-y-4 max-w-2xl mx-auto pt-6">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-white">System Architecture</h2>
                        <p className="text-surface-400 font-medium text-lg">
                            How customer channels (SMS, Messenger, Web) connect to one backend.
                        </p>
                    </div>

                    <div className="relative max-w-5xl mx-auto py-12 px-4">
                        <div className="grid lg:grid-cols-3 gap-8 relative z-10 lg:gap-12">
                            {/* Inputs Column */}
                            <div className="flex flex-col gap-6">
                                <h3 className="text-sm font-bold tracking-widest text-surface-500 uppercase text-center mb-2">1. Client Interaction</h3>

                                {/* SMS Path Input */}
                                <div className="flex items-center gap-4 bg-surface-800/80 border border-surface-700 p-4 rounded-2xl shadow-sm">
                                    <SmartphoneNfc className="h-8 w-8 text-primary-400 shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-white text-sm">Customer (via SMS)</h4>
                                        <p className="text-xs text-surface-400">Sends text to eatery number.</p>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-surface-600 ml-auto shrink-0" />
                                </div>

                                {/* Messenger Path Input */}
                                <div className="flex items-center gap-4 bg-surface-800/80 border border-surface-700 p-4 rounded-2xl shadow-sm">
                                    <MessageCircle className="h-8 w-8 text-[#0084FF] shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-white text-sm">Customer (Messenger)</h4>
                                        <p className="text-xs text-surface-400">Chats with Facebook Page.</p>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-surface-600 ml-auto shrink-0" />
                                </div>

                                {/* Web Path Input */}
                                <div className="flex items-center gap-4 bg-surface-800/80 border border-surface-700 p-4 rounded-2xl shadow-sm">
                                    <Globe className="h-8 w-8 text-cyan-400 shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-white text-sm">Customer (via Web)</h4>
                                        <p className="text-xs text-surface-400">Browses Inertia.js frontend.</p>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-surface-600 ml-auto shrink-0" />
                                </div>
                            </div>

                            {/* Gateways & Engine Column */}
                            <div className="flex flex-col gap-6">
                                <h3 className="text-sm font-bold tracking-widest text-surface-500 uppercase text-center mb-2">2. Processing Engine</h3>

                                <div className="relative flex-1 bg-surface-800/50 border border-emerald-900/50 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-[0_0_40px_rgba(16,185,129,0.05)]">
                                    <div className="absolute inset-0 bg-emerald-500/5 rounded-3xl"></div>
                                    <Server className="h-12 w-12 text-emerald-400 mb-4 relative z-10" />
                                    <h3 className="text-xl font-bold text-white mb-2 relative z-10">Laravel Backend</h3>
                                    <p className="text-sm text-surface-400 font-medium relative z-10">
                                        Webhooks receive traffic from TextBee app & Messenger Platform.
                                    </p>
                                    <p className="text-sm text-emerald-300 font-bold mt-2 pb-2 relative z-10">
                                        Powered by Shared FSM Logic
                                    </p>
                                </div>
                            </div>

                            {/* Outputs / Delivery Column */}
                            <div className="flex flex-col gap-6">
                                <h3 className="text-sm font-bold tracking-widest text-surface-500 uppercase text-center mb-2">3. Outbound Delivery</h3>

                                {/* SMS Path Output */}
                                <div className="flex items-center gap-4 bg-surface-800/80 border border-surface-700 p-4 rounded-2xl shadow-sm">
                                    <ArrowRight className="h-4 w-4 text-surface-600 shrink-0" />
                                    <BellRing className="h-8 w-8 text-amber-400 shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-white text-sm">Firebase / TextBee</h4>
                                        <p className="text-xs text-surface-400">Outbound SMS pushed to Android.</p>
                                    </div>
                                </div>

                                {/* Messenger Path Output */}
                                <div className="flex items-center gap-4 bg-surface-800/80 border border-surface-700 p-4 rounded-2xl shadow-sm">
                                    <ArrowRight className="h-4 w-4 text-surface-600 shrink-0" />
                                    <MessageSquare className="h-8 w-8 text-[#0084FF] shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-white text-sm">FB Graph API</h4>
                                        <p className="text-xs text-surface-400">Send API pushing rich replies.</p>
                                    </div>
                                </div>

                                {/* Web Path Output */}
                                <div className="flex items-center gap-4 bg-surface-800/80 border border-surface-700 p-4 rounded-2xl shadow-sm">
                                    <ArrowRight className="h-4 w-4 text-surface-600 shrink-0" />
                                    <Smartphone className="h-8 w-8 text-cyan-400 shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-white text-sm">React App Response</h4>
                                        <p className="text-xs text-surface-400">Direct HTTP JSON responses.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Explanation Node */}
                        <div className="mt-12 mx-auto max-w-2xl text-center bg-surface-800/50 border border-surface-700/50 rounded-2xl p-6 backdrop-blur-md">
                            <h4 className="font-bold text-white flex items-center justify-center gap-2 mb-2">
                                <MessageSquare className="h-4 w-4 text-primary-400" />
                                All Channels, Shared Chatbot Logic
                            </h4>
                            <p className="text-sm text-surface-400 font-medium">
                                Inbound: SMS (TextBee webhook), Messenger (Facebook webhook), Web (HTTP form/API). <br />
                                Outbound: FCM sends push commands back to TextBee to reply to SMS; Facebook Send API handles Messenger replies. The exact same core Finite State Machine (FSM) powers the conversational flow across all platforms.
                            </p>
                        </div>
                    </div>
                </AnimateOnScroll>

                {/* Simple Outro */}
                <AnimateOnScroll as="section" className="text-center space-y-4 border-t border-surface-200 dark:border-surface-800 pt-16 mt-8">
                    <UtensilsCrossed className="h-8 w-8 text-surface-300 dark:text-surface-600 mx-auto" />
                    <p className="text-surface-500 dark:text-surface-500 text-sm font-medium">
                        Focused on bridging local, traditional eateries with modern technical solutions.
                    </p>
                </AnimateOnScroll>

            </article>
        </AppLayout>
    );
}
