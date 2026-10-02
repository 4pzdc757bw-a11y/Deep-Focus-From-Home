import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service · Deep Focus from Home" },
      {
        name: "description",
        content:
          "Terms of Service / Terms of Sale for jeffsebiz.com digital products from JEFFSEBIZ LLC.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalDoc kicker="Legal" title="Terms of Service / Terms of Sale">
      <p>
        These Terms cover your use of jeffsebiz.com and purchases of digital
        products from JEFFSEBIZ LLC (“we,” “us,” “Jeffsebiz”), including Deep
        Focus From Home and related offers. By buying or using our products, you
        agree to these Terms.
      </p>

      <h2>1. Who we are</h2>
      <p>
        JEFFSEBIZ LLC is an Illinois limited liability company. Contact:
        jeffrey@jeffsebiz.com · 10 Holly Hill Drive, Alton, IL
        62002-5224.
      </p>

      <h2>2. What we sell</h2>
      <p>
        We sell digital products through jeffsebiz.com. That may include
        handbooks and other PDFs, fillable worksheets, web apps and related
        tools, email newsletters people opt into, and other digital downloads we
        offer from time to time.
      </p>
      <p>
        We do not list every product and price in these Terms, because the
        catalog can grow. The checkout page for your order controls the exact
        product, what’s included, and the price you pay for that purchase.
      </p>
      <p>
        If we later sell something that is not a digital download (for example a
        subscription or a physical product), or we change how refunds work for a
        product, we will update these Terms or that product’s checkout terms
        before that sale goes live.
      </p>

      <h2>3. Deep Focus From Home app</h2>
      <p>
        When you buy the Deep Focus From Home app at the price shown at checkout,
        you get access to the browser-based web app, including tools such as the
        Daily OS, focus bells, and energy log, plus any handbook downloads listed
        on the checkout and thank-you pages for your purchase.
      </p>
      <p>
        You receive a personal license to use the app for yourself. You do not
        own the app’s code, design, or brand. You may not redistribute, resell,
        share paid access, or claim the app as your own product. Section 5
        (License) also applies. Keep your access link or code private; it’s for
        your use only.
      </p>
      <p>
        The app runs in current phone and computer web browsers; there is
        nothing to download or install. We work to keep it running, but
        we can’t promise it will work on every device or browser, or that every
        feature will stay the same.
      </p>
      <p>
        Notes, focus or energy logs, and similar entries you make in the app are
        typically stored on your own device or browser. We do not collect those
        local notes on our servers as part of normal app use. Order and account
        details from checkout are handled as described in our{" "}
        <Link to="/privacy">Privacy Policy</Link>.
      </p>
      <p>
        If we discontinue the app, we’ll try to give at least 30 days’ notice by
        email. If that happens within 12 months of your purchase, you can ask for
        store credit under section 8. For delivery problems, missing files, or
        duplicate charges, email jeffrey@jeffsebiz.com. We reply within 3
        business days, fix delivery problems, and refund duplicate charges. Other
        requests are handled under section 8 and our{" "}
        <Link to="/store-credit">Store Credit Policy</Link>. The app and
        handbook share practical work habits for general information. As in
        section 6, we do not promise income, medical outcomes, or specific
        productivity results.
      </p>

      <h2>4. Digital delivery — no physical shipping</h2>
      <p>
        Products are digital. After payment, we deliver by download link, email,
        or in-app access. You are responsible for providing a working email
        address and for keeping your downloads safe.
      </p>

      <h2>5. License (what you may do)</h2>
      <p>
        When you buy, you get a personal license to use the product for yourself.
        You may not:
      </p>
      <ul>
        <li>
          Resell, share password access, or redistribute the files as your own
          product
        </li>
        <li>Claim our content as yours</li>
        <li>Use the materials to build a competing paid product</li>
      </ul>
      <p>We keep ownership of the content, trademarks, and brand.</p>

      <h2>6. Results and health — important</h2>
      <p>
        Our handbooks and related materials share practical work habits for
        general information. They are not medical, mental-health, legal, or
        professional advice, and they are not a treatment for ADHD, sleep
        problems, eye strain, or any other condition. Results vary. We do not
        promise income, promotions, or specific productivity outcomes. If you
        have pain, health concerns, or persistent concentration problems, talk
        with a qualified professional.
      </p>

      <h2>7. Payments</h2>
      <p>
        Payment is processed by our payment provider. By completing checkout, you
        authorize the charge for the items you selected. Taxes may apply where
        required.
      </p>

      <h2>8. Refunds and store credit</h2>
      <p>
        We do not offer automatic cash refunds on digital downloads or digital
        access. If something went wrong with your order (for example you never
        received the files, a file will not open, or you were charged twice),
        email jeffrey@jeffsebiz.com and explain the problem. We review each
        request and may offer store credit, replace or fix a file, or in rare
        cases a refund. When we grant store credit, it equals what you paid
        (unless we say otherwise), can be used toward any Jeffsebiz product, and
        is good for 12 months from the purchase date. Full details:{" "}
        <Link to="/store-credit">Store Credit / Digital Purchase Policy</Link>.
      </p>

      <h2>9. Acceptable use</h2>
      <p>
        Do not misuse the site (for example, hacking, scraping in a harmful way,
        or using false payment information). We may refuse or cancel an order if
        we believe there is fraud or abuse.
      </p>

      <h2>10. Availability</h2>
      <p>
        We aim to keep the site and downloads working, but we do not guarantee
        uninterrupted access. Temporary outages can happen.
      </p>

      <h2>11. Limitation of liability</h2>
      <p>
        To the fullest extent allowed by Illinois and applicable U.S. law,
        Jeffsebiz is not liable for indirect, incidental, or consequential
        damages arising from your use of the site or products. Our total
        liability for a purchase is limited to the amount you paid us for that
        purchase. Some states do not allow certain limits; in those places, our
        liability is limited as far as the law allows.
      </p>

      <h2>12. Indemnity</h2>
      <p>
        You agree to cover Jeffsebiz for losses that come from your misuse of the
        products or your violation of these Terms, to the extent allowed by law.
      </p>

      <h2>13. Governing law</h2>
      <p>
        These Terms are governed by the laws of the State of Illinois, without
        regard to conflict-of-law rules. Disputes will be handled in courts
        located in Illinois, unless the law requires otherwise.
      </p>

      <h2>14. Changes</h2>
      <p>
        We may update these Terms. The effective date at the top will change when
        we do. Continued use after an update means you accept the revised Terms
        for future use and purchases.
      </p>

      <h2>15. Contact</h2>
      <p>Questions about these Terms: jeffrey@jeffsebiz.com</p>
    </LegalDoc>
  );
}
