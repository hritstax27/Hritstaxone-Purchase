"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ScanLine,
  BookOpen,
  CreditCard,
  Landmark,
  Shield,
  Clock,
  Target,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Zap,
  Eye,
  FileText,
  Tag,
  Send,
  Banknote,
} from "lucide-react";

const features = [
  {
    icon: ScanLine,
    title: "Scan Invoice",
    description:
      "Click a picture or upload an image of your invoice. Our advanced OCR technology will scan and extract key information from your invoices.",
    bullets: [
      "Easy to setup",
      "Automated data capture",
      "Boosts productivity by saving time and minimizing errors",
    ],
  },
  {
    icon: BookOpen,
    title: "Update in Tally",
    description:
      "Update invoices and transaction data into your Tally software with the least manual intervention.",
    bullets: [
      "No manual intervention required",
      "Auto update purchase data directly in Tally",
      "Keeps your records up-to-date",
    ],
  },
  {
    icon: CreditCard,
    title: "Vendor Payout",
    description:
      "Seamless vendor payout process that replaces time-consuming traditional manual methods.",
    bullets: [
      "Pay your vendors on time, every time",
      "Pay utility bills hassle-free",
      "Secure payment method",
    ],
  },
  {
    icon: Landmark,
    title: "Overdraft Facility",
    description:
      "Address your sudden need for cash with the overdraft facility. Ideal for handling sudden expenses.",
    bullets: [
      "Pay interest on the amount you utilize",
      "Flexible auto-renewal",
      "Collateral free",
    ],
  },
];

const processSteps = [
  { icon: ScanLine, text: "Scan your purchase invoice" },
  { icon: Eye, text: "The machine auto-extracts invoice details" },
  { icon: FileText, text: "Review and save the extracted details" },
  { icon: Tag, text: "Tag items/suppliers for easy categorization" },
  { icon: Send, text: "Push data to Tally/Accounting Software" },
  { icon: Banknote, text: "Make vendor or utility bill payouts" },
];

const industries = [
  "Manufacturing",
  "Construction",
  "Transport & Logistics",
  "Clothing Shops",
  "Dealers & Distributors",
  "Electronics",
  "Pharmacy",
];

const faqs = [
  {
    q: "How does HritsTaxOne Purchase save time and reduce errors?",
    a: "Recording the entire purchase invoice takes time and is prone to human errors. HritsTaxOne Purchase digitizes the scanned purchase invoices, extracts the data and shows them in a structured manner. Allows the user to edit and save the details appropriately, saving time and reducing manual data entry errors.",
  },
  {
    q: "What types of invoices can it process?",
    a: "It can process printed invoices, handwritten invoices, and receipts. Such invoices can be single-page or multi-page. Even a PDF file containing invoices from multiple suppliers can also be processed effortlessly.",
  },
  {
    q: "Do I need any special hardware or software?",
    a: "No, you don't need any special hardware. This is a cloud-based solution. Users can scan and upload invoices using the web app which can be reviewed on the dashboard.",
  },
  {
    q: "Can the software handle multiple outlets or franchises?",
    a: "Yes, if you have multiple outlets, the software can centralize operations by syncing data across all locations, allowing you to monitor each outlet.",
  },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                HritsTaxOne <span className="text-primary-600">Purchase</span>
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-gray-600 hover:text-primary-600 transition font-medium"
              >
                Features
              </a>
              <a
                href="#process"
                className="text-gray-600 hover:text-primary-600 transition font-medium"
              >
                How it Works
              </a>
              <a
                href="#pricing"
                className="text-gray-600 hover:text-primary-600 transition font-medium"
              >
                Pricing
              </a>
              <a
                href="#faq"
                className="text-gray-600 hover:text-primary-600 transition font-medium"
              >
                FAQ
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-gray-700 hover:text-primary-600 font-medium transition"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="btn-primary text-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2230%22%20height%3D%2230%22%20viewBox%3D%220%200%2030%2030%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M1.22676%200C1.91374%200%202.45351%200.539773%202.45351%201.22676C2.45351%201.91374%201.91374%202.45351%201.22676%202.45351C0.539773%202.45351%200%201.91374%200%201.22676C0%200.539773%200.539773%200%201.22676%200Z%22%20fill%3D%22rgba(255%2C255%2C255%2C0.07)%22%2F%3E%3C%2Fsvg%3E')] opacity-40" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-1.5 mb-6">
              <Zap className="w-4 h-4 text-blue-300" />
              <span className="text-blue-200 text-sm font-medium">
                AI-Powered Invoice Processing
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
              Empowering Your Accountant Through{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                Tally Automation
              </span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100/80 mb-8 max-w-2xl mx-auto">
              Instant Tally updates, effortless bank reconciliation, and live
              stock tracking - all in real time
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-white text-blue-900 font-bold py-3.5 px-8 rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-semibold py-3.5 px-8 rounded-xl hover:bg-white/10 transition-all"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights / Features */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-primary-600 font-semibold mb-2 tracking-wide uppercase text-sm">
              Highlights
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Digitize Invoices, Update Inventory,{" "}
              <br className="hidden md:block" />
              Manage Payables
            </h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">
              Strengthen purchase decisions & optimize account payables.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="card p-8 hover:border-primary-200 group"
              >
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-600 transition-colors duration-300">
                    <feature.icon className="w-7 h-7 text-primary-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-500 mb-4">{feature.description}</p>
                    <ul className="space-y-2">
                      {feature.bullets.map((b, j) => (
                        <li key={j} className="flex items-center gap-2 text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="py-16 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900">
            Building for the Success of
          </h2>
        </div>
        <div className="relative">
          <div className="flex animate-scroll-left whitespace-nowrap">
            {[...industries, ...industries, ...industries].map((ind, i) => (
              <div
                key={i}
                className="inline-flex items-center px-6 py-3 mx-3 bg-gray-100 rounded-full text-gray-700 font-medium text-sm whitespace-nowrap"
              >
                {ind}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-primary-600 font-semibold mb-2 tracking-wide uppercase text-sm">
              Features
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Secure - Simple - Efficient
            </h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">
              Simple tool that enables small and medium businesses to manage account payables efficiently
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Target,
                title: "Accurate",
                desc: "AI-powered invoice digitization that eliminates manual data entry errors.",
              },
              {
                icon: Clock,
                title: "Reduced Time & Efforts",
                desc: "Save data entry time and minimize manual errors when recording purchases.",
              },
              {
                icon: Landmark,
                title: "Utilise Your Credit",
                desc: "Enjoy financial flexibility with an overdraft account facility.",
              },
              {
                icon: BarChart3,
                title: "Track Stock & FCR",
                desc: "Track inventory and fulfillment completion rates effortlessly.",
              },
            ].map((f, i) => (
              <div key={i} className="card p-6 text-center hover:border-primary-200">
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
                  <f.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section id="process" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-primary-600 font-semibold mb-2 tracking-wide uppercase text-sm">
              Process
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              How does it work?
            </h2>
            <p className="text-gray-500 mt-4">
              Digitize your invoices using these simple steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {processSteps.map((step, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-5 rounded-xl bg-gray-50 border border-gray-100"
              >
                <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {i + 1}
                </div>
                <span className="text-gray-700 font-medium text-sm">
                  {step.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-gradient-to-br from-primary-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why choose us?
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: "24x7", sub: "Support" },
              { label: "100%", sub: "Accuracy" },
              { label: "Continuously", sub: "Evolving" },
              { label: "Powered by", sub: "In-house AI Models" },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-extrabold mb-2">
                  {item.label}
                </div>
                <div className="text-blue-200 font-medium">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-primary-600 font-semibold mb-2 tracking-wide uppercase text-sm">
              Pricing
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Powerful AI agent, priced right
            </h2>
            <p className="text-gray-500 mt-4">
              Save time and make better decisions
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="card p-8 border-2 border-primary-200">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Basic Plan
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                Simplify accounting for up to 10 Companies. Digitize invoices &
                track expenses with smart invoice processing.
              </p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-gray-900">
                  ₹6,000
                </span>
                <span className="text-gray-500"> /- Per year</span>
              </div>
              <p className="text-xs text-gray-400 mb-6">*excl. GST</p>
              <Link
                href="/register"
                className="btn-primary w-full block text-center"
              >
                Get Started
              </Link>
            </div>
            <div className="card p-8 border-2 border-orange-300 relative">
              <div className="absolute -top-3 right-6 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                Best Plan
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Advanced Plan
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                Managing 10+ businesses? Contact us now for seamless accounting
                solutions.
              </p>
              <div className="mb-6">
                <span className="text-2xl font-bold text-gray-900">
                  Custom Quote
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-6">*excl. GST</p>
              <Link
                href="/register"
                className="btn-primary w-full block text-center bg-orange-500 hover:bg-orange-600"
              >
                Get Custom Quote
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-primary-600 font-semibold mb-2 tracking-wide uppercase text-sm">
              FAQs
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Have a question?
            </h2>
            <p className="text-gray-500 mt-4">
              For more queries, feel free to reach us.
            </p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="card overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between p-5 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold text-gray-900 pr-4">
                    {faq.q}
                  </span>
                  {openFaq === i ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-gray-500 text-sm leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-blue-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Implement HritsTaxOne Purchase and see the difference
          </h2>
          <p className="text-blue-200 mb-8">
            Have a query? We&apos;d be happy to answer any questions you might have.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-blue-900 font-bold py-3.5 px-8 rounded-xl hover:bg-blue-50 transition-all shadow-lg"
          >
            Get Started Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-gray-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">
                  HritsTaxOne Purchase
                </span>
              </div>
              <p className="text-sm">
                Complete Accounts Payables Software for small and medium businesses.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#process" className="hover:text-white transition">How it Works</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#faq" className="hover:text-white transition">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Contact Us</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>(+91) 6358871186</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>getpurchase@petpooja.com</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <span>Ahmedabad, Gujarat - 380015</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 text-center text-xs">
            <p>COPYRIGHT &copy; {new Date().getFullYear()} - HritsTaxOne Purchase</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
