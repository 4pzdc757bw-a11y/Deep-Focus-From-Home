import { createFileRoute } from "@tanstack/react-router";
import { FixItRule, LegalDoc } from "@/components/legal-doc";
import {
  BUSINESS_ADDRESS_LINES,
  BUSINESS_EMAIL,
  BUSINESS_NAME,
  STORE_CREDIT_CHECKOUT_LINE,
  STORE_CREDIT_LIMIT_ITEMS,
} from "@/lib/legal";

export const Route = createFileRoute("/store-credit")({
  head: () => ({
    meta: [
      { title: "Store Credit Policy · Deep Focus from Home" },
      {
        name: "description",
        content:
          "Store Credit and Digital Purchase Policy for digital products from JEFFSEBIZ LLC on deepfocusfromhome.com, jeffsebiz.com, and our other product sites from JEFFSEBIZ LLC.",
      },
    ],
  }),
  component: StoreCreditPage,
});

function StoreCreditPage() {
  return (
    <LegalDoc kicker="Legal" title="Store Credit Policy">
      <h2>The short version</h2>
      <p>
        Jeffsebiz digital products are delivered electronically. We do not offer
        automatic cash refunds on digital downloads or digital access.
      </p>
      <p>
        If something went wrong with your order, email support@deepfocusfromhome.com,
        explain what happened, and we will review it. Delivery problems and
        duplicate charges are always fixed (see below). Other requests are
        reviewed case by case: we may offer store credit, replace or fix a file,
        or in rare cases issue a refund.
      </p>

      <FixItRule />

      <h2>What this covers</h2>
      <p>
        This policy covers digital products sold by JEFFSEBIZ LLC on deepfocusfromhome.com, jeffsebiz.com, and our other product sites — handbooks, worksheets, web apps and related tools, and
        other digital downloads we offer from time to time. The checkout page for
        your order controls the exact product and price.
      </p>

      <h2>How to contact us</h2>
      <ol>
        <li>
          Email support@deepfocusfromhome.com from the address you used at checkout when
          you can.
        </li>
        <li>
          Tell us what you bought, the purchase date if you have it, and what the
          problem is (for example: you never received the download, a file will
          not open, you were charged twice).
        </li>
        <li>We review the message and reply with what we can do.</li>
      </ol>
      <p>
        We aim to reply within 3 business days (Monday to Friday, US Central
        time, excluding US holidays). Keep your order email handy.
      </p>

      <h2>If we grant store credit</h2>
      <p>When we approve store credit:</p>
      <ul>
        <li>
          Credit equals the purchase price you paid for that purchase (unless we
          say otherwise in writing).
        </li>
        <li>Credit can be used toward any jeffsebiz product.</li>
        <li>
          Credit is good for 12 months from the original purchase date.
        </li>
        {STORE_CREDIT_LIMIT_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>What we generally cannot do</h2>
      <ul>
        <li>Automatic cash refunds on digital downloads</li>
        <li>Cash-out of unused store credit</li>
        <li>Credit after a granted credit’s 12-month window expires</li>
      </ul>

      <h2>Checkout line</h2>
      <p>{STORE_CREDIT_CHECKOUT_LINE}</p>

      <h2>Contact</h2>
      <p>
        {BUSINESS_NAME}
        <br />
        {BUSINESS_ADDRESS_LINES[0]}
        <br />
        {BUSINESS_ADDRESS_LINES[1]}
        <br />
        Email: {BUSINESS_EMAIL}
      </p>
    </LegalDoc>
  );
}
