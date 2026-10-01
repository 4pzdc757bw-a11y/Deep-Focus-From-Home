import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";
import { STORE_CREDIT_CHECKOUT_LINE } from "@/lib/legal";

export const Route = createFileRoute("/store-credit")({
  head: () => ({
    meta: [
      { title: "Store Credit Policy · Deep Focus from Home" },
      {
        name: "description",
        content:
          "Store Credit and Digital Purchase Policy for jeffsebiz.com digital products from JEFFSEBIZ LLC.",
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
        jeffsebiz digital products are delivered electronically. We do not offer
        automatic cash refunds on digital downloads or digital access.
      </p>
      <p>
        If something went wrong with your order, email jeffrey@jeffsebiz.com,
        explain what happened, and we will review it. Delivery problems and
        duplicate charges are always fixed (see below). Other requests are
        reviewed case by case: we may offer store credit, replace or fix a file,
        or in rare cases issue a refund.
      </p>

      <h2>Didn’t get your files, or charged twice?</h2>
      <p>
        Email jeffrey@jeffsebiz.com with the email you used to buy and your
        Stripe receipt (or the date and amount).
      </p>
      <ul>
        <li>
          Files never arrived or won’t open: we’ll resend them or send a working
          download link.
        </li>
        <li>
          Charged more than once for the same order: we’ll refund the extra
          charge to your original payment method.
        </li>
      </ul>
      <p>
        These fixes are separate from store credit. They’re not case-by-case.
        We aim to reply within 3 business days (Monday to Friday, US Central
        time, excluding US holidays).
      </p>

      <h2>What this covers</h2>
      <p>
        This policy covers digital products sold by JEFFSEBIZ LLC on
        jeffsebiz.com — handbooks, worksheets, web apps and related tools, and
        other digital downloads we offer from time to time. The checkout page for
        your order controls the exact product and price.
      </p>

      <h2>How to contact us</h2>
      <ol>
        <li>
          Email jeffrey@jeffsebiz.com from the address you used at checkout when
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
          Credit equals what you paid for that purchase (unless we say otherwise
          in writing).
        </li>
        <li>Credit can be used toward any jeffsebiz product.</li>
        <li>
          Credit is good for 12 months from the original purchase date.
        </li>
        <li>Credit cannot be cashed out.</li>
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
