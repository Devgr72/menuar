import { CONTACT_DETAILS } from './landing'

export interface LegalBlock {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

export interface LegalDocument {
  title: string
  intro: string
  lastUpdated: string
  sections: LegalBlock[]
}

const LAST_UPDATED = 'May 2026'

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Privacy Policy',
  lastUpdated: LAST_UPDATED,
  intro:
    'DishDekho ("we", "us", "our") provides an AR menu and digital menu platform for restaurants. ' +
    'This policy explains what information we collect, why we collect it, and what choices you have. ' +
    'It applies to our website, the restaurant dashboard, and the menus your guests view after scanning a QR code.',
  sections: [
    {
      heading: '1. Who this policy covers',
      paragraphs: [
        'We deal with two groups of people, and we treat their information differently.',
      ],
      bullets: [
        'Restaurant owners and staff who create an account and manage a menu with us.',
        'Diners who scan a QR code to view a restaurant menu. Diners do not need an account and we do not ask them to sign in.',
      ],
    },
    {
      heading: '2. Information we collect',
      paragraphs: ['We collect only what we need to run the service.'],
      bullets: [
        'Account information: your name, email address, phone number and password, or your Google account details if you choose to sign in with Google.',
        'Restaurant information: your restaurant name, address, menu categories, dish names, descriptions, prices and any photos you upload.',
        'Dish photos and 3D models: the images you upload so we can build augmented reality models of your dishes.',
        'Payment information: your subscription status and billing history. Card and UPI details are handled by Razorpay, our payment provider — we never see or store them.',
        'Usage information: how many times your QR code was scanned and how often each dish was viewed, so we can show these numbers in your dashboard.',
        'Messages you send us: anything you submit through our contact form or newsletter box, including your name, email, phone number and message.',
        'Basic technical data: IP address and browser information, used to keep the service secure and to limit spam submissions.',
      ],
    },
    {
      heading: '3. How we use your information',
      bullets: [
        'To create and run your account and restaurant dashboard.',
        'To generate your QR codes and publish your digital and AR menu.',
        'To turn the photos you upload into 3D dish models.',
        'To process your subscription and send billing-related messages.',
        'To send you the verification code when you sign up, and to reply when you contact us.',
        'To show you scan and view statistics for your restaurant.',
        'To protect the service against abuse, spam and fraud.',
        'To send newsletters and product updates, but only if you have subscribed. You can opt out at any time.',
      ],
    },
    {
      heading: '4. Who we share information with',
      paragraphs: [
        'We do not sell your personal information, and we do not share it for advertising. We share information only with the service providers we need to operate, and only as far as necessary:',
      ],
      bullets: [
        'Razorpay — to take subscription payments and manage billing.',
        'MongoDB Atlas — the database where account and menu data is stored.',
        'Cloudflare R2 — where dish photos, 3D models and QR code images are stored.',
        'Google — only if you choose to sign in with your Google account.',
        'Our email provider — to deliver verification codes and service emails.',
        'Authorities or legal advisers, where we are required to by law.',
      ],
    },
    {
      heading: '5. Diner privacy',
      paragraphs: [
        'When a guest scans your QR code, we record that a scan happened and which dishes were viewed. ' +
          'This is counted in aggregate for your dashboard. We do not ask diners for their name, email or phone number, ' +
          'we do not build advertising profiles of them, and we do not track them across other websites.',
      ],
    },
    {
      heading: '6. How long we keep information',
      bullets: [
        'Account and restaurant data is kept while your account is active.',
        'If you cancel, we keep your data for a limited period so you can reactivate, after which it is deleted or anonymised.',
        'Billing records are kept for as long as tax and accounting law requires.',
        'Contact form messages are kept until they are resolved and archived.',
      ],
    },
    {
      heading: '7. Security',
      paragraphs: [
        'Traffic to DishDekho is encrypted in transit. Passwords are stored hashed, never in plain text. ' +
          'Access to production data is restricted to the people who need it to run the service. ' +
          'No system can be guaranteed completely secure, but we work to protect your information and will tell you ' +
          'without undue delay if a breach affects your data.',
      ],
    },
    {
      heading: '8. Your rights',
      paragraphs: [
        `You can ask us to give you a copy of your data, correct it, delete it, or stop using it for marketing. ` +
          `Write to ${CONTACT_DETAILS.email} and we will respond. Most account and menu details can also be changed ` +
          `directly from your dashboard at any time.`,
      ],
    },
    {
      heading: '9. Cookies and local storage',
      paragraphs: [
        'We use cookies and browser storage to keep you signed in and to remember basic preferences. ' +
          'We do not use advertising or third-party tracking cookies. Blocking these will sign you out and may stop ' +
          'parts of the dashboard from working.',
      ],
    },
    {
      heading: '10. Children',
      paragraphs: [
        'DishDekho is a business tool and is not directed at children. We do not knowingly collect personal ' +
          'information from anyone under 18. If you believe a child has given us their information, contact us and we will delete it.',
      ],
    },
    {
      heading: '11. Changes to this policy',
      paragraphs: [
        'We may update this policy as the service develops. The date at the top of this page shows when it was ' +
          'last changed. If a change materially affects you, we will notify you by email or in the dashboard.',
      ],
    },
    {
      heading: '12. Contact us',
      paragraphs: [
        `For any privacy question or request, email ${CONTACT_DETAILS.email}. We are based in ${CONTACT_DETAILS.address}.`,
      ],
    },
  ],
}

export const TERMS_AND_CONDITIONS: LegalDocument = {
  title: 'Terms & Conditions',
  lastUpdated: LAST_UPDATED,
  intro:
    'These terms govern your use of DishDekho. By creating an account or using the service, you agree to them. ' +
    'Please read them carefully — they set out what we provide, what we expect from you, and how billing works.',
  sections: [
    {
      heading: '1. The service',
      paragraphs: [
        'DishDekho gives restaurants a digital menu, augmented reality previews of selected dishes, QR codes for ' +
          'tables, and a dashboard to manage all of it. Guests scan the QR code and view your menu in their phone ' +
          'browser — no app installation is required.',
      ],
    },
    {
      heading: '2. Eligibility and your account',
      bullets: [
        'You must be at least 18 years old and able to enter into a contract.',
        'You must give accurate account information and keep it up to date.',
        'You are responsible for keeping your login credentials safe and for everything done through your account.',
        'You must verify your email address before your account becomes active.',
        'Tell us promptly if you believe your account has been accessed without your permission.',
      ],
    },
    {
      heading: '3. Subscription and pricing',
      bullets: [
        'DishDekho Pro costs ₹999 per month. There is no setup fee.',
        'The plan includes a digital menu, 3 AR dishes, unlimited menu categories and items, QR codes for your tables, table booking management, photo management and the restaurant dashboard.',
        'Payments are collected by Razorpay. Your subscription renews automatically each month until you cancel.',
        'Prices may change. We will give you notice before a change applies to your subscription, and you may cancel if you do not accept it.',
        'Applicable taxes are charged in addition where required by law.',
      ],
    },
    {
      heading: '4. Cancellation and refunds',
      bullets: [
        'You can cancel at any time. There is no lock-in period.',
        'Cancelling stops future charges. Your menu stays live until the end of the period you have already paid for.',
        'Payments already made are generally non-refundable, except where required by law or where we have failed to provide the service.',
        'If a payment fails and is not resolved, we may suspend your menu until billing is brought up to date.',
      ],
    },
    {
      heading: '5. Your content',
      paragraphs: [
        'Your menu, dish names, descriptions, prices and photos remain yours. By uploading them, you grant us the ' +
          'licence we need to host them, build 3D models from them, and display them to your guests through the ' +
          'service. You confirm you own this content or have permission to use it, and that it does not infringe ' +
          "anyone else's rights.",
      ],
    },
    {
      heading: '6. AR dish models',
      bullets: [
        'Your plan includes three dishes built as 3D models. You may change which dishes those are from your dashboard.',
        'You need to upload clear photos of each dish from several angles so the model can be produced.',
        'Model production takes time and depends on the quality of the photos you provide. We may ask you to re-upload photos that are unusable.',
        'AR viewing depends on your guest’s device and browser. Where AR is not supported, the dish is shown as an interactive 3D preview instead.',
      ],
    },
    {
      heading: '7. Acceptable use',
      paragraphs: ['You agree not to:'],
      bullets: [
        'Upload anything unlawful, misleading, offensive, or that infringes someone else’s rights.',
        'List prices or dish information you know to be false.',
        'Attempt to break into, overload, probe or disrupt the service or its infrastructure.',
        'Resell, sublicense or white-label DishDekho without a written agreement with us.',
        'Use the service to send spam or to collect data about other users.',
      ],
    },
    {
      heading: '8. Availability and support',
      paragraphs: [
        'We work to keep DishDekho available at all times, but we do not guarantee uninterrupted service. ' +
          'Maintenance, updates and issues at our providers can cause downtime. Customer support is included in ' +
          `your plan — reach us at ${CONTACT_DETAILS.email}.`,
      ],
    },
    {
      heading: '9. Our intellectual property',
      paragraphs: [
        'The DishDekho name, logo, software, designs and everything else we provide remain our property. ' +
          'Your subscription gives you the right to use the service, not to own or copy it.',
      ],
    },
    {
      heading: '10. Limitation of liability',
      paragraphs: [
        'The service is provided on an "as is" basis. To the fullest extent permitted by law, we are not liable ' +
          'for lost profits, lost revenue, lost data or indirect losses arising from your use of DishDekho. ' +
          'Where we are found liable, our total liability is limited to the subscription fees you paid us in the ' +
          'twelve months before the claim. Nothing here limits liability that cannot be limited by law.',
      ],
    },
    {
      heading: '11. Suspension and termination',
      paragraphs: [
        'You may stop using DishDekho and cancel at any time. We may suspend or close an account that breaches ' +
          'these terms, that is used unlawfully, or where payment remains unresolved. We will normally warn you first ' +
          'unless the breach is serious.',
      ],
    },
    {
      heading: '12. Changes to these terms',
      paragraphs: [
        'We may update these terms as the service develops. The date at the top of this page shows when they were ' +
          'last changed. Continuing to use DishDekho after a change means you accept the updated terms.',
      ],
    },
    {
      heading: '13. Governing law',
      paragraphs: [
        'These terms are governed by the laws of India, and the courts of Delhi have exclusive jurisdiction over ' +
          'any dispute arising from them.',
      ],
    },
    {
      heading: '14. Contact us',
      paragraphs: [
        `Questions about these terms? Email ${CONTACT_DETAILS.email}. We are based in ${CONTACT_DETAILS.address}.`,
      ],
    },
  ],
}
