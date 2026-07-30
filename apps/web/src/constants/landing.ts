import {
  ChartColumnIncreasing,
  Box,
  ClipboardList,
  Handshake,
  Hand,
  IndianRupee,
  Leaf,
  QrCode,
  ScanLine,
  ShoppingCart,
  Star,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface NavLink {
  label: string
  href: string
}

export interface FeatureItem {
  icon: LucideIcon
  title: string
  /** Rendered as separate lines to preserve the two-line rhythm of the design. */
  lines: string[]
  accent?: 'navy' | 'orange'
}

export const NAV_LINKS: NavLink[] = [
  { label: 'Home',         href: '#home' },
  { label: 'Features',     href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Partner',      href: '#partner' },
  { label: 'Pricing',      href: '#pricing' },
  { label: 'Contact',      href: '#contact' },
]

/** The three quick-glance items sitting under the hero buttons. */
export const HERO_HIGHLIGHTS: { icon: LucideIcon; label: string }[] = [
  { icon: ScanLine,     label: 'Scan QR' },
  { icon: Box,          label: 'View in AR' },
  { icon: ShoppingCart, label: 'Order Easily' },
]

/** "What is DishDekho?" — the four-step product flow. */
export const HOW_IT_WORKS: FeatureItem[] = [
  {
    icon: QrCode,
    title: 'Scan QR',
    lines: ['Customers scan the QR', 'code on their table.'],
  },
  {
    icon: Box,
    title: 'Explore in AR',
    lines: ['View 3D models of dishes', 'in Augmented Reality.'],
  },
  {
    icon: ClipboardList,
    title: 'Digital Menu',
    lines: ['Browse full menu with details,', 'prices & offers.'],
  },
  {
    icon: ShoppingCart,
    title: 'Order & Enjoy',
    lines: ['Place order and enjoy', 'a seamless dining experience.'],
    accent: 'orange',
  },
]

/** "Why Choose DishDekho?" — five benefit columns. */
export const WHY_CHOOSE: FeatureItem[] = [
  {
    icon: Star,
    title: 'Enhance Customer\nExperience',
    lines: ['AR brings your food', 'to life.'],
  },
  {
    icon: Leaf,
    title: 'Paperless &\nEco-Friendly',
    lines: ['Go digital and', 'save environment.'],
  },
  {
    icon: ChartColumnIncreasing,
    title: 'Increase Orders',
    lines: ['Visual experience', 'leads to more orders.'],
  },
  {
    icon: Hand,
    title: 'Easy to Use',
    lines: ['Simple for both', 'customers and staff.'],
  },
  {
    icon: IndianRupee,
    title: 'Affordable &\nEffective',
    lines: ['Premium experience', 'at low cost.'],
  },
]

export const PARTNER_STEPS: FeatureItem[] = [
  {
    icon: Users,
    title: '1. Join as Partner',
    lines: ['Sign up and become', 'our official partner.'],
  },
  {
    icon: Handshake,
    title: '2. Refer Restaurant',
    lines: ['Connect restaurants', 'who need our service.'],
  },
  {
    icon: IndianRupee,
    title: '3. Earn Commission',
    lines: ['Earn commission on every', 'successful deal.'],
  },
]

export interface PricingFeature {
  label: string
  note?: string
}

export const PRICING = {
  name: 'DishDekho Pro',
  price: '₹999',
  period: '/month',
  featuresTitle: 'Everything Included',
  features: [
    { label: 'Digital Menu' },
    { label: '3 AR Dishes', note: '(Change Anytime)' },
    { label: 'Unlimited Menu Categories' },
    { label: 'Unlimited Menu Items' },
    { label: 'QR Code For Tables' },
    { label: 'Table Booking Management' },
    { label: 'Manage Photos' },
    { label: 'Update Menu Anytime' },
    { label: 'Restaurant Dashboard' },
    { label: 'Customer Support' },
  ] satisfies PricingFeature[],
  /** Shown beside the card on desktop — restates the three plan guarantees. */
  asideTitle: 'One plan. Everything included.',
  asideBody:
    'DishDekho Pro gives your restaurant the complete system — a digital menu, dishes your ' +
    'guests can explore in AR, QR codes for every table and a dashboard to manage it all.',
  assurances: [
    { label: 'No Setup Fee',      detail: 'Nothing to pay upfront.' },
    { label: 'Cancel Anytime',    detail: 'No lock-in — leave whenever you want.' },
    { label: 'No Hidden Charges', detail: '₹999/month is the full price.' },
  ],
} as const

export interface FaqItem {
  question: string
  answer: string
}

/** Rendered as two columns of five on desktop, one column on mobile. */
export const FAQS: FaqItem[] = [
  {
    question: 'What exactly is DishDekho?',
    answer:
      'DishDekho turns your restaurant menu into a digital, AR-powered experience. Guests scan a QR code at their table, browse the full menu on their phone and view selected dishes as 3D models before ordering.',
  },
  {
    question: 'Do my customers need to download an app?',
    answer:
      'No. Everything runs in the phone browser. Guests scan the QR code on the table and the menu opens straight away — nothing to install.',
  },
  {
    question: 'How much does it cost?',
    answer:
      'One plan at ₹999 per month. It includes the digital menu, 3 AR dishes, unlimited menu categories and items, QR codes for your tables and the restaurant dashboard. No setup fee and no hidden charges.',
  },
  {
    question: 'What does "3 AR Dishes" mean?',
    answer:
      'Three of your dishes are built as 3D models that guests can view in augmented reality. You can swap which dishes those are at any time from your dashboard.',
  },
  {
    question: 'How do I get the 3D models made?',
    answer:
      'You upload photos of the dish from a few angles in your dashboard, and our team turns them into the 3D model. You do not need any 3D software or technical skill.',
  },
  {
    question: 'Can I update my menu after it goes live?',
    answer:
      'Yes. Prices, dishes, categories and photos can all be edited from the dashboard, and the changes show up on your live menu right away.',
  },
  {
    question: 'How do the table QR codes work?',
    answer:
      'You get a QR code from your dashboard that you can print and place on your tables. Each scan opens your menu, and the dashboard tracks how many scans you receive.',
  },
  {
    question: 'Which phones support the AR view?',
    answer:
      'Most modern Android and iPhone devices support it. On phones that do not, the dish still opens as an interactive 3D preview, so no guest is left out.',
  },
  {
    question: 'Can I cancel whenever I want?',
    answer:
      'Yes. There is no lock-in period — you can cancel any time and you will not be charged again after that.',
  },
  {
    question: 'How does the partner programme work?',
    answer:
      'You sign up as a partner, refer restaurants that need an AR or digital menu, and earn a commission on every restaurant that successfully onboards. Get in touch and we will share the details.',
  },
]

export const CONTACT_DETAILS = {
  email: 'dishdekho72@gmail.com',
  address: 'Delhi, India',
} as const

export const FOOTER_COLUMNS: { title: string; links: NavLink[] }[] = [
  {
    title: 'Quick Links',
    links: [
      { label: 'Home',         href: '#home' },
      { label: 'Features',     href: '#features' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Partner',      href: '#partner' },
      { label: 'Pricing',      href: '#pricing' },
      { label: 'Contact',      href: '#contact' },
    ],
  },
  {
    title: 'For Restaurants',
    links: [
      { label: 'Our Service', href: '#how-it-works' },
      { label: 'Pricing',     href: '#pricing' },
      { label: 'FAQ',         href: '#faq' },
      { label: 'Support',     href: '#contact' },
    ],
  },
]
