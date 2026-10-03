import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · Deep Focus from Home" },
      {
        name: "description",
        content:
          "Privacy Policy for Deep Focus from Home and related jeffsebiz.com digital products from JEFFSEBIZ LLC.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalDoc kicker="Legal" title="Privacy Policy">
      <p>
        JEFFSEBIZ LLC (“we,” “us,” “Jeffsebiz”) runs Deep Focus from Home and
        related digital products. This page explains what information we collect
        and how we use it.
      </p>

      <h2>1. What we collect</h2>
      <p>Depending on how you use the site, we may collect:</p>
      <ul>
        <li>
          Contact details you give us (for example, email address when you opt in
          or buy)
        </li>
        <li>Order details (what you bought, amount paid, date)</li>
        <li>
          Payment information handled by our payment provider (we do not store
          full card numbers on our own servers)
        </li>
        <li>
          Messages you send us (for example, store-credit requests to
          jeffrey@jeffsebiz.com)
        </li>
        <li>
          Basic technical data such as browser type, device type, and pages
          visited (if our site or tools collect it)
        </li>
        <li>
          Visitor stats counted in total (pages viewed, the site you came from,
          country, device and browser type), when we turn on our hosting
          provider’s analytics tool. See section 4
        </li>
      </ul>
      <p>
        We do not intentionally collect sensitive health data. Our handbook is
        general work advice, not medical care.
      </p>

      <h2>2. How we use it</h2>
      <p>We use this information to:</p>
      <ul>
        <li>Deliver the handbook, fillables, app, or other products you buy</li>
        <li>Send the free newsletter or other messages you asked for</li>
        <li>Process payments and keep order records</li>
        <li>
          Apply store credit when you request it under our{" "}
          <Link to="/store-credit">Store Credit Policy</Link>
        </li>
        <li>
          See how the site is used (visits and pages viewed) so we can improve it
          and fix problems
        </li>
        <li>Meet legal or tax requirements</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>3. Who else may see it</h2>
      <p>We may share information with:</p>
      <ul>
        <li>
          Payment processors that handle checkout (for example, Stripe)
        </li>
        <li>
          Hosting and site tools that run the website (for example, Vercel),
          including visitor stats described below
        </li>
        <li>
          Our email provider, Kit (kit.com), which stores signup addresses and
          sends the emails you asked for
        </li>
        <li>
          Service providers who help us run the business, under limits that
          protect your information
        </li>
        <li>Authorities when the law requires it</li>
      </ul>
      <p>We do not sell customer lists.</p>

      <h2>4. Cookies, visitor stats, and tracking</h2>
      <p>
        The site may use cookies or similar tools for basic function, security,
        and (if you later approve ads) measuring ads. You can control cookies in
        your browser. We do not currently run Meta or Google advertising pixels.
        If we turn on advertising pixels later, we will update this page before
        that goes live.
      </p>
      <p>
        <strong>Visitor stats (Vercel Analytics).</strong> When turned on, we use
        Vercel Web Analytics to count visits and see which pages are viewed, the
        site you came from, your country, and your device and browser type. It
        doesn’t use cookies, and we only see totals, not individual people. To
        count unique visits, Vercel uses a short-lived, non-reversible code made
        from your connection details, which it discards within about a day.
        Vercel provides these stats as our service provider.
      </p>

      <h2>5. Email signup</h2>
      <p>
        When you sign up for the free 7-day pack, we collect the first name and
        email address you submit and the date and time you signed up. We use it
        to send the free 7-day pack emails you asked for, launch news, and
        occasional notes about our products. We don’t sell or rent the list.
        Our email provider, Kit (kit.com), stores your address and sends these
        messages for us. Every email has an unsubscribe link, or you can email
        jeffrey@jeffsebiz.com to be removed; we’ll stop within 10 business days.
        Our emails may use standard open and click tracking to help us improve
        them. We don’t add buyers to this list unless they sign up themselves.
      </p>

      <h2>6. App data on your device</h2>
      <p>
        The Deep Focus from Home web app may store notes, focus or energy logs,
        and similar entries on your own device or browser (local storage). That
        information stays on your device unless you choose to share it with us
        (for example, by emailing us). We do not pull those local notes onto our
        servers as part of normal app use. If you clear your browser data or
        switch devices, those entries may be lost, and we can’t recover them.
      </p>

      <h2>7. How long we keep it</h2>
      <p>
        We keep order and account records as long as needed for the product,
        store credit (up to 12 months from purchase, plus a reasonable record
        period), taxes, and legal duties. You can ask us to delete marketing
        contacts; we may keep what the law requires. Email signup addresses are
        kept until you unsubscribe or ask us to remove them.
      </p>

      <h2>8. Your choices</h2>
      <p>You can:</p>
      <ul>
        <li>
          Unsubscribe from marketing email using the link in those emails
        </li>
        <li>
          Email us to ask what information we have about you, or to correct or
          delete it where the law allows
        </li>
        <li>
          Request store credit under the{" "}
          <Link to="/store-credit">Store Credit Policy</Link> (that is a purchase
          policy, not a privacy right)
        </li>
      </ul>

      <h2>9. Children</h2>
      <p>
        Our products are for adults and working professionals. We do not
        knowingly collect information from children under 13.
      </p>

      <h2>10. Security</h2>
      <p>
        We take reasonable steps to protect information, but no online system is
        perfectly secure.
      </p>

      <h2>11. Changes</h2>
      <p>
        If we change this policy in a material way, we will update the effective
        date on this page.
      </p>

      <h2>12. Contact</h2>
      <p>
        JEFFSEBIZ LLC
        <br />
        10 Holly Hill Drive
        <br />
        Alton, IL 62002-5224
        <br />
        Email: jeffrey@jeffsebiz.com
      </p>
    </LegalDoc>
  );
}
